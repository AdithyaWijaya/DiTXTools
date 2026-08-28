import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session

from app.config import MANIFEST_PROVIDERS
from app.dependencies import get_db
from app.schemas import ManifestDownloadRequest, TokenValidateRequest
from app.limiter import limiter
from app.services.token_service import validate_token, claim_token, release_token
from app.services.data_service import get_steam_game_data
from app.services.manifest_service import (
    fetch_manifest,
    get_status,
    search_game,
)

router = APIRouter(
    prefix="/api",
    tags=["API"],
)


@router.post("/token/validate")
@limiter.limit("10/minute")
async def validate_hubcap_token(
    request: Request,
    data: TokenValidateRequest,
    db: Session = Depends(get_db),
):
    validate_token(db=db, token=data.token)
    return {"valid": True, "message": "Token is valid."}


@router.post("/manifest")
@limiter.limit("15/minute")
async def download_manifest(
    data: ManifestDownloadRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    token_db = None
    
    provider = MANIFEST_PROVIDERS.get(data.source)
   
    if provider is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid provider."
        )

    required_auth = provider.get("requires")

    if required_auth == "token":

        if not data.token:
            raise HTTPException(
                status_code=400,
                detail="Token is required."
            )

        token_db = validate_token(
            db=db,
            token=data.token,
        )

        claimed = claim_token(
            db=db,
            token=token_db,
            app_id=data.app_id,
            ip=request.client.host if request.client else None,
        )

        if not claimed:
            raise HTTPException(
                400,
                "Token has already been used."
            )
        
    elif required_auth == "api_key":
        if not data.api_key:
            raise HTTPException(
                status_code=400,
                detail="API key is required."
            )

    response = await fetch_manifest(
        app_id=data.app_id,
        source=data.source,
        db=db,
        token=data.token,
        api_key=data.api_key,
    )

    if response.status_code == 404:
        if required_auth == "token":
            release_token(db=db, token=token_db)

        raise HTTPException(
            404,
            "Manifest is not available."
        )

    if response.status_code != 200:
        if required_auth == "token":
            release_token(db=db, token=token_db)

        raise HTTPException(
            response.status_code,
            "Failed to fetch manifest."
        )

    return StreamingResponse(
        iter([response.content]),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{data.app_id}.zip"'
        },
    )

@router.get("/status/{app_id}")
async def manifest_status(
    app_id: int,
    db: Session = Depends(get_db),
):

    response = await get_status(db, app_id)

    if response.status_code == 200:
        return response.json()

    if response.status_code == 404:
        raise HTTPException(
            404,
            "Game not found."
        )

    raise HTTPException(
        response.status_code,
        "Failed to fetch manifest status."
    )

@router.get("/search")
async def search(
    q: str = Query(..., min_length=3),
    limit: int = Query(20, ge=1, le=100),
    appid: bool = False,
    db: Session = Depends(get_db),
):

    response = await search_game(db, q, limit, appid)

    if response.status_code == 200:
        return response.json()

    raise HTTPException(
        response.status_code,
        "Search failed."
    )

@router.get("/steam/{app_id}", summary="Detail game dari Steam")
async def get_steam_details(app_id: str):
    try:
        game_data = await get_steam_game_data(app_id)
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Steam API error: {e.response.text}",
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to reach Steam: {str(e)}",
        )

    if game_data is None:
        raise HTTPException(status_code=404, detail="Game not found on Steam")

    return JSONResponse(content={
        "name":        game_data.get("name"),
        "headerImage": game_data.get("header_image"),
        "releaseDate": game_data.get("release_date", {}).get("date"),
        "genres":      [g["description"] for g in game_data.get("genres", [])],
        "description": game_data.get("short_description"),
        "developers":  game_data.get("developers", []),
        "publishers":  game_data.get("publishers", []),
    })
