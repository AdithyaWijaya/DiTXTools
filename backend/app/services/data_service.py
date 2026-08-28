import httpx

async def get_steam_game_data(app_id: str) -> dict | None:
    url = "https://store.steampowered.com/api/appdetails"

    async with httpx.AsyncClient(
        timeout=15.0,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        },
    ) as client:
        response = await client.get(url, params={"appids": app_id, "cc": "us", "l": "en"})
        response.raise_for_status()

    raw = response.json()
    game_data = raw.get(str(app_id), {})
    if not game_data.get("success"):
        return None

    return game_data.get("data", {})