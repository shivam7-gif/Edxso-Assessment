"""YouTube Data API v3 integration for discovering real micro-influencers and extracting content signals."""

import os
import json
import time
from typing import List, Dict, Any, Optional, Tuple
import requests

from app.config.settings import get_settings
from app.schemas.influencer import RawChannelData, VideoMetadata
from app.utils.logging import get_logger
from app.utils.retry import retry_with_backoff

logger = get_logger("discovery.youtube")

# YouTube API Base URL
YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"

# Curated search queries spanning Technology / AI / Programming niches
TECH_SEARCH_QUERIES = [
    "Python programming",
    "Python tutorial",
    "JavaScript tutorial",
    "React tutorial",
    "web development",
    "software engineering",
    "developer tools",
    "AI tools",
    "AI tutorials",
    "artificial intelligence",
    "machine learning",
    "data science",
    "LLM",
    "generative AI",
    "ChatGPT tutorial",
    "Claude AI",
    "cloud computing",
    "AWS tutorial",
    "DevOps",
    "cybersecurity",
    "Linux",
    "programming tips",
    "coding tutorial",
    "technology review",
    "tech gadgets",
]


class YouTubeAPIError(Exception):
    """Base exception for YouTube Data API interactions."""
    pass


class YouTubeQuotaExceededError(YouTubeAPIError):
    """Raised when YouTube API quota is exhausted."""
    pass


