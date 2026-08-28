import os
import tempfile
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=dotenv_path)
load_dotenv()


HUBCAP_APIKEY: str = os.getenv("HUBCAP_APIKEY")
DATABASE_URL: str = os.getenv("DATABASE_URL")
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

MANIFEST_PROVIDERS = {
    "hubcap": {
        "url": "https://hubcapmanifest.com/api/v1/manifest/{app_id}",
        "requires": "token",
        "headers": lambda _: {
            "Authorization": f"Bearer {HUBCAP_APIKEY}"
        },
    },

    "manifesthub1": {
        "mode": "manifesthub1",
        "requires": "api_key",
        "headers": lambda auth: {
            "x-api-key": auth["api_key"],
        },
    },

    "sushi": {
        "url": "https://raw.githubusercontent.com/sushi-dev55-alt/sushitools-games-repo-alt/refs/heads/main/{app_id}.zip",
        "method": "GET",
        "headers": lambda auth: {},
        "requires": None,
    },
    
    "ryuu": {
        "url": "http://167.235.229.108/{app_id}",
        "method": "GET",
        "headers": lambda auth: {},
        "requires": None,
    },

    "yaszz": {
        "url": "https://codeload.github.com/SSMGAlt/ManifestHub2/zip/refs/heads/{app_id}",
        "method": "GET",
        "requires": None,
        "headers": lambda auth: {},
    },
}

DISCORD_GUILD_ID: str = os.getenv("DISCORD_GUILD_ID")
DISCORD_BOT_TOKEN: str = os.getenv("DISCORD_BOT_TOKEN")
ROLE_ADMIN: str = os.getenv("ROLE_ADMIN")
ROLE_OG: str = os.getenv("ROLE_OG")
BOT_API_KEY: str = os.getenv("BOT_API_KEY")

ROLE_LIMIT = {
    ROLE_ADMIN: None,
    ROLE_OG: 1,
}

DOWNLOAD_EXPIRE_SECONDS = 10 * 60
TEMP_DOWNLOAD_DIR = os.path.join(tempfile.gettempdir(), "ditx_downloads")
os.makedirs(TEMP_DOWNLOAD_DIR, exist_ok=True)