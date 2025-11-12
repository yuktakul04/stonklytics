# backend/api/views_summary.py
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .auth_firebase import firebase_protected
from .services.summarizer import summarize_symbol
# NOTE: your file is spelled cache_utlis.py in the tree — import that exact name
from .services.cache_utils import get_cached_summary, save_summary



@require_GET
@firebase_protected
def get_stock_summary(request, symbol: str):
    """
    GET /api/summary/<symbol>?force=1 to bypass cache
    """
    force = request.GET.get("force") in {"1", "true", "True"}
    if not force:
        cached = get_cached_summary(symbol)
        if cached:
            return JsonResponse({"symbol": symbol, "source": "cache", **cached})

    data = summarize_symbol(symbol)  # returns dict like {"summary": "...", "news": [...]} or None
    if not data:
        return JsonResponse({"detail": "Failed to generate summary."}, status=502)

    save_summary(symbol, data)
    return JsonResponse({"symbol": symbol, "source": "fresh", **data})
