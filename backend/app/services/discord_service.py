import httpx
from fastapi import HTTPException
from app.config import (
    DISCORD_BOT_TOKEN,
    DISCORD_GUILD_ID,
)

DISCORD_API = "https://discord.com/api/v10"


async def get_member(discord_id: str) -> dict:
    headers = {
        "Authorization": f"Bot {DISCORD_BOT_TOKEN}"
    }

    url = (
        f"{DISCORD_API}/guilds/"
        f"{DISCORD_GUILD_ID}/members/"
        f"{discord_id}"
    )

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            url,
            headers=headers,
        )

    if response.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail="User is not on the DiTXTools server."
        )

    if response.status_code == 403:
        raise HTTPException(
            status_code=500,
            detail="Bot does not have permission to read members."
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch Discord data."
        )

    return response.json()


async def get_roles(discord_id: str) -> list[str]:
    member = await get_member(discord_id)
    return member["roles"]
