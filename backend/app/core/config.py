from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGO_URI: str = "mongodb://localhost:27017"
    REDIS_URL: str = "redis://localhost:6379"
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # Security
    SECRET_KEY: str = (
        "branchiq-super-secret-jwt-key-production-2024"  # Override in .env
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # Admin settings
    ADMIN_EMAILS: str = "nikhilshukla5686@gmail.com"
    ADMIN_INVITE_TOKEN: str = "BRANCHIQ-ADMIN-2024"  # Override in .env

    @property
    def admin_email_list(self) -> List[str]:
        return [e.strip() for e in self.ADMIN_EMAILS.split(",")]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
