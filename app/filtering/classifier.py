"""Deterministic, explainable multi-signal technology niche classifier and relevance scorer."""

import re
from typing import Dict, List, Tuple, Optional, Set
from app.schemas.influencer import RawChannelData, VideoMetadata
from app.utils.logging import get_logger

logger = get_logger("filtering.classifier")

# Explicit positive technology keyword taxonomy
POSITIVE_TECH_TAXONOMY: Dict[str, List[str]] = {
    "AI & Artificial Intelligence": [
        "artificial intelligence", "ai tools", "ai tutorial", "generative ai", "llm", "large language model",
        "chatgpt", "claude ai", "claude", "gemini", "openai", "agentic", "ai agent", "prompt engineering",
        "deep learning", "langchain", "llama", "hugging face", "diffusers", "midjourney"
    ],
    "Programming": [
        "python", "python programming", "python tutorial", "javascript", "javascript tutorial",
        "typescript", "react", "react tutorial", "rust", "golang", "go lang", "java", "c++", "c#",
        "nextjs", "vue", "fastapi", "django", "nodejs", "coding tutorial", "coding",
        "programming", "programming tips", "code with", "learn to code", "web development", "backend", "frontend"
    ],
    "Software Engineering": [
        "software engineer", "software engineering", "system design", "clean code",
        "architecture", "microservices", "algorithms", "data structures", "leetcode",
        "tech interview", "design patterns", "refactoring"
    ],
    "Developer Tools & DevOps": [
        "developer tools", "devtools", "vs code", "vscode", "neovim", "vim", "git", "github",
        "docker", "kubernetes", "linux", "terminal", "bash", "zsh", "ide", "ci/cd", "cursor",
        "copilot", "postman", "aws", "aws tutorial", "azure", "cloud computing", "cloud", "devops", "terraform"
    ],
    "Cybersecurity": [
        "cybersecurity", "infosec", "ethical hacking", "pentesting", "bug bounty", "kali linux",
        "network security", "malware analysis", "soc", "cryptography", "osint", "security tools"
    ],
    "Data Science & ML": [
        "data science", "machine learning", "pandas", "numpy", "data analysis", "sql", "power bi",
        "tensorflow", "pytorch", "neural network", "analytics", "visualization"
    ],
    "Consumer Tech & Gadgets": [
        "gadgets", "tech gadgets", "technology review", "tech review", "smartphone", "smartphones",
        "laptop", "mechanical keyboard", "pc build", "gpu", "nvidia", "hardware review", "desk setup", "unboxing", "technology"
    ],
}

# Strong negative keywords (comedy, entertainment, lifestyle, gossip, music)
NEGATIVE_KEYWORDS: List[str] = [
    "comedy", "funny", "prank", "roast", "entertainment", "music", "song", "movie",
    "reaction", "celebrity", "vlog", "daily life", "standup", "stand-up", "comedian",
    "jokes", "skit", "skits", "gossip", "parody", "drama", "sketch comedy", "dance",
    "humor", "laughter", "memes", "masti", "shikayat", "bloopers", "funniest"
]


