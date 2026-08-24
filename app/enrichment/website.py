"""Public creator website crawler and email discovery service."""

import re
import html
from typing import List, Tuple, Optional, Set
from urllib.parse import urlparse, urljoin
import requests

from app.utils.email_validator import validate_email
from app.utils.logging import get_logger

logger = get_logger("enrichment.website")

# URL pattern to find links in channel descriptions
URL_REGEX = re.compile(
    r"https?://[a-zA-Z0-9.-]+(?:\.[a-zA-Z]{2,})+(?:/[^\s,;\"'<>()\[\]{}]*)?",
    re.IGNORECASE,
)

# Domains to ignore (social platforms, media hosts, marketplaces, affiliate shorteners)
IGNORED_DOMAINS = {
    "youtube.com", "youtu.be",
    "instagram.com", "instagr.am",
    "twitter.com", "x.com",
    "facebook.com", "fb.com", "fb.me",
    "tiktok.com",
    "linkedin.com",
    "github.com",
    "twitch.tv",
    "reddit.com",
    "pinterest.com",
    "spotify.com",
    "discord.gg", "discord.com",
    "patreon.com",
    "buymeacoffee.com", "ko-fi.com",
    "amazon.com", "amzn.to", "amazon.in", "amazon.co.uk",
    "bit.ly", "tinyurl.com", "linktr.ee", "campsite.bio", "beacons.ai",
    "t.me", "telegram.org",
    "whatsapp.com",
    "google.com", "apple.com",
}

# Subpaths commonly used for contact, business, collaboration, and about pages
CONTACT_PATHS = [
    ("/contact", "contact_page"),
    ("/contact-us", "contact_page"),
    ("/about", "about_page"),
    ("/about-us", "about_page"),
    ("/business", "business_page"),
    ("/collaborate", "business_page"),
    ("/work-with-me", "business_page"),
    ("/partnerships", "business_page"),
]

# Regex for email extraction from HTML
HTML_EMAIL_REGEX = re.compile(
    r"(?:mailto:\s*)?([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)",
    re.IGNORECASE,
)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (EDXSO-Influencer-Discovery/1.0)"
)


class WebsiteEmailExtractor:
    """Safely extracts public website links from creator descriptions and crawls public contact pages for emails."""

    def __init__(self, timeout: float = 4.0, max_pages_per_domain: int = 4):
        self.timeout = timeout
        self.max_pages_per_domain = max_pages_per_domain
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        })

    def extract_website_urls(self, text: str) -> List[str]:
        """Extract valid, non-social public website URLs from text."""
        if not text:
            return []

        raw_urls = URL_REGEX.findall(text)
        valid_urls: List[str] = []
        seen_domains: Set[str] = set()

        for raw_url in raw_urls:
            url = raw_url.rstrip(".,;!?:/\\\"'")
            try:
                parsed = urlparse(url)
                if not parsed.scheme or not parsed.netloc:
                    continue

                domain = parsed.netloc.lower()
                # Strip www.
                if domain.startswith("www."):
                    domain = domain[4:]

                # Check if domain or suffix is ignored
                is_ignored = False
                for ignored in IGNORED_DOMAINS:
                    if domain == ignored or domain.endswith("." + ignored):
                        is_ignored = True
                        break

                if is_ignored or domain in seen_domains:
                    continue

                seen_domains.add(domain)
                # Normalize to base URL
                base_url = f"{parsed.scheme}://{parsed.netloc}"
                valid_urls.append(base_url)
            except Exception as e:
                logger.debug(f"Error parsing URL {raw_url}: {e}")

        return valid_urls

    def extract_emails_from_html(self, html_content: str) -> List[str]:
        """Extract and validate public emails from raw HTML text."""
        if not html_content:
            return []

        # Decode HTML entities (e.g. &#64; -> @)
        decoded = html.unescape(html_content)
        matches = HTML_EMAIL_REGEX.findall(decoded)
        valid_emails: List[str] = []

        for match in matches:
            email_candidate = match.strip()
            status, clean_email = validate_email(email_candidate)
            if status == "FOUND" and clean_email and clean_email not in valid_emails:
                valid_emails.append(clean_email)

        return valid_emails

    def _fetch_page(self, url: str) -> Optional[str]:
        """Fetch a single public webpage with safe timeouts and headers."""
        try:
            resp = self.session.get(url, timeout=self.timeout, allow_redirects=True)
            if resp.status_code == 200 and "text/html" in resp.headers.get("Content-Type", ""):
                return resp.text
        except Exception as e:
            logger.debug(f"Could not fetch {url}: {e}")
        return None

    def discover_email_from_website(self, base_url: str) -> Tuple[str, str]:
        """Crawl website homepage and common contact/about paths to discover publicly listed email.
        
        Returns:
            (email, email_source)
            e.g. ("contact@creator.io", "contact_page") or ("Not Found", "not_found")
        """
        if not base_url:
            return "Not Found", "not_found"

        visited_pages = 0

        # 1. Check Homepage
        homepage_html = self._fetch_page(base_url)
        visited_pages += 1
        if homepage_html:
            emails = self.extract_emails_from_html(homepage_html)
            if emails:
                logger.info(f"Discovered email on creator website homepage ({base_url}): {emails[0]}")
                return emails[0], "creator_website"

        # 2. Check Contact / About / Business paths
        for subpath, source_type in CONTACT_PATHS:
            if visited_pages >= self.max_pages_per_domain:
                break

            target_url = urljoin(base_url.rstrip("/") + "/", subpath.lstrip("/"))
            page_html = self._fetch_page(target_url)
            visited_pages += 1

            if page_html:
                emails = self.extract_emails_from_html(page_html)
                if emails:
                    logger.info(f"Discovered email on {source_type} ({target_url}): {emails[0]}")
                    return emails[0], source_type

        return "Not Found", "not_found"
