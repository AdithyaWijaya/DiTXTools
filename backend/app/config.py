import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=dotenv_path)
load_dotenv()


HUBCAP_APIKEY: str = os.getenv("HUBCAP_APIKEY")
DATABASE_URL: str = os.getenv("DATABASE_URL")
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY")

# Kredensial untuk login web admin (username/password). ADMIN_API_KEY tetap
# dipakai sebagai "session token" setelah login berhasil -- jadi tidak ada
# mekanisme auth baru, hanya gerbang login di depan key yang sudah ada.
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

# Daftar origin frontend yang diizinkan, dipisah koma di .env, contoh:
#   ALLOWED_ORIGINS=https://ditxtools.com,https://www.ditxtools.com
# Kalau kosong, fallback ke wildcard "*" TANPA credentials (lihat main.py)
# supaya tidak memakai kombinasi allow_origins="*" + allow_credentials=True
# yang tidak disarankan (dan ditolak sebagian browser).
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

# Role Discord
DISCORD_GUILD_ID: str = os.getenv("DISCORD_GUILD_ID")
DISCORD_BOT_TOKEN: str = os.getenv("DISCORD_BOT_TOKEN")
ROLE_ADMIN: str = os.getenv("ROLE_ADMIN")
ROLE_OG: str = os.getenv("ROLE_OG")
BOT_API_KEY: str = os.getenv("BOT_API_KEY")

ROLE_LIMIT = {
    ROLE_ADMIN: None,
    ROLE_OG: 1,
}
