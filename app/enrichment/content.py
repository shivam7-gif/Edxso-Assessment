"""Extracts 2-5 salient content themes from creator's recent video corpus."""

import re
from typing import List
from collections import Counter
from app.schemas.influencer import VideoMetadata
from app.utils.logging import get_logger

logger = get_logger("enrichment.content")

# High-signal recurring tech themes
THEME_DICTIONARY = {
    "AI Tools & Workflows": ["ai tool", "chatgpt", "claude", "gemini", "copilot", "cursor", "midjourney", "agent"],
    "Python Development": ["python", "fastapi", "django", "pandas", "numpy", "automation", "script"],
    "Web & Fullstack Engineering": ["javascript", "typescript", "react", "nextjs", "vue", "node", "frontend", "backend", "fullstack", "css", "html"],
    "Software Architecture & System Design": ["system design", "architecture", "microservices", "clean code", "refactoring", "patterns", "scaling"],
    "Cloud & Infrastructure": ["aws", "cloud", "docker", "kubernetes", "devops", "terraform", "serverless", "linux"],
    "Developer Productivity & Tooling": ["productivity", "terminal", "neovim", "vscode", "git", "setup", "workflow"],
    "Data Science & Analytics": ["data science", "data analysis", "sql", "visualization", "bi", "analytics", "power bi"],
    "Machine Learning & Deep Learning": ["machine learning", "ml", "pytorch", "tensorflow", "neural network", "transformer", "llm", "fine-tuning"],
    "Cybersecurity & InfoSec": ["cybersecurity", "security", "hacking", "pentesting", "infosec", "bug bounty", "malware"],
    "Hardware, PC Builds & Desk Setup": ["hardware", "desk setup", "mechanical keyboard", "gpu", "macbook", "laptop", "pc build"],
    "Tech Reviews & Gadgets": ["review", "unboxing", "comparison", "gadgets", "tech news", "tech review", "worth it"],
    "Coding Tutorials & Beginner Guides": ["tutorial", "beginner", "guide", "learn", "how to code", "crash course", "roadmap"],
}


class ContentThemeExtractor:
    """Extracts 2 to 5 structured content themes based on actual video titles."""

    def extract_themes(self, videos: List[VideoMetadata], default_niche: str = "Technology") -> List[str]:
        """Analyze recent video titles and extract 2-5 relevant content themes."""
        if not videos:
            return [default_niche, "Tech Content"]

        # Aggregate titles into text corpus
        corpus = " ".join(v.title.lower() for v in videos)
        theme_scores: Counter = Counter()

        for theme_name, keywords in THEME_DICTIONARY.items():
            for kw in keywords:
                # Count keyword occurrences
                matches = len(re.findall(rf"\b{re.escape(kw)}\b", corpus))
                if matches > 0:
                    theme_scores[theme_name] += matches

        # Select top themes
        top_themes = [theme for theme, count in theme_scores.most_common(5) if count > 0]

        # Ensure we always return between 2 and 5 themes
        if len(top_themes) < 2:
            fallback_themes = [f"{default_niche} Overview", "Coding & Development", "Tech Exploration"]
            for fb in fallback_themes:
                if fb not in top_themes:
                    top_themes.append(fb)
                if len(top_themes) >= 2:
                    break

        return top_themes[:5]