class NicheClassifier:
    """Classifies channels into granular niches with multi-signal weighted relevance scoring."""

    def __init__(self):
        self.compiled_positive: Dict[str, List[Tuple[re.Pattern, str]]] = {}
        for category, keywords in POSITIVE_TECH_TAXONOMY.items():
            patterns = []
            for kw in keywords:
                esc = re.escape(kw)
                pattern = re.compile(rf"\b{esc}\b", re.IGNORECASE)
                patterns.append((pattern, kw))
            self.compiled_positive[category] = patterns

        self.compiled_negative: List[Tuple[re.Pattern, str]] = []
        for kw in NEGATIVE_KEYWORDS:
            esc = re.escape(kw)
            pattern = re.compile(rf"\b{esc}\b", re.IGNORECASE)
            self.compiled_negative.append((pattern, kw))

    def _match_keywords(self, text: str) -> Tuple[Dict[str, int], int, Set[str], Set[str]]:
        """Count positive matches per tech category, negative matches, and return detected keyword sets."""
        if not text:
            return {}, 0, set(), set()

        category_counts: Dict[str, int] = {}
        pos_detected: Set[str] = set()
        neg_detected: Set[str] = set()

        for category, patterns in self.compiled_positive.items():
            count = 0
            for pattern, raw_kw in patterns:
                matches = pattern.findall(text)
                if matches:
                    count += len(matches)
                    pos_detected.add(raw_kw)
            if count > 0:
                category_counts[category] = count

        neg_count = 0
        for pattern, raw_kw in self.compiled_negative:
            matches = pattern.findall(text)
            if matches:
                neg_count += len(matches)
                neg_detected.add(raw_kw)

        return category_counts, neg_count, pos_detected, neg_detected

    def _score_component(self, pos_count: int, neg_count: int, max_pos_cap: int = 4) -> float:
        """Compute a normalized 0.0 - 1.0 affinity score for a text component."""
        if pos_count == 0 and neg_count == 0:
            return 0.0

        if neg_count > 0 and pos_count == 0:
            return 0.0

        # Ratio of positive vs total signals
        ratio = pos_count / (pos_count + neg_count * 2.0)
        # Scale by positive intensity
        intensity = min(1.0, pos_count / max_pos_cap)
        return max(0.0, min(1.0, ratio * 0.7 + intensity * 0.3))

    def evaluate_video_relevance(self, video: VideoMetadata) -> bool:
        """Evaluate whether an individual video is technology-relevant."""
        text = f"{video.title} {video.description[:400]}"
        cat_counts, neg_count, pos_kw, neg_kw = self._match_keywords(text)
        total_pos = sum(cat_counts.values())

        if total_pos >= 1 and total_pos >= neg_count:
            return True
        return False

    def calculate_relevance(
        self,
        channel: RawChannelData,
        recent_videos: Optional[List[VideoMetadata]] = None,
    ) -> Tuple[float, str, float, str, float, List[str]]:
        """Calculate weighted technology relevance score, explainable reason, video ratio, and niche.
        
        Weights:
        - Channel Title: 20%
        - Channel Description: 25%
        - Recent Video Relevance: 40%
        - Content Theme Relevance: 15%
        
        Returns:
            (relevance_score, relevance_reason, video_ratio, top_niche, confidence, detected_keywords)
        """
        recent_videos = recent_videos or []
        
        # 1. Title Analysis (20% Weight)
        t_cats, t_neg, t_pos_kw, t_neg_kw = self._match_keywords(channel.name)
        t_pos = sum(t_cats.values())
        title_score = self._score_component(t_pos, t_neg, max_pos_cap=2)

        # 2. Description Analysis (25% Weight)
        d_cats, d_neg, d_pos_kw, d_neg_kw = self._match_keywords(channel.description)
        d_pos = sum(d_cats.values())
        desc_score = self._score_component(d_pos, d_neg, max_pos_cap=4)

        # 3. Recent Videos Analysis (40% Weight)
        tech_videos_count = 0
        total_videos_pos = 0
        total_videos_neg = 0
        v_pos_kw: Set[str] = set()
        v_neg_kw: Set[str] = set()

        for video in recent_videos:
            is_relevant = self.evaluate_video_relevance(video)
            video.is_tech_relevant = is_relevant
            if is_relevant:
                tech_videos_count += 1

            v_cats, v_neg, p_kw, n_kw = self._match_keywords(f"{video.title} {video.description[:300]}")
            total_videos_pos += sum(v_cats.values())
            total_videos_neg += v_neg
            v_pos_kw.update(p_kw)
            v_neg_kw.update(n_kw)

        analyzed_videos_count = len(recent_videos)
        if analyzed_videos_count > 0:
            tech_video_ratio = round(tech_videos_count / analyzed_videos_count, 2)
            video_content_score = self._score_component(total_videos_pos, total_videos_neg, max_pos_cap=analyzed_videos_count * 2)
            # Combine ratio with keyword density
            recent_video_score = (tech_video_ratio * 0.6) + (video_content_score * 0.4)
        else:
            tech_video_ratio = 0.0
            recent_video_score = (title_score * 0.4 + desc_score * 0.6) * 0.5

        # 4. Content Themes / Holistic Density (15% Weight)
        all_pos_kw = t_pos_kw | d_pos_kw | v_pos_kw
        all_neg_kw = t_neg_kw | d_neg_kw | v_neg_kw
        
        theme_score = 0.0
        if len(all_pos_kw) >= 3:
            theme_score = 1.0
        elif len(all_pos_kw) == 2:
            theme_score = 0.75
        elif len(all_pos_kw) == 1:
            theme_score = 0.40

        if len(all_neg_kw) > len(all_pos_kw):
            theme_score = max(0.0, theme_score - 0.4)

        # Calculate Final Weighted Relevance Score (0 - 100)
        raw_relevance = (
            (title_score * 0.20) +
            (desc_score * 0.25) +
            (recent_video_score * 0.40) +
            (theme_score * 0.15)
        )

        # Apply negative penalty if negative keywords heavily dominate the channel name or videos
        if t_neg > 0 and t_pos == 0:
            raw_relevance *= 0.3
        if analyzed_videos_count >= 3 and tech_video_ratio < 0.20:
            raw_relevance *= 0.4

        relevance_score = round(max(0.0, min(100.0, raw_relevance * 100.0)), 1)

        # Determine Primary Category
        aggregate_categories: Dict[str, int] = {}
        for cat in POSITIVE_TECH_TAXONOMY:
            aggregate_categories[cat] = t_cats.get(cat, 0) * 2 + d_cats.get(cat, 0) * 2

        for video in recent_videos:
            v_cats, _, _, _ = self._match_keywords(f"{video.title} {video.description[:200]}")
            for cat, count in v_cats.items():
                aggregate_categories[cat] = aggregate_categories.get(cat, 0) + count * 3

        if aggregate_categories and max(aggregate_categories.values()) > 0:
            best_niche = max(aggregate_categories, key=aggregate_categories.get)
        else:
            if len(all_neg_kw) > 0 or "comedy" in channel.name.lower():
                best_niche = "Comedy & Entertainment"
            else:
                best_niche = "Technology"

        # Generate Explainable Reason
        if relevance_score >= 60.0:
            detected_topics = ", ".join(sorted(list(all_pos_kw))[:4])
            if analyzed_videos_count > 0:
                relevance_reason = (
                    f"Recent content strongly aligns with technology ({tech_videos_count}/{analyzed_videos_count} verified tech uploads). "
                    f"Detected topics: {detected_topics}."
                )
            else:
                relevance_reason = f"Channel metadata demonstrates strong tech alignment in {best_niche} ({detected_topics})."
        elif relevance_score < 40.0:
            if len(all_neg_kw) > 0 or "comedy" in channel.name.lower():
                neg_topics = ", ".join(sorted(list(all_neg_kw))[:3])
                relevance_reason = f"Recent content is primarily comedy/entertainment ({neg_topics}) with insufficient technology-related content."
            else:
                relevance_reason = "Channel content lacks sufficient verified technology, programming, or engineering topics in recent uploads."
        else:
            relevance_reason = (
                f"Moderate technology signals detected ({tech_videos_count}/{analyzed_videos_count} tech uploads). "
                f"Requires manual review for brand fit."
            )

        confidence = round(max(0.20, min(1.0, relevance_score / 100.0)), 2)
        return relevance_score, relevance_reason, tech_video_ratio, best_niche, confidence, sorted(list(all_pos_kw))

    def classify(
        self,
        channel: RawChannelData,
        recent_videos: Optional[List[VideoMetadata]] = None,
        target_niche: Optional[str] = None,
    ) -> Tuple[str, float, List[str]]:
        """Legacy compatibility wrapper returning (niche, confidence, keywords)."""
        rel_score, rel_reason, vid_ratio, niche, confidence, keywords = self.calculate_relevance(
            channel=channel, recent_videos=recent_videos
        )
        return niche, confidence, keywords
