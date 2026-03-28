from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime

from app.models.entities import EventRecord, IssueRecord, SessionRecord


@dataclass
class SessionSnapshot:
    session_id: str
    user_id: str
    start_time: datetime
    end_time: datetime
    last_screen: str
    dropped_off: bool
    events: list[EventRecord]


def reconstruct_sessions(events: list[EventRecord]) -> list[SessionSnapshot]:
    grouped: dict[str, list[EventRecord]] = defaultdict(list)
    for event in events:
        grouped[event.session_id].append(event)

    sessions: list[SessionSnapshot] = []
    for session_id, session_events in grouped.items():
        ordered = sorted(session_events, key=lambda item: item.timestamp)
        first = ordered[0]
        last = ordered[-1]
        dropped_off = last.screen != "success"
        sessions.append(
            SessionSnapshot(
                session_id=session_id,
                user_id=first.user_id,
                start_time=first.timestamp,
                end_time=last.timestamp,
                last_screen=last.screen,
                dropped_off=dropped_off,
                events=ordered,
            )
        )
    return sorted(sessions, key=lambda item: item.start_time)


def build_session_records(snapshots: list[SessionSnapshot]) -> list[SessionRecord]:
    return [
        SessionRecord(
            session_id=item.session_id,
            user_id=item.user_id,
            start_time=item.start_time,
            end_time=item.end_time,
            last_screen=item.last_screen,
            dropped_off=item.dropped_off,
        )
        for item in snapshots
    ]


