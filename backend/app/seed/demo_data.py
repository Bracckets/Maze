from datetime import datetime, timedelta

from app.models.entities import EventRecord


def build_demo_events() -> list[EventRecord]:
    base = datetime(2026, 3, 28, 9, 0, 0)

    raw_events = [
        ("user-1", "session-1", 0, "screen_view", "welcome", None, {}),
        ("user-1", "session-1", 2, "tap", "welcome", "get_started", {}),
        ("user-1", "session-1", 4, "screen_view", "phone_input", None, {}),
        ("user-1", "session-1", 8, "tap", "phone_input", "submit_phone", {}),
        ("user-1", "session-1", 9, "screen_view", "otp_verification", None, {}),
        ("user-1", "session-1", 14, "tap", "otp_verification", "submit_otp", {}),
        ("user-1", "session-1", 19, "screen_view", "kyc_form", None, {}),
        ("user-1", "session-1", 25, "input_error", "kyc_form", "nationality_field", {"masked": True}),
        ("user-1", "session-1", 29, "tap", "kyc_form", "continue_button", {}),
        ("user-1", "session-1", 30, "tap", "kyc_form", "continue_button", {}),
        ("user-1", "session-1", 31, "tap", "kyc_form", "continue_button", {}),
        ("user-1", "session-1", 38, "screen_view", "kyc_form", None, {}),
        ("user-2", "session-2", 0, "screen_view", "welcome", None, {}),
        ("user-2", "session-2", 1, "tap", "welcome", "get_started", {}),
        ("user-2", "session-2", 3, "screen_view", "phone_input", None, {}),
        ("user-2", "session-2", 6, "tap", "phone_input", "submit_phone", {}),
        ("user-2", "session-2", 7, "screen_view", "otp_verification", None, {}),
        ("user-2", "session-2", 11, "tap", "otp_verification", "submit_otp", {}),
        ("user-2", "session-2", 14, "screen_view", "kyc_form", None, {}),
        ("user-2", "session-2", 20, "input_error", "kyc_form", "address_field", {"masked": True}),
        ("user-2", "session-2", 23, "input_error", "kyc_form", "address_field", {"masked": True}),
        ("user-2", "session-2", 28, "tap", "kyc_form", "continue_button", {}),
        ("user-2", "session-2", 33, "screen_view", "kyc_form", None, {}),
        ("user-3", "session-3", 0, "screen_view", "welcome", None, {}),
        ("user-3", "session-3", 2, "tap", "welcome", "get_started", {}),
        ("user-3", "session-3", 4, "screen_view", "phone_input", None, {}),
        ("user-3", "session-3", 5, "tap", "phone_input", "submit_phone", {}),
        ("user-3", "session-3", 6, "screen_view", "otp_verification", None, {}),
        ("user-3", "session-3", 8, "tap", "otp_verification", "submit_otp", {}),
        ("user-3", "session-3", 12, "screen_view", "kyc_form", None, {}),
        ("user-3", "session-3", 16, "tap", "kyc_form", "continue_button", {}),
        ("user-3", "session-3", 17, "tap", "kyc_form", "continue_button", {}),
        ("user-3", "session-3", 18, "tap", "kyc_form", "continue_button", {}),
        ("user-3", "session-3", 24, "tap", "kyc_form", "help_icon", {}),
        ("user-4", "session-4", 0, "screen_view", "welcome", None, {}),
        ("user-4", "session-4", 2, "tap", "welcome", "get_started", {}),
        ("user-4", "session-4", 4, "screen_view", "phone_input", None, {}),
        ("user-4", "session-4", 7, "tap", "phone_input", "submit_phone", {}),
        ("user-4", "session-4", 8, "screen_view", "otp_verification", None, {}),
        ("user-4", "session-4", 13, "tap", "otp_verification", "submit_otp", {}),
        ("user-4", "session-4", 17, "screen_view", "kyc_form", None, {}),
        ("user-4", "session-4", 22, "tap", "kyc_form", "continue_button", {}),
        ("user-4", "session-4", 27, "screen_view", "success", None, {}),
    ]

    return [
        EventRecord(
            user_id=user_id,
            session_id=session_id,
            timestamp=base + timedelta(seconds=offset),
            event_type=event_type,
            screen=screen,
            element_id=element_id,
            event_metadata=metadata,
        )
        for user_id, session_id, offset, event_type, screen, element_id, metadata in raw_events
    ]
