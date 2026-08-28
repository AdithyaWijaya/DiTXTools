import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=dotenv_path)
load_dotenv()

API_URL: str = os.getenv("API_URL")
BOT_API_KEY: str = os.getenv("BOT_API_KEY")
