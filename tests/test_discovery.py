"""Unit tests for YouTube Discovery and Video Metrics Collection."""

import pytest
from unittest.mock import MagicMock, patch
from app.discovery.youtube import YouTubeDiscoveryService, YouTubeQuotaExceededError
from app.schemas.influencer import RawChannelData, VideoMetadata


@pytest.fixture
def mock_discovery_service():
    """Fixture returning a YouTubeDiscoveryService with test API key."""
    return YouTubeDiscoveryService(api_key="test_api_key_xyz")


def test_micro_influencer_subscriber_bounds(mock_discovery_service):
    """Test that micro-influencer filtering strictly enforces 5,000 to 100,000 bounds."""
    assert mock_discovery_service.min_subscribers == 5_000
    assert mock_discovery_service.max_subscribers == 100_000


@patch("requests.get")
def test_search_channels_pagination(mock_get, mock_discovery_service):
    """Test searching channels extracts IDs and pagination token."""
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {
        "items": [
            {"id": {"channelId": "UC_123"}},
            {"id": {"channelId": "UC_456"}},
        ],
        "nextPageToken": "NEXT_PAGE_TOKEN_ABC",
    }

    channel_ids, next_token = mock_discovery_service.search_channels("python", max_results=2)
    assert channel_ids == ["UC_123", "UC_456"]
    assert next_token == "NEXT_PAGE_TOKEN_ABC"


@patch("requests.get")
def test_fetch_channel_details_batch(mock_get, mock_discovery_service):
    """Test fetching channel details accurately parses statistics and metadata."""
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {
        "items": [
            {
                "id": "UC_VALID",
                "snippet": {
                    "title": "Tech With Tim",
                    "description": "Python coding tutorials and dev tools",
                    "customUrl": "@techwithtim",
                    "country": "US",
                    "publishedAt": "2020-01-01T00:00:00Z",
                },
                "statistics": {
                    "subscriberCount": "45000",
                    "videoCount": "120",
                    "viewCount": "2500000",
                    "hiddenSubscriberCount": False,
                },
                "contentDetails": {
                    "relatedPlaylists": {"uploads": "UU_VALID"}
                }
            },
            {
                "id": "UC_OUT_OF_BOUNDS",
                "snippet": {"title": "Mega Channel", "description": ""},
                "statistics": {"subscriberCount": "2000000", "hiddenSubscriberCount": False},
                "contentDetails": {"relatedPlaylists": {"uploads": "UU_MEGA"}}
            }
        ]
    }

    channels = mock_discovery_service.fetch_channel_details_batch(["UC_VALID", "UC_OUT_OF_BOUNDS"])
    assert len(channels) == 2
    assert channels[0].name == "Tech With Tim"
    assert channels[0].subscriber_count == 45000
    assert channels[0].profile_url == "https://www.youtube.com/@techwithtim"


@patch("requests.get")
def test_fetch_recent_videos(mock_get, mock_discovery_service):
    """Test retrieving and parsing recent video metrics."""
    # Mock playlistItems call followed by videos call
    mock_playlist_resp = MagicMock()
    mock_playlist_resp.status_code = 200
    mock_playlist_resp.json.return_value = {
        "items": [{"contentDetails": {"videoId": "vid_123"}}]
    }

    mock_videos_resp = MagicMock()
    mock_videos_resp.status_code = 200
    mock_videos_resp.json.return_value = {
        "items": [
            {
                "id": "vid_123",
                "snippet": {
                    "title": "Build AI Agents with Python",
                    "description": "In this video we build autonomous AI agents...",
                    "publishedAt": "2026-08-01T12:00:00Z",
                },
                "statistics": {
                    "viewCount": "15000",
                    "likeCount": "850",
                    "commentCount": "92",
                }
            }
        ]
    }

    mock_get.side_effect = [mock_playlist_resp, mock_videos_resp]

    channel = RawChannelData(
        channel_id="UC_123",
        name="AI Coder",
        profile_url="https://youtube.com/c/aicoder",
        subscriber_count=25000,
        uploads_playlist_id="UU_123",
    )

    videos = mock_discovery_service.fetch_recent_videos(channel, max_videos=1)
    assert len(videos) == 1
    assert videos[0].video_id == "vid_123"
    assert videos[0].title == "Build AI Agents with Python"
    assert videos[0].views == 15000
    assert videos[0].likes == 850
    assert videos[0].comments == 92


@patch("requests.get")
def test_quota_exceeded_handling(mock_get, mock_discovery_service):
    """Test that HTTP 403 quotaExceeded triggers YouTubeQuotaExceededError."""
    mock_get.return_value.status_code = 403
    mock_get.return_value.json.return_value = {
        "error": {
            "errors": [{"reason": "quotaExceeded", "message": "The request cannot be completed..."}]
        }
    }

    with pytest.raises(YouTubeQuotaExceededError):
        mock_discovery_service.search_channels("tech")
