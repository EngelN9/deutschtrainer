from __future__ import annotations

import re
from typing import Any

from .serialization import canonical_json_bytes

MAX_PROVIDER_OUTPUT_BYTES = 64 * 1024

SECRET_PATTERNS = (
    re.compile(r"\bsk-[A-Za-z0-9_-]{16,}\b"),
    re.compile(r"\bhf_[A-Za-z0-9]{20,}\b"),
    re.compile(r"\bgh[opsu]_[A-Za-z0-9]{20,}\b"),
    re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
)
PII_PATTERNS = (
    re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE),
    re.compile(r"(?<!\d)(?:\+?886[- ]?)?0?9\d{2}[- ]?\d{3}[- ]?\d{3}(?!\d)"),
    re.compile(
        r"\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b",
        re.IGNORECASE,
    ),
)
RAW_HTML_PATTERN = re.compile(r"<\s*/?\s*[A-Za-z][^>]*>")
CSV_FORMULA_PREFIXES = ("=", "+", "-", "@")


class SecurityRejection(ValueError):
    pass


def validate_untrusted_payload(payload: Any) -> None:
    raw = canonical_json_bytes(payload)
    if len(raw) > MAX_PROVIDER_OUTPUT_BYTES:
        raise SecurityRejection("Provider output exceeded the 64 KiB evaluation limit.")
    text = raw.decode("utf-8")
    if RAW_HTML_PATTERN.search(text):
        raise SecurityRejection("Provider output contains raw HTML.")
    if any(pattern.search(text) for pattern in SECRET_PATTERNS):
        raise SecurityRejection("Provider output resembles a secret or token.")
    if any(pattern.search(text) for pattern in PII_PATTERNS):
        raise SecurityRejection("Provider output contains disallowed direct-contact PII.")


def validate_synthetic_catalog(payload: Any) -> None:
    raw = canonical_json_bytes(payload).decode("utf-8")
    if any(pattern.search(raw) for pattern in SECRET_PATTERNS):
        raise SecurityRejection("Synthetic catalog resembles a secret or token.")
    if any(pattern.search(raw) for pattern in PII_PATTERNS):
        raise SecurityRejection("Synthetic catalog contains disallowed direct-contact PII.")
    forbidden_markers = (
        "supabase_user_id",
        "auth_user_id",
        "production_submission_id",
        "origin_persona_id",
        "matraix-persona-1m",
    )
    lowered = raw.casefold()
    for marker in forbidden_markers:
        if marker in lowered:
            raise SecurityRejection(f"Synthetic catalog contains forbidden marker: {marker}")


def escape_markdown(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("`", "\\`")
        .replace("|", "\\|")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def reject_csv_formula(value: str) -> None:
    if value.lstrip().startswith(CSV_FORMULA_PREFIXES):
        raise SecurityRejection("CSV-like formula content is not accepted by this harness.")
