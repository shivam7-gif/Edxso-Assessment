"""Email validation utility for syntax, domain format, and placeholder filtering."""

import re
from typing import Tuple, Optional, Literal

# Strict RFC-compliant email matching pattern
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$",
    re.IGNORECASE,
)

# Common invalid extensions mistakenly captured as domain TLDs
INVALID_TLDS = {
    "png", "jpg", "jpeg", "gif", "webp", "svg", "mp4", "mp3",
    "pdf", "zip", "tar", "gz", "exe", "js", "css", "html", "htm",
    "ico", "woff", "woff2", "ttf", "eot",
}

# Generic / placeholder domains that must never be considered valid creator emails
PLACEHOLDER_DOMAINS = {
    "example.com", "example.org", "example.net",
    "sample.com", "domain.com", "yourdomain.com", "yoursite.com",
    "email.com", "test.com", "mywebsite.com", "company.com",
    "site.com", "website.com", "placeholder.com", "mysite.com",
    "insertdomain.com", "yourbrand.com", "tempmail.com",
}

# Placeholder local-part patterns
PLACEHOLDER_LOCAL_PARTS = {
    "yourname", "your_name", "your.name", "yournamehere",
    "name", "username", "user", "email", "youremail",
    "test", "tester", "sample", "placeholder", "admin_sample",
    "first.last", "firstname.lastname", "someone", "insertname",
}


def validate_email(email: Optional[str]) -> Tuple[Literal["FOUND", "NOT_FOUND", "INVALID"], Optional[str]]:
    """Validate email syntax, domain structure, and reject obvious placeholders.
    
    Returns:
        (email_status, normalized_email_or_none)
        email_status: "FOUND" | "NOT_FOUND" | "INVALID"
    """
    if not email or not email.strip() or email.strip().lower() in ("not found", "none", "n/a", "null", "not available"):
        return "NOT_FOUND", None

    cleaned = email.strip().lower().rstrip(".,;!?:/\\\"'")
    
    # Remove mailto: prefix if present
    if cleaned.startswith("mailto:"):
        cleaned = cleaned[7:].strip()

    if not EMAIL_REGEX.match(cleaned):
        return "INVALID", None

    local_part, domain = cleaned.rsplit("@", 1)

    # Local part checks
    if len(local_part) < 1 or len(local_part) > 64:
        return "INVALID", None

    if local_part in PLACEHOLDER_LOCAL_PARTS:
        return "INVALID", None

    # Domain checks
    if len(domain) < 3 or len(domain) > 255:
        return "INVALID", None

    if domain in PLACEHOLDER_DOMAINS:
        return "INVALID", None

    domain_parts = domain.split(".")
    if len(domain_parts) < 2:
        return "INVALID", None

    tld = domain_parts[-1].lower()
    if len(tld) < 2 or tld in INVALID_TLDS:
        return "INVALID", None

    # Check that domain labels are valid
    for part in domain_parts:
        if not part or len(part) > 63 or part.startswith("-") or part.endswith("-"):
            return "INVALID", None

    return "FOUND", cleaned


def is_valid_email(email: Optional[str]) -> bool:
    """Convenience boolean helper for valid public emails."""
    status, _ = validate_email(email)
    return status == "FOUND"
