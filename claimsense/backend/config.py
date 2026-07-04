# Loads environment variables and exposes them as a typed config object.
# Import `config` from this module everywhere instead of calling os.getenv directly.

import os
from dotenv import load_dotenv

# Load .env from the project root (one level up from backend/)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))


class _Config:
    OPENIMIS_URL: str = os.getenv("OPENIMIS_URL", "https://localhost")
    OPENIMIS_TOKEN: str = os.getenv("OPENIMIS_TOKEN", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

    # Derived: if no token is set we run in mock mode
    @property
    def use_mock(self) -> bool:
        return not bool(self.OPENIMIS_TOKEN)

    @property
    def llm_enabled(self) -> bool:
        return bool(self.ANTHROPIC_API_KEY)


config = _Config()
