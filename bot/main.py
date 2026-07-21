import discord
from discord import app_commands
import aiohttp

from config import (
    TOKEN,
    BOT_API_KEY,
    API_URL,
)


class Client(discord.Client):
    def __init__(self):
        super().__init__(intents=discord.Intents.default())
        self.tree = app_commands.CommandTree(self)

    async def setup_hook(self):
        synced = await self.tree.sync()
        print(f"Synced {len(synced)} commands")

    async def on_ready(self):
        print(f"Login as {self.user}")


client = Client()


@client.tree.command(
    name="token",
    description="Generate token"
)
async def token(interaction: discord.Interaction):

    await interaction.response.defer(ephemeral=True)

    headers = {
        "X-API-Key": BOT_API_KEY
    }

    payload = {
        "discord_id": str(interaction.user.id)
    }

    async with aiohttp.ClientSession() as session:
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
            "Your role does not have access.",
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


client.run(TOKEN)