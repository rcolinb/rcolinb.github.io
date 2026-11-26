"""Bounded, unconfirmed text suggestions; these never change task decisions."""

from datetime import datetime, timedelta


DRAFT_LIMITS = {"title": 160, "project": 200, "recap": 600,
                "nextAction": 400, "evidence": 220}
DRAFT_FIELDS = set(DRAFT_LIMITS) | {"taskId", "sourceId", "sourceUpdatedAt", "method"}
STARTER_NEXT_ACTION = "Review this conversation and choose the next step."


def shortened_title(value):
    value = " ".join(value.split())
    if len(value) <= 160:
        return value or "Untitled conversation"
    shortened = value[:159]
    if " " in shortened:
        shortened = shortened.rsplit(" ", 1)[0]
    return shortened.rstrip() + "\u2026"


def starter_suggestion(task, source, generated_at):
    return {
        "title": shortened_title(source["title"] if source else task["title"]),
        "project": "",
        "recap": source.get("summary", "")[:600] if source else "",
        "nextAction": STARTER_NEXT_ACTION,
        "evidence": ("Starter based on the conversation title and available summary; not yet assessed."
                     if source else "Starter for a work item without a linked conversation; not yet assessed."),
        "sourceId": source["id"] if source else None,
        "sourceUpdatedAt": source["updatedAt"] if source else None,
        "generatedAt": generated_at,
        "method": "starter",
    }


def validate_draft(record):
    """Validate text and timestamp shape; the store validates source ownership."""
    if not isinstance(record, dict) or set(record) != DRAFT_FIELDS:
        raise ValueError("Each suggestion must contain exactly the documented draft fields.")
    if record["method"] != "assistant-draft":
        raise ValueError("Imported suggestions must use method assistant-draft.")
    cleaned = {}
    for key, limit in DRAFT_LIMITS.items():
        value = record[key]
        if not isinstance(value, str) or "\x00" in value or len(value) > limit:
            raise ValueError("Suggestion %s must be text no longer than %s characters." % (key, limit))
        cleaned[key] = value.strip()
    if not cleaned["title"]:
        raise ValueError("Suggestion title cannot be empty.")
    timestamp = record["sourceUpdatedAt"]
    if not isinstance(timestamp, str) or len(timestamp) > 60:
        raise ValueError("Suggestion sourceUpdatedAt must be a UTC ISO timestamp.")
    try:
        parsed = datetime.fromisoformat(timestamp[:-1] + "+00:00" if timestamp.endswith("Z") else timestamp)
        if parsed.utcoffset() != timedelta(0):
            raise ValueError()
    except ValueError:
        raise ValueError("Suggestion sourceUpdatedAt must be a UTC ISO timestamp.")
    cleaned.update({key: record[key] for key in ("taskId", "sourceId", "sourceUpdatedAt", "method")})
    return cleaned
