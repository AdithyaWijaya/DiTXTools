import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.services.settings_service import get_discord_config

DISCORD_API = "https://discord.com/api/v10"

async def get_member(db: Session, discord_id: str) -> dict:
    config = get_discord_config(db)
    guild_id = config["guild_id"]
    bot_token = config["bot_token"]

    if not guild_id or not bot_token:
        raise HTTPException(
            status_code=500,
            detail="Discord bot is not configured. Set the guild ID and bot token in the admin Bot page.",
        )

    headers = {
        "Authorization": f"Bot {bot_token}"
    }

    url = (
        f"{DISCORD_API}/guilds/"
        f"{guild_id}/members/"
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

async def get_roles(db: Session, discord_id: str) -> list[str]:
    member = await get_member(db, discord_id)
    return member["roles"]


async def verify_discord_connection(guild_id: str, bot_token: str) -> tuple[bool, str]:
    headers = {
        "Authorization": f"Bot {bot_token}"
    }

    url = f"{DISCORD_API}/guilds/{guild_id}"

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url, headers=headers)

    if response.status_code == 200:
        return True, "Connected. Bot has access to the guild."
    if response.status_code == 401:
        return False, "Invalid bot token."
    if response.status_code == 403:
        return False, "Bot does not have permission to access this guild."
    if response.status_code == 404:
        return False, "Guild not found or the bot is not in the guild."

    return False, f"Discord API error ({response.status_code})."
