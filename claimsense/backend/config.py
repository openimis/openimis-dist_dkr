import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))


class _Config:
    OPENIMIS_URL: str = os.getenv("OPENIMIS_URL", "https://localhost")
    OPENIMIS_TOKEN: str = os.getenv("OPENIMIS_TOKEN", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

    @property
    def use_mock(self) -> bool:
        return not bool(self.OPENIMIS_TOKEN)

    @property
    def llm_enabled(self) -> bool:
        return bool(self.GEMINI_API_KEY)


config = _Config()
