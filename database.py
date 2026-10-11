
import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URL = os.getenv(
    "MONGO_URL",
    "mongodb://localhost:27017"
)

DATABASE_NAME = os.getenv(
    "DATABASE_NAME",
    "health_copilot"
)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DATABASE_NAME]


async def check_database():
    await client.admin.command("ping")
    return True
