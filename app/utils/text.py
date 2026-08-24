"""Text processing, word counting, and email extraction utilities."""

import re
from typing import List, Tuple

# Regex to match standard and de-obfuscated email addresses
EMAIL_REGEX = re.compile(
    r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+",
    re.IGNORECASE,
)

# Common invalid file extensions mistakenly captured as TLDs
IGNORED_EXTENSIONS = {
    "png", "jpg", "jpeg", "gif", "webp", "svg", "mp4", "mp3",
    "pdf", "zip", "tar", "gz", "exe", "js", "css", "html"
}

# Generic/placeholder domains that should not be considered valid creator emails
IGNORED_DOMAINS = {
    "example.com", "sample.com", "domain.com", "email.com", "test.com", "yourdomain.com"
}

# Placeholder tokens that signify incomplete template generation
PLACEHOLDER_PATTERNS = [
    re.compile(r"\[[\w\s_-]+\]"),          # e.g., [Your Name], [Company]
    re.compile(r"\{[\w\s_-]+\}"),          # e.g., {creator_name}, {brand}
    re.compile(r"<\s*insert[\w\s_-]*>", re.IGNORECASE), # e.g., <Insert Link>
    re.compile(r"your name|your brand|company name", re.IGNORECASE),
]


def count_words(text: str) -> int:
    """Accurately count words in a string, stripping markup and punctuation tokens."""
    if not text:
        return 0
    # Clean out markdown/HTML tags and excessive symbols
    cleaned = re.sub(r"<[^>]+>", " ", text)
    cleaned = re.sub(r"[#*_~`]", " ", cleaned)
    words = cleaned.strip().split()
    return len(words)


def clean_text(text: str) -> str:
    """Normalize whitespace and remove non-printable characters."""
    if not text:
        return ""
    text = re.sub(r"\r\n|\r", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def deobfuscate_text(text: str) -> str:
    """Convert common email obfuscation patterns into standard syntax."""
    if not text:
        return ""
    t = text
    # Replace (at), [at], {at}, AT with @
    t = re.sub(r"\s*\[\s*at\s*\]\s*", "@", t, flags=re.IGNORECASE)
    t = re.sub(r"\s*\(\s*at\s*\)\s*", "@", t, flags=re.IGNORECASE)
    t = re.sub(r"\s*\{\s*at\s*\}\s*", "@", t, flags=re.IGNORECASE)
    t = re.sub(r"\s+at\s+([a-zA-Z0-9-]+\.[a-zA-Z]{2,})", r"@\1", t, flags=re.IGNORECASE)
    
    # Replace (dot), [dot], {dot}, DOT with .
    t = re.sub(r"\s*\[\s*dot\s*\]\s*", ".", t, flags=re.IGNORECASE)
    t = re.sub(r"\s*\(\s*dot\s*\)\s*", ".", t, flags=re.IGNORECASE)
    t = re.sub(r"\s*\{\s*dot\s*\}\s*", ".", t, flags=re.IGNORECASE)
    return t


def extract_public_emails(text: str) -> List[str]:
    """Extract and validate public email addresses from raw text (e.g., YouTube descriptions).
    
    CRITICAL RULE:
    Only extracts real emails present in the text. Returns an empty list if none found.
    Never invents or guesses email addresses.
    """
    if not text:
        return []

    normalized_text = deobfuscate_text(text)
    matches = EMAIL_REGEX.findall(normalized_text)
    valid_emails: List[str] = []

    for match in matches:
        email = match.strip().lower().rstrip(".,;!?:")
        if "@" not in email:
            continue
            
        local_part, domain = email.rsplit("@", 1)
        if not local_part or not domain:
            continue

        # Check domain suffix
        parts = domain.split(".")
        tld = parts[-1].lower()
        if tld in IGNORED_EXTENSIONS or len(tld) < 2:
            continue
            
        if domain in IGNORED_DOMAINS:
            continue

        # Avoid duplicates while preserving order
        if email not in valid_emails:
            valid_emails.append(email)

    return valid_emails


def has_placeholders(text: str) -> Tuple[bool, List[str]]:
    """Detect if generated text contains unfilled placeholders."""
    if not text:
        return False, []
    
    found_placeholders: List[str] = []
    for pattern in PLACEHOLDER_PATTERNS:
        matches = pattern.findall(text)
        if matches:
            found_placeholders.extend(matches)

    return len(found_placeholders) > 0, found_placeholders
