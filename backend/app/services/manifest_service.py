import asyncio
import io
import json
import re
from urllib.parse import unquote, urlparse
import zipfile

import httpx
from sqlalchemy.orm import Session

from app.config import MANIFEST_PROVIDERS
from app.services.settings_service import get_hubcap_api_key


FIND_MANIFEST_URL = "https://fares.top/api/manifest"
MANIFESTHUB1_URL = "https://api.manifesthub1.filegear-sg.me/manifest"


def _extract_manifest_targets(payload: dict, app_id: int) -> list[tuple[str, str]]:
    data = payload.get("data")
    app_bucket = None

    if isinstance(data, dict):
        app_bucket = data.get(str(app_id)) or data.get(app_id)

        if app_bucket is None and "depots" in data:
            app_bucket = data

    if not isinstance(app_bucket, dict):
        return []

    depots = app_bucket.get("depots", {})
    if not isinstance(depots, dict):
        return []

    targets: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()

    for depot in depots.values():
        if not isinstance(depot, dict):
            continue

        depot_id = depot.get("depotid") or depot.get("depotId") or depot.get("depot_id")
        manifests = depot.get("manifests", {})
        public_manifest = manifests.get("public", {}) if isinstance(manifests, dict) else {}
        manifest_id = (
            public_manifest.get("gid")
            or public_manifest.get("manifestid")
            or public_manifest.get("manifest_id")
        )

        if not depot_id or not manifest_id:
            continue

        pair = (str(depot_id), str(manifest_id))
        if pair in seen:
            continue

        seen.add(pair)
        targets.append(pair)

    return targets


def _extract_filename_from_content_disposition(content_disposition: str | None) -> str | None:
    if not content_disposition:
        return None

    match = re.search(r"filename\*=UTF-8''([^;]+)", content_disposition, re.IGNORECASE)
    if match:
        return unquote(match.group(1)).strip('"')

    match = re.search(r'filename="([^"]+)"', content_disposition, re.IGNORECASE)
    if match:
        return match.group(1).strip()

    match = re.search(r"filename=([^;]+)", content_disposition, re.IGNORECASE)
    if match:
        return match.group(1).strip().strip('"')

    return None


def _make_manifest_filename(
    response: httpx.Response,
    depot_id: str,
    manifest_id: str,
) -> str:
    filename = _extract_filename_from_content_disposition(
        response.headers.get("content-disposition"),
    )

    if not filename:
        path_name = urlparse(str(response.url)).path.rsplit("/", 1)[-1]
        filename = path_name or None

    if not filename:
        filename = f"depot_{depot_id}_manifest_{manifest_id}.manifest"

    if not filename.lower().endswith(".manifest"):
        filename = f"{filename}.manifest"

    return filename


def _merge_manifest_files(archives: list[tuple[str, str, httpx.Response]]) -> bytes:
    output = io.BytesIO()

    with zipfile.ZipFile(output, "w") as merged_zip:
        for depot_id, manifest_id, response in archives:
            merged_zip.writestr(
                _make_manifest_filename(response, depot_id, manifest_id),
                response.content,
            )

    return output.getvalue()


def _upstream_error_response(status_code: int, message: str, detail: str | None = None) -> httpx.Response:
    payload = {"detail": message}
    if detail:
        payload["upstream_detail"] = detail[:500]

    return httpx.Response(
        status_code,
        content=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )


async def _fetch_manifesthub1_bundle(app_id: int, api_key: str) -> httpx.Response:
    headers = {"x-api-key": api_key}

    async with httpx.AsyncClient(
        timeout=300,
        follow_redirects=True,
    ) as client:
        finder_response = await client.get(
            FIND_MANIFEST_URL,
            headers=headers,
            params={
                "appId": app_id,
                "server": 2,
            },
        )

        if finder_response.status_code != 200:
            return finder_response

        try:
            payload = finder_response.json()
        except ValueError:
            return httpx.Response(
                502,
                content=b'{"detail":"Invalid response from manifest finder."}',
                headers={"Content-Type": "application/json"},
            )

        targets = _extract_manifest_targets(payload, app_id)
        if not targets:
            return httpx.Response(
                404,
                content=b'{"detail":"Manifest is not available."}',
                headers={"Content-Type": "application/json"},
            )

        async def download_one(depot_id: str, manifest_id: str) -> tuple[str, str, httpx.Response]:
            response = await client.get(
                MANIFESTHUB1_URL,
                params={
                    "apikey": api_key,
                    "depotid": depot_id,
                    "manifestid": manifest_id,
                },
            )
            return depot_id, manifest_id, response

        responses = await asyncio.gather(
            *(download_one(depot_id, manifest_id) for depot_id, manifest_id in targets)
        )

        for depot_id, manifest_id, response in responses:
            if response.status_code != 200:
                return httpx.Response(
                    response.status_code,
                    content=response.content,
                    headers=dict(response.headers),
                )

        merged_zip = _merge_manifest_files(responses)

        return httpx.Response(
            200,
            content=merged_zip,
            headers={"Content-Type": "application/zip"},
        )


async def fetch_manifest(
    app_id: int,
    source: str,
    db: Session,
    token: str | None = None,
    api_key: str | None = None,
):
    provider = MANIFEST_PROVIDERS.get(source)

    if provider is None:
        raise ValueError("Provider not found")

    if provider.get("mode") == "manifesthub1":
        if not api_key:
            return httpx.Response(
                400,
                content=b'{"detail":"API key is required."}',
                headers={"Content-Type": "application/json"},
            )

        return await _fetch_manifesthub1_bundle(app_id=app_id, api_key=api_key)

    auth = {
        "token": token,
        "api_key": api_key,
    }

    url = provider["url"].format(
        app_id=app_id,
        api_key=api_key or "",
    )

    if source == "hubcap":
        hubcap_api_key = get_hubcap_api_key(db)
        headers = {"Authorization": f"Bearer {hubcap_api_key}"}
    else:
        headers = provider["headers"](auth)

    async with httpx.AsyncClient(
        timeout=300,
        follow_redirects=True,
    ) as client:

        return await client.get(
            url,
            headers=headers,
        )

HUBCAP_API = "https://hubcapmanifest.com/api/v1"


async def get_status(db: Session, app_id: int):
    hubcap_api_key = get_hubcap_api_key(db)

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            f"{HUBCAP_API}/status/{app_id}",
            headers={
                "Authorization": f"Bearer {hubcap_api_key}"
            }
        )

        return response


async def search_game(
    db: Session,
    query: str,
    limit: int = 20,
    appid: bool = False,
):
    hubcap_api_key = get_hubcap_api_key(db)

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            f"{HUBCAP_API}/search",
            headers={
                "Authorization": f"Bearer {hubcap_api_key}"
            },
            params={
                "q": query,
                "limit": limit,
                "appid": appid,
            },
        )

        return response
