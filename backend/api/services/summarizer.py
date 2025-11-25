# backend/api/services/summarizer.py

import os
import textwrap
from typing import Optional, List, Tuple

import requests


POLYGON_API_KEY = os.getenv("POLYGON_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def fetch_basic_context(symbol: str) -> Tuple[str, List[dict]]:
    """
    Fetch a lightweight context for the symbol using Polygon only.
    Returns (context_text, sources).
    Never raises – on any error it falls back to a minimal context.
    """
    symbol = symbol.upper()
    parts: List[str] = [f"Symbol: {symbol}"]
    sources: List[dict] = []

    # Try Polygon ref data (description, sector, etc.)
    try:
        if POLYGON_API_KEY:
            url = f"https://api.polygon.io/v3/reference/tickers/{symbol}"
            resp = requests.get(url, params={"apiKey": POLYGON_API_KEY}, timeout=8)
            if resp.ok:
                data = resp.json().get("results", {}) or {}
                name = data.get("name") or ""
                desc = data.get("description") or ""
                sector = data.get("sic_description") or data.get("sector") or ""

                if name:
                    parts.append(f"Company name: {name}")
                if sector:
                    parts.append(f"Sector / Industry: {sector}")
                if desc:
                    parts.append(f"Description: {desc[:400]}...")
                sources.append({"title": f"Polygon ref data for {symbol}", "url": url})
    except Exception as e:
        # Just log; never crash this function
        print(f"[summarizer] Polygon context fetch failed for {symbol}: {e}")

    context = "\n".join(parts) if parts else symbol
    return context, sources


def llm_summarize(prompt: str) -> Optional[str]:
    """
    Call OpenAI Chat Completions.
    Returns summary string or None on any error.
    """
    if not OPENAI_API_KEY:
        print("[summarizer] OPENAI_API_KEY not set; skipping LLM call")
        return None

    try:
        import httpx
    except ImportError:
        print("[summarizer] httpx not installed; cannot call OpenAI")
        return None

    try:
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        body = {
            "model": "gpt-4o-mini",  # or gpt-4o if you prefer
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a concise financial assistant. "
                        "You summarize company outlooks in neutral, factual language."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 250,
        }

        r = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=body,
            timeout=15,
        )
        r.raise_for_status()
        j = r.json()
        content = j["choices"][0]["message"]["content"]
        return content.strip()
    except Exception as e:
        print(f"[summarizer] OpenAI call failed: {e}")
        return None


def summarize_symbol(symbol: str) -> Tuple[str, List[dict]]:
    """
    Main entry point used by the Django view.
    It **never raises** – always returns (summary_text, sources_list).
    """
    symbol = symbol.upper()

    try:
        context, sources = fetch_basic_context(symbol)

        prompt = textwrap.dedent(
            f"""
            Summarize the current outlook for {symbol} in 5–7 bullet points.
            Use information in the context below plus general market knowledge.
            Be neutral and avoid making investment recommendations.
            Mention:
            - What the company does
            - Recent or typical drivers (earnings, products, macro trends)
            - Any notable risks or uncertainties (at a high level)

            Context:
            {context}
            """
        ).strip()

        summary = llm_summarize(prompt)
        if not summary:
            # Fallback: build a simple summary from the context only
            lines = [
                ln.strip()
                for ln in context.splitlines()
                if ln.strip() and not ln.startswith("Symbol:")
            ]

            if not lines:
                lines = [
                    f"{symbol} – no detailed context available. "
                    "Monitor earnings, revenue growth, margins, and major product or regulatory news.",
                ]

            bullets = lines[:6]
            summary = "\n".join(f"• {line}" for line in bullets)

        return summary, sources

    except Exception as e:
        # Extreme fallback: *still* never crash
        print(f"[summarizer] summarize_symbol crashed for {symbol}: {e}")
        fallback = (
            f"• {symbol} – summary temporarily unavailable due to a backend error. "
            "Core drivers typically include earnings, revenue growth, margins, "
            "product roadmap, and macroeconomic conditions."
        )
        return fallback, []
