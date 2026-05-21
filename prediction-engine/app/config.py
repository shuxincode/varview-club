from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Core
    redis_url: str = "redis://localhost:6379/0"
    redis_match_ttl: int = 900
    redis_cache_ttl: int = 3600

    # Scraping
    flashscore_url: str = "https://www.flashscore.com/football/"
    discovery_interval_seconds: int = 600
    fbref_rate_limit_delay: float = 1.5

    # AI / LLM
    openrouter_api_key: str = ""
    openrouter_model: str = "poolside/laguna-xs.2:free"

    # Memory Layer (L1–L3)
    duckdb_db_path: str = "varview_archive.duckdb"
    mem0_enabled: bool = True
    redisvl_enabled: bool = True

    model_config = {"env_prefix": "PREDICTION_", "env_file": ".env"}


settings = Settings()