class YouTubeDiscoveryService:
    """Discovers real YouTube micro-influencer channels and collects recent video metrics."""

    def __init__(self, api_key: Optional[str] = None):
        settings = get_settings()
        self.api_key = api_key or settings.YOUTUBE_API_KEY
        self.min_subscribers = settings.MIN_SUBSCRIBERS
        self.max_subscribers = settings.MAX_SUBSCRIBERS
        self.raw_dir = settings.DATA_RAW_DIR
        os.makedirs(self.raw_dir, exist_ok=True)

    def _check_api_key(self) -> None:
        """Validate presence of API key."""
        if not self.api_key or self.api_key.strip() == "" or self.api_key.startswith("your_"):
            raise YouTubeAPIError(
                "YOUTUBE_API_KEY is missing or invalid in .env. "
                "Please configure a valid YouTube Data API v3 key."
            )

    @retry_with_backoff(max_retries=3, initial_delay=1.0, exceptions=(requests.RequestException,))
    def _make_request(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an authenticated HTTP GET request to YouTube Data API with backoff."""
        self._check_api_key()
        params["key"] = self.api_key
        url = f"{YOUTUBE_API_BASE}/{endpoint}"

        try:
            response = requests.get(url, params=params, timeout=15)
        except requests.RequestException as e:
            logger.error(f"Network error calling YouTube API {endpoint}: {e}")
            raise

        if response.status_code == 403:
            error_data = response.json().get("error", {})
            reasons = [err.get("reason") for err in error_data.get("errors", [])]
            if "quotaExceeded" in reasons or "dailyLimitExceeded" in reasons:
                logger.error("YouTube API quota exceeded (HTTP 403 quotaExceeded).")
                raise YouTubeQuotaExceededError("YouTube API quota exceeded.")
            raise YouTubeAPIError(f"YouTube API forbidden error (403): {error_data.get('message', 'Access denied')}")

        if response.status_code != 200:
            logger.error(f"YouTube API returned status {response.status_code}: {response.text}")
            raise YouTubeAPIError(f"YouTube API HTTP {response.status_code}: {response.text}")

        return response.json()

    def search_channels(self, query: str, max_results: int = 50, page_token: Optional[str] = None) -> Tuple[List[str], Optional[str]]:
        """Search for channel IDs matching a tech keyword."""
        params = {
            "part": "snippet",
            "type": "channel",
            "q": query,
            "maxResults": min(max_results, 50),
            "relevanceLanguage": "en",
        }
        if page_token:
            params["pageToken"] = page_token

        data = self._make_request("search", params)
        items = data.get("items", [])
        channel_ids = []
        for item in items:
            cid = item.get("id", {}).get("channelId") or item.get("snippet", {}).get("channelId")
            if cid:
                channel_ids.append(cid)

        next_page_token = data.get("nextPageToken")
        return channel_ids, next_page_token

    def fetch_channel_details_batch(self, channel_ids: List[str]) -> List[RawChannelData]:
        """Batch fetch channel statistics and snippet data (up to 50 channels per call)."""
        if not channel_ids:
            return []

        channels: List[RawChannelData] = []
        # Chunk channel_ids into slices of 50
        for i in range(0, len(channel_ids), 50):
            chunk = channel_ids[i:i + 50]
            params = {
                "part": "snippet,statistics,contentDetails,brandingSettings",
                "id": ",".join(chunk),
                "maxResults": 50,
            }
            try:
                data = self._make_request("channels", params)
                for item in data.get("items", []):
                    cid = item.get("id")
                    snippet = item.get("snippet", {})
                    stats = item.get("statistics", {})
                    content_details = item.get("contentDetails", {})

                    if not cid:
                        continue

                    # Hidden or missing subscriber count check
                    if stats.get("hiddenSubscriberCount", False):
                        continue

                    subs_raw = stats.get("subscriberCount")
                    if subs_raw is None:
                        continue
                    try:
                        subscriber_count = int(subs_raw)
                    except ValueError:
                        continue

                    title = snippet.get("title", "").strip()
                    description = snippet.get("description", "").strip()
                    custom_url = snippet.get("customUrl")
                    country = snippet.get("country")
                    published_at = snippet.get("publishedAt")
                    video_count = int(stats.get("videoCount", 0))
                    view_count = int(stats.get("viewCount", 0))
                    uploads_playlist_id = content_details.get("relatedPlaylists", {}).get("uploads")

                    profile_url = f"https://www.youtube.com/{custom_url}" if custom_url else f"https://www.youtube.com/channel/{cid}"

                    channels.append(
                        RawChannelData(
                            channel_id=cid,
                            name=title,
                            description=description,
                            custom_url=custom_url,
                            profile_url=profile_url,
                            subscriber_count=subscriber_count,
                            video_count=video_count,
                            view_count=view_count,
                            country=country,
                            published_at=published_at,
                            uploads_playlist_id=uploads_playlist_id,
                            platform="YouTube",
                        )
                    )
            except Exception as e:
                logger.error(f"Error fetching channel details batch: {e}")

        return channels

    def fetch_recent_videos(self, channel: RawChannelData, max_videos: int = 5) -> List[VideoMetadata]:
        """Retrieve recent videos and their public metrics for a channel."""
        # 1. Check if live API key is present
        if not self.api_key or self.api_key.startswith("your_"):
            # Check if channel was loaded with cached sample_videos from raw fixture
            cache_path = os.path.join(self.raw_dir, "discovered_channels_raw.json")
            if os.path.exists(cache_path):
                try:
                    with open(cache_path, "r", encoding="utf-8") as f:
                        cached_list = json.load(f)
                    for item in cached_list:
                        if item.get("channel_id") == channel.channel_id and "sample_videos" in item:
                            return [VideoMetadata.model_validate(v) for v in item["sample_videos"][:max_videos]]
                except Exception as e:
                    logger.debug(f"Could not load cached sample videos for {channel.name}: {e}")
            return []

        if not channel.uploads_playlist_id:
            return []

        # 1. Get recent video IDs from uploads playlist (costs only 1 quota point)
        playlist_params = {
            "part": "snippet,contentDetails",
            "playlistId": channel.uploads_playlist_id,
            "maxResults": max_videos,
        }
        try:
            pl_data = self._make_request("playlistItems", playlist_params)
        except Exception as e:
            logger.warning(f"Could not retrieve playlist for channel {channel.name} ({channel.channel_id}): {e}")
            return []

        video_items = pl_data.get("items", [])
        if not video_items:
            return []

        video_ids = []
        for item in video_items:
            vid = item.get("contentDetails", {}).get("videoId")
            if vid:
                video_ids.append(vid)

        if not video_ids:
            return []

        # 2. Get video snippet & statistics in a single batch call
        video_params = {
            "part": "snippet,statistics",
            "id": ",".join(video_ids),
            "maxResults": len(video_ids),
        }
        try:
            v_data = self._make_request("videos", video_params)
        except Exception as e:
            logger.warning(f"Could not fetch video stats for channel {channel.name}: {e}")
            return []

        videos: List[VideoMetadata] = []
        for v in v_data.get("items", []):
            vid = v.get("id")
            snippet = v.get("snippet", {})
            stats = v.get("statistics", {})

            title = snippet.get("title", "").strip()
            desc = snippet.get("description", "").strip()
            pub_date = snippet.get("publishedAt", "")
            views = int(stats.get("viewCount", 0))
            likes = int(stats.get("likeCount", 0))
            comments = int(stats.get("commentCount", 0))

            videos.append(
                VideoMetadata(
                    video_id=vid,
                    title=title,
                    description=desc,
                    published_at=pub_date,
                    views=views,
                    likes=likes,
                    comments=comments,
                    url=f"https://www.youtube.com/watch?v={vid}",
                )
            )

        return videos

    def discover_creators(self, target_count: int = 120, custom_niche: Optional[str] = None) -> List[RawChannelData]:
        """Execute discovery across multiple technology search queries with pagination until candidate target is reached."""
        queries = TECH_SEARCH_QUERIES
        if custom_niche and custom_niche.strip().lower() != "all":
            niche_clean = custom_niche.strip()
            queries = [
                f"{niche_clean} tutorial",
                f"{niche_clean} developer",
                f"{niche_clean} engineering",
                f"{niche_clean} tools",
                niche_clean,
            ]
            logger.info(f"Custom niche selected: '{niche_clean}'. Targeting queries: {queries}")
        else:
            logger.info(f"Starting YouTube discovery across {len(TECH_SEARCH_QUERIES)} tech niches (Target: {target_count})...")

        discovered_channels_dict: Dict[str, RawChannelData] = {}
        all_candidate_channel_ids: List[str] = []

        for query in queries:
            if len(discovered_channels_dict) >= target_count:
                break
            logger.info(f"Searching YouTube query: '{query}'...")
            
            page_token = None
            pages_fetched = 0
            max_pages_per_query = 2

            while pages_fetched < max_pages_per_query:
                if len(discovered_channels_dict) >= target_count:
                    break

                try:
                    channel_ids, next_token = self.search_channels(query, max_results=50, page_token=page_token)
                    all_candidate_channel_ids.extend(channel_ids)
                    pages_fetched += 1
                    
                    # Fetch details in batch
                    unique_new_ids = [cid for cid in channel_ids if cid not in discovered_channels_dict]
                    if unique_new_ids:
                        details = self.fetch_channel_details_batch(unique_new_ids)
                        for channel in details:
                            # Micro-influencer subscriber bounds check: 5,000 to 100,000
                            if self.min_subscribers <= channel.subscriber_count <= self.max_subscribers:
                                if channel.channel_id not in discovered_channels_dict:
                                    discovered_channels_dict[channel.channel_id] = channel
                                    logger.info(
                                        f"  [+] Discovered: '{channel.name}' | Subs: {channel.subscriber_count:,} | Channel: {channel.profile_url}"
                                    )

                    if not next_token:
                        break
                    page_token = next_token
                    time.sleep(0.2)  # courteous pacing
                except YouTubeQuotaExceededError:
                    logger.error("YouTube quota exhausted during discovery. Stopping search.")
                    break
                except Exception as e:
                    logger.error(f"Error during discovery for query '{query}': {e}")
                    break

        channels_list = list(discovered_channels_dict.values())
        logger.info(f"Discovery complete. Total unique micro-influencers collected: {len(channels_list)}")

        # Cache raw discovery snapshot to data/raw/
        cache_path = os.path.join(self.raw_dir, "discovered_channels_raw.json")
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump([c.model_dump() for c in channels_list], f, indent=2)
            logger.info(f"Saved raw discovery snapshot to {cache_path}")
        except Exception as e:
            logger.warning(f"Could not cache raw discovery data: {e}")

        return channels_list
