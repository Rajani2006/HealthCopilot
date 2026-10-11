"""Optional LLM layer. Only test names/values are sent (no patient identifiers). Returns None on any failure."""
import logging
import os
import re
import httpx

logger = logging.getLogger("uvicorn.error")

LANGS = {"en": "English", "te": "Telugu", "hi": "Hindi", "ta": "Tamil"}
SYSTEM = (
    "You are a careful health-literacy assistant. Explain medical report information in plain language. "
    "Never diagnose. Never recommend starting, stopping or changing any medicine. Separate facts stated in the report "
    "from possibilities, and say values are compared with the supplied reference range. Suggest questions for a qualified "
    "healthcare professional. If a value looks critical, advise contacting a doctor or emergency services promptly. Be concise."
)

_LAST_DIAGNOSTIC = None


def get_diagnostic():
    return _LAST_DIAGNOSTIC


def enabled():
    return bool((os.getenv("ANTHROPIC_API_KEY") or "").strip())


async def complete(user, language="en", max_tokens=700):
    global _LAST_DIAGNOSTIC
    if not enabled():
        _LAST_DIAGNOSTIC = "Key missing: ANTHROPIC_API_KEY is not set or empty in backend .env"
        return None

    try:
        api_key = os.environ["ANTHROPIC_API_KEY"].strip()
    except KeyError:
        _LAST_DIAGNOSTIC = "Key missing: ANTHROPIC_API_KEY not found in environment"
        return None

    if not api_key:
        _LAST_DIAGNOSTIC = "Key missing: ANTHROPIC_API_KEY is empty in backend .env"
        return None

    raw_model = (os.getenv("ANTHROPIC_MODEL") or "claude-3-5-sonnet-latest").strip()
    model = "claude-3-5-sonnet-latest" if raw_model in ("claude-sonnet-5-5", "claude-sonnet-3-5", "") else raw_model

    try:
        # Note: headers and request bodies are NEVER logged to protect API keys and sensitive health data.
        async with httpx.AsyncClient(timeout=40) as c:
            r = await c.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": max_tokens,
                    "system": f"{SYSTEM} Respond in {LANGS.get(language, 'English')}.",
                    "messages": [{"role": "user", "content": user}],
                },
            )
            r.raise_for_status()
            data = r.json()
            text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()
            _LAST_DIAGNOSTIC = "OK"
            return text or None
    except httpx.HTTPStatusError as e:
        status_code = e.response.status_code
        err_msg = ""
        try:
            err_data = e.response.json()
            err_msg = err_data.get("error", {}).get("message", "")
        except Exception:
            err_msg = ""
        # Redact any accidental key appearance in error message
        err_msg = re.sub(r"sk-ant-[a-zA-Z0-9_\-]+", "[REDACTED]", err_msg)

        if status_code == 401:
            diag = "Authentication error (HTTP 401): invalid Anthropic API key"
        elif status_code == 400:
            diag = f"Bad request (HTTP 400): check model name ('{model}') - {err_msg}".strip()
        elif status_code in (402, 429):
            diag = f"Rate limit or credits exhausted (HTTP {status_code}): {err_msg}".strip()
        else:
            diag = f"Anthropic API error (HTTP {status_code}): {err_msg}".strip()

        _LAST_DIAGNOSTIC = diag
        logger.warning("LLM call failed: %s", diag)
        return None
    except httpx.RequestError as e:
        diag = f"Network connection error to api.anthropic.com: {type(e).__name__}"
        _LAST_DIAGNOSTIC = diag
        logger.warning("LLM call failed: %s", diag)
        return None
    except Exception as e:
        diag = f"Unexpected error: {type(e).__name__}"
        _LAST_DIAGNOSTIC = diag
        logger.warning("LLM call failed: %s", diag)
        return None
