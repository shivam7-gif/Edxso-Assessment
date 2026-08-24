"""Public email address extraction with multi-source website crawling and strict real-data guarantees."""

from typing import Tuple, Optional
from app.utils.text import extract_public_emails
from app.utils.email_validator import validate_email
from app.enrichment.website import WebsiteEmailExtractor
from app.utils.logging import get_logger

logger = get_logger("enrichment.email")


class EmailExtractor:
    """Extracts verifiable public contact emails from YouTube description and creator website/contact pages.
    
    IMPORTANT DATA INTEGRITY GUARANTEE:
    - Never generates, guesses, or constructs hypothetical email addresses.
    - If no verifiable email is explicitly present in public metadata or public pages, returns 'Not Found'.
    """

    def __init__(self):
        self.website_extractor = WebsiteEmailExtractor()

    def extract_from_description(self, description: str) -> Tuple[str, str]:
        """Search channel description for publicly listed business contact emails."""
        if not description:
            return "Not Found", "not_found"

        emails = extract_public_emails(description)
        for cand in emails:
            status, valid_addr = validate_email(cand)
            if status == "FOUND" and valid_addr:
                logger.debug(f"Discovered public email in description: {valid_addr}")
                return valid_addr, "youtube_description"

        return "Not Found", "not_found"

    def enrich_email_multi_source(self, description: str, custom_url: Optional[str] = None) -> Tuple[str, str, str, Optional[str]]:
        """Multi-source email enrichment flow:
        1. Check YouTube description
        2. If none, extract public website URLs from description
        3. Crawl homepage & contact/about/business pages
        4. Validate syntax and domain format
        
        Returns:
            (email, email_source, email_status, website_url)
        """
        website_url: Optional[str] = None

        # 1. Check YouTube description directly
        email, source = self.extract_from_description(description)
        if email != "Not Found":
            status, clean_email = validate_email(email)
            # Also extract website url if present in description for profile
            urls = self.website_extractor.extract_website_urls(description or "")
            if urls:
                website_url = urls[0]
            return clean_email or email, source, status, website_url

        # 2. Extract public website URLs from description
        urls = self.website_extractor.extract_website_urls(description or "")
        if urls:
            website_url = urls[0]
            # 3. Crawl creator website & contact pages
            email_from_site, site_source = self.website_extractor.discover_email_from_website(website_url)
            if email_from_site != "Not Found":
                status, clean_email = validate_email(email_from_site)
                if status == "FOUND" and clean_email:
                    return clean_email, site_source, "FOUND", website_url

        return "Not Found", "not_found", "NOT_FOUND", website_url
