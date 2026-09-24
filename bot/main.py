import asyncio
import aiohttp
import discord
from discord import app_commands
from config import BOT_API_KEY, API_URL, RYUU_URL

_cached_token: str | None = None

async def fetch_token(session: aiohttp.ClientSession) -> str | None:
    global _cached_token
    if _cached_token:
        return _cached_token

    headers = {"X-API-Key": BOT_API_KEY}
    async with session.get(f"{API_URL}/bot/config", headers=headers) as resp:
        if resp.status == 200:
            data = await resp.json()
            _cached_token = data.get("discord_token")
            return _cached_token

        print(f"Failed to fetch bot token from backend: {resp.status}")
        return None


class Client(discord.Client):
    def __init__(self):
        super().__init__(intents=discord.Intents.default())
        self.tree = app_commands.CommandTree(self)

    async def setup_hook(self):
        synced = await self.tree.sync()
        print(f"Synced {len(synced)} commands")

    async def on_ready(self):
        print(f"Login as {self.user}")

    async def generate_token(self, interaction: discord.Interaction, session: aiohttp.ClientSession):
        await interaction.response.defer(ephemeral=True)

        headers = {"X-API-Key": BOT_API_KEY}

        payload = {
            "discord_id": str(interaction.user.id),
            "guild_id": str(interaction.guild_id) if interaction.guild_id else None,
            "channel_id": str(interaction.channel_id) if interaction.channel_id else None,
        }

        async with session.post(
            f"{API_URL}/bot/token",
            json=payload,
            headers=headers
        ) as resp:
            data = await resp.json()

        if resp.status == 200:
            await interaction.followup.send(
                f"Token successfully generated.\n```{data['token']}```",
                ephemeral=True
            )

        elif resp.status == 403:
            await interaction.followup.send(
                data.get("detail") or "Your role does not have access.",
                ephemeral=True
            )

        elif resp.status == 429:
            await interaction.followup.send(
                f"{data['detail']}",
                ephemeral=True
            )

        else:
            await interaction.followup.send(
                f"Error: {data.get('detail', 'Unknown error')}",
                ephemeral=True
            )

    async def download_manifest(self, interaction: discord.Interaction, session: aiohttp.ClientSession, app_id: int):
        await interaction.response.defer(ephemeral=True)

        headers = {"X-API-Key": BOT_API_KEY}

        payload = {
            "discord_id": str(interaction.user.id),
            "guild_id": str(interaction.guild_id) if interaction.guild_id else None,
            "channel_id": str(interaction.channel_id) if interaction.channel_id else None,
        }

        async with session.post(
            f"{API_URL}/bot/manifest/verify",
            json=payload,
            headers=headers
        ) as resp:
            data = await resp.json()

        if resp.status == 403:
            await interaction.followup.send(
                data.get("detail") or "You don't have permission to use this command in this channel.",
                ephemeral=True
            )
            return

        elif resp.status != 200:
            await interaction.followup.send(
                f"Error: {data.get('detail', 'Unknown error')}",
                ephemeral=True
            )
            return

        manifest_url = f"{RYUU_URL}/{app_id}"
        async with session.get(manifest_url) as resp:
            if resp.status == 404:
                await interaction.followup.send(
                    f"Manifest not found for AppID {app_id}.",
                    ephemeral=True
                )
                return

            if resp.status != 200:
                await interaction.followup.send(
                    f"Failed to fetch manifest (status: {resp.status}).",
                    ephemeral=True
                )
                return

            content = await resp.read()
            filename = f"{app_id}.zip"

            import io
            file = discord.File(io.BytesIO(content), filename=filename)
            await interaction.followup.send(
                f"Manifest for AppID {app_id} ready.",
                file=file,
                ephemeral=True
            )

    def register_commands(self, session: aiohttp.ClientSession):
        @self.tree.command(
            name="token",
            description="Generate token"
        )
        async def token(interaction: discord.Interaction):
            await self.generate_token(interaction, session)

        @self.tree.command(
            name="manifest",
            description="Download manifest by AppID"
        )
        @app_commands.describe(app_id="Steam AppID")
        async def manifest(interaction: discord.Interaction, app_id: int):
            await self.download_manifest(interaction, session, app_id)


async def main():
    async with aiohttp.ClientSession() as session:
        token = None

        for attempt in range(1, 6):
            token = await fetch_token(session)
            if token:
                break
            wait_time = 5 * attempt
            print(f"Retrying in {wait_time}s... ({attempt}/5)")
            await asyncio.sleep(wait_time)

        if not token:
            print(
                "Failed to get Discord bot token from the backend. "
                "Make sure the backend is reachable and the token is set "
                "in the web admin (Bot page)."
            )
            return

        client = Client()
        client.register_commands(session)

        try:
            await client.start(token)
        except KeyboardInterrupt:
            pass
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Bot stopped with error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
