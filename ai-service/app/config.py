from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://documind:documind@localhost:5432/documind"
    internal_api_key: str = "change-me-internal"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-5-5"
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 384
    chunk_size: int = 220  # words
    chunk_overlap: int = 40  # words
    top_k: int = 6
    max_upload_mb: int = 20


settings = Settings()
