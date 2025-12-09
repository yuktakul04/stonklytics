# backend/api/views_summary.py
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .auth_firebase import firebase_protected
from .services.summarizer import summarize_symbol


@require_GET
@firebase_protected
def get_stock_summary(request, symbol: str):
    """
    Return an AI (or fallback) summary for the given stock symbol.
    Never raises; always returns JSON with at least a basic summary.
    """
    # summarize_symbol now returns (summary_text, sources_list)
    summary_text, sources = summarize_symbol(symbol)

    payload = {
        "symbol": symbol.upper(),
        "summary": summary_text,
        "source": "fresh",      # you can set 'llm', 'fallback', etc. if you like
        "references": sources,  # front-end can show these if needed
    }

    return JsonResponse(payload, status=200)
