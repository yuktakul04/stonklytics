# backend/api/services/summarizer.py
import os, textwrap
import json
from typing import Optional, Dict, Any, List, Tuple 
import requests

def fetch_basic_context(symbol: str) -> Tuple[str, List[dict]]:
    """Fetch a lightweight context: a couple of recent headlines (optional) + basic blurb."""
    sources: List[dict] = []
    parts: List[str] = [f"Symbol: {symbol.upper()}"]

    # Optional: try a free-ish news API if provided
    news_key = os.getenv("NEWS_API_KEY")
    try:
        if news_key:
            # Replace with your news provider endpoint if different
            resp = requests.get(
                "https://newsapi.org/v2/everything",
                params={"q": symbol, "pageSize": 3, "sortBy": "publishedAt", "language": "en"},
                headers={"X-Api-Key": news_key},
                timeout=8,
            )
            if resp.ok:
                data = resp.json()
                for art in (data.get("articles") or [])[:3]:
                    title = art.get("title") or ""
                    url = art.get("url") or ""
                    parts.append(f"- {title}")
                    sources.append({"title": title, "url": url})
    except Exception:
        pass

    context = "\n".join(parts) if parts else symbol.upper()
    return context, sources

def llm_summarize(prompt: str) -> Optional[str]:
    """Try OpenAI if key exists; otherwise return None for fallback."""
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        return None

    try:
        # Minimal OpenAI Chat Completions call (no SDK dependency)
        import httpx
        headers = {"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"}
        body = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You are a concise finance assistant."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 250,
        }
        r = httpx.post("https://api.openai.com/v1/chat/completions", headers=headers, json=body, timeout=15)
        r.raise_for_status()
        j = r.json()
        return j["choices"][0]["message"]["content"].strip()
    except Exception:
        return None

def summarize_symbol(symbol: str) -> Tuple[str, List[dict]]:
    """High-level summarization: build prompt, try LLM; if absent, do extractive fallback."""
    context, sources = fetch_basic_context(symbol)
    prompt = textwrap.dedent(f"""
        Summarize the current outlook for {symbol.upper()} in 5-7 bullet points.
        Focus on themes from recent headlines and typical drivers (earnings, guidance, product, macro signals).
        Be neutral, brief, and avoid advice. Use plain English.
        
        Context:
        {context}
    """).strip()

    summary = llm_summarize(prompt)
    if not summary:
        # ✅ Fallback: very simple extractive-ish summary
        lines = [ln.strip("- ").strip() for ln in context.splitlines() if ln.strip() and not ln.startswith("Symbol:")]
        bullets = lines[:5] or [f"{symbol.upper()} – no fresh headlines available. Tracking core metrics and upcoming catalysts."]
        summary = "\n".join(f"• {b}" for b in bullets)

    return summary, sources
