import pytest
from fastapi import HTTPException

from app.routes.insights import get_heatmap
from app.routes.screenshots import get_screenshots
from app.services.platform import DEVICE_CLASS_DESKTOP, DEVICE_CLASS_PHONE, build_heatmap_payload, select_heatmap_device_class


def test_select_heatmap_device_class_defaults_to_phone_when_available():
    assert select_heatmap_device_class(None, [DEVICE_CLASS_PHONE, DEVICE_CLASS_DESKTOP]) == DEVICE_CLASS_PHONE


def test_select_heatmap_device_class_preserves_explicit_phone_request():
    assert select_heatmap_device_class(DEVICE_CLASS_PHONE, [DEVICE_CLASS_PHONE, DEVICE_CLASS_DESKTOP]) == DEVICE_CLASS_PHONE


def test_select_heatmap_device_class_rejects_invalid_request():
    with pytest.raises(ValueError, match="device_class must be 'phone' or 'desktop'"):
        select_heatmap_device_class("tablet", [DEVICE_CLASS_PHONE])


def test_select_heatmap_device_class_rejects_unavailable_request():
    with pytest.raises(ValueError, match="Requested device_class 'phone' is unavailable"):
        select_heatmap_device_class(DEVICE_CLASS_PHONE, [DEVICE_CLASS_DESKTOP])


def test_build_heatmap_payload_rejects_unavailable_requested_device_class(monkeypatch):
    monkeypatch.setattr("app.services.platform.list_available_heatmap_device_classes", lambda db, workspace_id, screen: [DEVICE_CLASS_DESKTOP])
    monkeypatch.setattr("app.services.platform.build_heatmap_points", lambda db, workspace_id, screen, device_class: [])

    with pytest.raises(ValueError, match="Requested device_class 'phone' is unavailable"):
        build_heatmap_payload(object(), "workspace-id", "welcome", DEVICE_CLASS_PHONE)


def test_get_heatmap_passes_phone_request_through_without_fallback(monkeypatch):
    seen = {}

    def fake_build_heatmap_payload(db, workspace_id, screen, device_class):
        seen["device_class"] = device_class
        return {
            "screen": screen,
            "deviceClass": DEVICE_CLASS_PHONE,
            "availableDeviceClasses": [DEVICE_CLASS_PHONE],
            "points": [],
        }

    monkeypatch.setattr("app.routes.insights.build_heatmap_payload", fake_build_heatmap_payload)

    result = get_heatmap("welcome", DEVICE_CLASS_PHONE, {"workspace_id": "workspace-id"}, object())

    assert seen["device_class"] == DEVICE_CLASS_PHONE
    assert result.deviceClass == DEVICE_CLASS_PHONE


def test_get_heatmap_returns_422_for_invalid_device_class():
    with pytest.raises(HTTPException) as exc_info:
        get_heatmap("welcome", "tablet", {"workspace_id": "workspace-id"}, object())
    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "device_class must be 'phone' or 'desktop'."


def test_get_heatmap_returns_422_for_unavailable_device_class(monkeypatch):
    def fake_build_heatmap_payload(db, workspace_id, screen, device_class):
        raise ValueError("Requested device_class 'phone' is unavailable. Available device classes: desktop.")

    monkeypatch.setattr("app.routes.insights.build_heatmap_payload", fake_build_heatmap_payload)

    with pytest.raises(HTTPException) as exc_info:
        get_heatmap("welcome", DEVICE_CLASS_PHONE, {"workspace_id": "workspace-id"}, object())
    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "Requested device_class 'phone' is unavailable. Available device classes: desktop."


def test_get_screenshots_rejects_invalid_device_class():
    with pytest.raises(HTTPException) as exc_info:
        get_screenshots(device_class="tablet", account={"workspace_id": "workspace-id"}, db=object())
    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "device_class must be 'phone' or 'desktop'."


def test_get_screenshots_passes_normalized_phone_filter(monkeypatch):
    seen = {}

    def fake_list_workspace_screenshots(**kwargs):
        seen.update(kwargs)
        return []

    monkeypatch.setattr("app.routes.screenshots.list_workspace_screenshots", fake_list_workspace_screenshots)

    get_screenshots(device_class="PHONE", account={"workspace_id": "workspace-id"}, db=object())

    assert seen["device_class"] == DEVICE_CLASS_PHONE
