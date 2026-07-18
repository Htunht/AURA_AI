from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AURA AI API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"

    database_url: str
    frontend_origins: str = "http://localhost:5173"

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    ai_screening_enabled: bool = True
    ai_screening_prompt_version: str = "v1"
    ai_screening_client_mode: str = "REAL"
    openai_request_timeout_seconds: int = 90

    github_token: str = ""
    github_api_base_url: str = "https://api.github.com"
    github_max_files: int = 30
    github_max_file_size_bytes: int = 100000
    github_max_total_characters: int = 120000
    github_request_timeout_seconds: int = 20

    cv_upload_directory: str = "storage/cv"
    cv_max_file_size_mb: int = 10
    cv_max_extracted_characters: int = 50000

    screening_status_poll_interval_ms: int = 3000
    recruiter_timezone: str = "Asia/Yangon"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
