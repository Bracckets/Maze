from collections.abc import Iterable
from typing import Any

from sqlalchemy.orm import Session

from app.models.schemas import InsightChatFocusIn
from app.services.platform import (
    list_workspace_insight_snapshots,
    list_workspace_issue_snapshots,
    list_workspace_sessions,
    serialize_session,
)

ISSUE_LABELS = {
    "rage_tap": "rage taps",
    "drop_off": "drop-offs",
    "slow_response": "slow response",
    "dead_tap": "dead taps",
    "form_friction": "form friction",
}

ISSUE_WHY_NOTES = {
    "rage_tap": "people are trying to force progress because the intended action is unclear, delayed, or appears broken",
    "drop_off": "the flow is asking for effort or trust before it has earned enough momentum to keep users moving",
    "slow_response": "feedback loops are lagging long enough to make the interface feel unreliable",
    "dead_tap": "the UI is hinting at an interaction that does not consistently resolve into a state change",
    "form_friction": "validation, copy, or progression rules are creating hesitation before users can complete the task",
}

ISSUE_TEST_NOTES = {
    "rage_tap": "tighten the control affordance, loading feedback, and disabled-state clarity around the primary action",
    "drop_off": "reduce cognitive load on the step, clarify progress, and remove anything that feels like an unexpected commitment",
    "slow_response": "add immediate acknowledgement, shorten perceived wait time, and expose progress when the system is working",
    "dead_tap": "audit hit targets, layering, and disabled-state behavior across every interaction path",
    "form_friction": "trim fields, simplify requirements, and make validation recoverable instead of punitive",
}


def _issue_label(issue_type: str) -> str:
    return ISSUE_LABELS.get(issue_type, issue_type.replace("_", " "))


def _screen_label(screen: str | None) -> str:
    if not screen:
        return "unknown screen"
    return screen.replace("_", " ")


def _join_parts(parts: Iterable[str]) -> str:
    cleaned = [part.strip() for part in parts if part and part.strip()]
    return " ".join(cleaned)


def _intent(question: str) -> str:
    normalized = question.lower()
    if any(token in normalized for token in ("why", "cause", "root", "happen", "happened", "happening")):
        return "why"
    if any(token in normalized for token in ("fix", "test", "next", "do", "improve", "change")):
        return "fix"
    if any(token in normalized for token in ("evidence", "proof", "data", "session", "signal", "support")):
        return "evidence"
    if any(token in normalized for token in ("impact", "severity", "priority", "urgent", "compare")):
        return "impact"
    return "general"


def _detail_summary(details: dict[str, Any] | None) -> str | None:
    if not details:
        return None
    items = []
    for key, value in details.items():
        label = key.replace("_", " ")
        items.append(f"{label}: {value}")
        if len(items) == 3:
            break
    return ", ".join(items) if items else None


def _select_focus_insight(insights: list[dict[str, Any]], focus: InsightChatFocusIn | None) -> dict[str, Any] | None:
    if focus is not None:
        for row in insights:
            if (
                row["payload"]["title"] == focus.title
                and (row["screen"] or "unknown") == focus.screen
                and row["issue_type"] == focus.issue_type
            ):
                return row
    return insights[0] if insights else None


def _related_issue(issues: list[dict[str, Any]], focus_row: dict[str, Any]) -> dict[str, Any] | None:
    issue_type = focus_row["issue_type"]
    screen = focus_row["screen"] or "unknown"
    for issue in issues:
        if issue["type"] == issue_type and (issue["screen"] or "unknown") == screen:
            return issue
    for issue in issues:
        if issue["type"] == issue_type:
            return issue
    return None


