"""Unit tests for FastAPI REST API endpoints."""

import pytest
from fastapi.testclient import TestClient
from app.api.server import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "CreatorFlow AI"


def test_analytics_endpoint():
    response = client.get("/api/analytics")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert "funnel" in data
    assert "niche_breakdown" in data
    assert "recent_activities" in data


def test_influencers_list_endpoint():
    response = client.get("/api/influencers?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


def test_campaigns_endpoint():
    response = client.get("/api/campaigns")
    assert response.status_code == 200
    data = response.json()
    assert "campaigns" in data
    assert len(data["campaigns"]) >= 1


def test_settings_endpoint():
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert "youtube_api" in data
    assert "groq_api" in data
    assert "outreach" in data