def detect_issues(snapshots: list[SessionSnapshot]) -> list[IssueRecord]:
    issues: list[IssueRecord] = []

    drop_off_counter = Counter(
        session.last_screen for session in snapshots if session.dropped_off and session.last_screen
    )
    total_sessions = len(snapshots) or 1

    for screen, frequency in drop_off_counter.items():
        if frequency >= max(2, total_sessions // 3):
            affected_users = len({session.user_id for session in snapshots if session.last_screen == screen})
            issues.append(
                IssueRecord(
                    type="drop_off",
                    screen=screen,
                    element_id=None,
                    frequency=frequency,
                    affected_users_count=affected_users,
                    details={"share_of_sessions": round(frequency / total_sessions, 2)},
                )
            )

    rage_tap_groups: dict[tuple[str, str], set[str]] = defaultdict(set)
    rage_tap_count: Counter[tuple[str, str]] = Counter()
    dead_tap_groups: dict[tuple[str, str], set[str]] = defaultdict(set)
    dead_tap_count: Counter[tuple[str, str]] = Counter()
    slow_response_groups: dict[tuple[str, str], set[str]] = defaultdict(set)
    slow_response_count: Counter[tuple[str, str]] = Counter()
    form_friction_groups: dict[tuple[str, str], set[str]] = defaultdict(set)
    form_friction_count: Counter[tuple[str, str]] = Counter()

    for session in snapshots:
        events = session.events
        for index, event in enumerate(events):
            if event.event_type == "tap" and event.element_id:
                window = [
                    candidate
                    for candidate in events[index : index + 3]
                    if candidate.event_type == "tap"
                    and candidate.element_id == event.element_id
                    and candidate.screen == event.screen
                    and (candidate.timestamp - event.timestamp).total_seconds() <= 2
                ]
                if len(window) >= 3:
                    key = (event.screen, event.element_id)
                    rage_tap_count[key] += 1
                    rage_tap_groups[key].add(session.user_id)

                next_event = events[index + 1] if index + 1 < len(events) else None
                if next_event is None or (
                    next_event.screen == event.screen
                    and next_event.event_type in {"tap", "screen_view"}
                    and (next_event.timestamp - event.timestamp).total_seconds() > 1.2
                ):
                    key = (event.screen, event.element_id)
                    dead_tap_count[key] += 1
                    dead_tap_groups[key].add(session.user_id)

                if next_event is not None and (next_event.timestamp - event.timestamp).total_seconds() >= 4:
                    key = (event.screen, event.element_id)
                    slow_response_count[key] += 1
                    slow_response_groups[key].add(session.user_id)

            if event.event_type == "input_error" and event.element_id:
                key = (event.screen, event.element_id)
                form_friction_count[key] += 1
                form_friction_groups[key].add(session.user_id)

    for (screen, element_id), frequency in rage_tap_count.items():
        issues.append(
            IssueRecord(
                type="rage_tap",
                screen=screen,
                element_id=element_id,
                frequency=frequency,
                affected_users_count=len(rage_tap_groups[(screen, element_id)]),
                details={"threshold": ">=3 taps in 2 seconds"},
            )
        )

    for (screen, element_id), frequency in dead_tap_count.items():
        if frequency >= 2:
            issues.append(
                IssueRecord(
                    type="dead_tap",
                    screen=screen,
                    element_id=element_id,
                    frequency=frequency,
                    affected_users_count=len(dead_tap_groups[(screen, element_id)]),
                    details={"pattern": "tap without meaningful follow-up"},
                )
            )

    for (screen, element_id), frequency in slow_response_count.items():
        issues.append(
            IssueRecord(
                type="slow_response",
                screen=screen,
                element_id=element_id,
                frequency=frequency,
                affected_users_count=len(slow_response_groups[(screen, element_id)]),
                details={"threshold_seconds": 4},
            )
        )

    for (screen, element_id), frequency in form_friction_count.items():
        if frequency >= 2:
            issues.append(
                IssueRecord(
                    type="form_friction",
                    screen=screen,
                    element_id=element_id,
                    frequency=frequency,
                    affected_users_count=len(form_friction_groups[(screen, element_id)]),
                    details={"pattern": "repeated input errors"},
                )
            )

    return issues


def issue_to_insight(issue: IssueRecord) -> dict:
    if issue.type == "drop_off":
        return {
            "title": f"Users are dropping off on {issue.screen}",
            "impact": f"{issue.frequency} sessions ended on {issue.screen}, affecting {issue.affected_users_count} users.",
            "reason": [
                f"Session reconstruction shows repeated exits on {issue.screen}.",
                "This usually signals confusion, latency, or missing guidance at a critical step.",
            ],
            "suggestions": [
                f"Add clearer progress guidance on {issue.screen}.",
                "Instrument server and client latency around the exit point.",
                "Test a simpler CTA hierarchy or reduce required fields.",
            ],
        }
    if issue.type == "rage_tap":
        return {
            "title": f"Rage taps detected on {issue.element_id}",
            "impact": f"{issue.frequency} rage tap clusters were detected on {issue.screen}.",
            "reason": [
                "Users tapped the same element at least three times within two seconds.",
                "This often means the UI appears unresponsive or the action result is unclear.",
            ],
            "suggestions": [
                "Add immediate loading and disabled states after tap.",
                "Confirm whether the CTA is blocked by validation or a network request.",
                "Make failure states explicit near the button.",
            ],
        }
    if issue.type == "dead_tap":
        return {
            "title": f"Dead taps on {issue.element_id} suggest broken affordances",
            "impact": f"{issue.frequency} taps on {issue.element_id} had no clear outcome.",
            "reason": [
                "The element received taps without a meaningful follow-up event.",
                "This can indicate a disabled control, hitbox issue, or missing action wiring.",
            ],
            "suggestions": [
                "Verify the control is interactive in all states.",
                "Check tap target size and gesture conflicts.",
                "Track explicit success and validation events after the tap.",
            ],
        }
    if issue.type == "slow_response":
        return {
            "title": f"Slow response after interacting with {issue.element_id}",
            "impact": f"{issue.frequency} slow transitions were observed on {issue.screen}.",
            "reason": [
                "There was a large delay between the user action and the next event.",
                "Slow handoffs can create uncertainty and increase abandonment.",
            ],
            "suggestions": [
                "Measure API latency and client rendering for this step.",
                "Show progress feedback immediately after submission.",
                "Consider optimistic transitions when safe.",
            ],
        }
    return {
        "title": f"Form friction on {issue.element_id}",
        "impact": f"{issue.frequency} repeated input failures were seen on {issue.screen}.",
        "reason": [
            "Users repeated the same input flow with validation errors.",
            "This usually means the form expectations are not obvious enough.",
        ],
        "suggestions": [
            "Move validation hints closer to the field.",
            "Clarify formatting requirements before submit.",
            "Reduce manual entry where possible.",
        ],
    }