def build_insight_chat_reply(
    db: Session,
    workspace_id: str,
    question: str,
    focus: InsightChatFocusIn | None,
) -> dict[str, Any]:
    insights = list_workspace_insight_snapshots(db, workspace_id)
    if not insights:
        return {
            "answer": "There is not enough issue signal in this workspace yet. Once insights are generated, I can help unpack likely causes, supporting evidence, and what to test next.",
            "evidence": [],
            "focus_title": None,
        }

    focus_row = _select_focus_insight(insights, focus)
    if focus_row is None:
        return {
            "answer": "I could not match that issue to the current workspace snapshot. Try again after refreshing the insights view.",
            "evidence": [],
            "focus_title": None,
        }

    payload = focus_row["payload"]
    issues = list_workspace_issue_snapshots(db, workspace_id)
    sessions = [serialize_session(session) for session in list_workspace_sessions(db, workspace_id, 24)]

    screen = focus_row["screen"] or "unknown"
    issue_type = focus_row["issue_type"]
    issue_label = _issue_label(issue_type)
    screen_label = _screen_label(screen)
    reasons = payload.get("reason", [])
    suggestions = payload.get("suggestions", [])
    related_issue = _related_issue(issues, focus_row)

    screen_sessions = [session for session in sessions if (session.get("last_screen") or "unknown") == screen]
    screen_drop_offs = sum(1 for session in screen_sessions if session.get("dropped_off"))
    workspace_drop_offs = sum(1 for session in sessions if session.get("dropped_off"))
    recent_status_note = (
        f"On {screen_label}, {screen_drop_offs} of the last {len(screen_sessions)} recent sessions ended in drop-off."
        if screen_sessions
        else f"Across the last {len(sessions)} sessions in this workspace, {workspace_drop_offs} ended in drop-off."
    )
    severity_note = (
        f"The related issue is currently marked {related_issue['severity']} severity."
        if related_issue is not None
        else "The related issue snapshot does not include an explicit severity label yet."
    )
    details_note = _detail_summary(related_issue.get("details") if related_issue else None)

    why_note = (
        "; ".join(reasons[:2])
        if reasons
        else ISSUE_WHY_NOTES.get(issue_type, "the observed interaction pattern is creating enough friction to break user momentum")
    )
    next_test = (
        suggestions[0]
        if suggestions
        else ISSUE_TEST_NOTES.get(issue_type, "review the target flow and remove the most ambiguous step before asking for more effort")
    )

    overview = (
        f"{payload['title']} is being driven by {focus_row['frequency']} {issue_label} events across "
        f"{focus_row['affected_users_count']} users on {screen_label}."
    )
    impact = payload.get("impact", "This is already strong enough to show up as a prioritized friction signal.")

    intent = _intent(question)
    if intent == "why":
        answer = _join_parts(
            [
                overview,
                f"The strongest explanation in the current context is that {why_note}.",
                severity_note,
                recent_status_note,
                details_note or "",
                f"The first thing I would test is: {next_test}",
            ]
        )
    elif intent == "fix":
        answer = _join_parts(
            [
                overview,
                f"The most practical next move is to {next_test}",
                f"That recommendation is grounded in this explanation: {why_note}.",
                recent_status_note,
                impact,
            ]
        )
    elif intent == "evidence":
        answer = _join_parts(
            [
                overview,
                f"The evidence currently points to {why_note}.",
                recent_status_note,
                severity_note,
                details_note or "",
                impact,
            ]
        )
    elif intent == "impact":
        answer = _join_parts(
            [
                overview,
                impact,
                severity_note,
                recent_status_note,
                f"If you only run one follow-up this cycle, prioritize this: {next_test}",
            ]
        )
    else:
        answer = _join_parts(
            [
                overview,
                f"Why it is likely happening: {why_note}.",
                impact,
                recent_status_note,
                f"Best next test: {next_test}",
            ]
        )

    evidence = [
        {
            "label": "Observed signal",
            "detail": f"{focus_row['frequency']} {issue_label} events across {focus_row['affected_users_count']} affected users on {screen_label}.",
        },
        {
            "label": "Insight reasoning",
            "detail": why_note[:220],
        },
        {
            "label": "Recent session context",
            "detail": recent_status_note,
        },
    ]

    if related_issue is not None:
        issue_evidence = f"{severity_note} {details_note}" if details_note else severity_note
        evidence.append({"label": "Issue snapshot", "detail": issue_evidence.strip()})

    return {
        "answer": answer,
        "evidence": evidence,
        "focus_title": payload["title"],
    }
