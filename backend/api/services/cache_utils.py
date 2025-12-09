from typing import Optional, Dict, Any
from django.core.cache import cache

_DEFAULT_TTL = 60 * 30  # 30 minutes

def _key(symbol: str) -> str:
    return f"summary:{symbol.upper()}"

def get_cached_summary(symbol: str) -> Optional[Dict[str, Any]]:
    return cache.get(_key(symbol))

def save_summary(symbol: str, data: Dict[str, Any], ttl: int = _DEFAULT_TTL) -> None:
    cache.set(_key(symbol), data, ttl)
