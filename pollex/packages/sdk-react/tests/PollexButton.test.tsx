import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PollexButton } from "../src";
import { makeClient, makeDecision, wrapper } from "./test-utils";

describe("PollexButton", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("test_renders_children_while_loading", () => {
    const client = makeClient({ resolve: vi.fn(() => new Promise<never>(() => undefined)) });

    render(
      wrapper(
        client,
        <PollexButton id="checkout.continue" intent="progress" allow={{ text: true }}>
          Continue
        </PollexButton>
      )
    );

    expect(screen.getByRole("button").textContent).toBe("Continue");
  });

  it("test_renders_adapted_text_when_resolved", async () => {
    const client = makeClient({ resolve: vi.fn().mockResolvedValue(makeDecision({ adaptations: { text: "Next step" } })) });

    render(
      wrapper(
        client,
        <PollexButton id="checkout.continue" intent="progress" allow={{ text: true }}>
          Continue
        </PollexButton>
      )
    );

    await waitFor(() => expect(screen.getByRole("button").textContent).toBe("Next step"));
  });

  it("test_renders_children_on_fallback", async () => {
    const client = makeClient({
      resolve: vi.fn().mockResolvedValue(makeDecision({ adaptations: {}, fallback: true, reason: "Fallback rendered." }))
    });

    render(
      wrapper(
        client,
        <PollexButton id="checkout.continue" intent="progress" allow={{ text: true }}>
          Continue
        </PollexButton>
      )
    );

    await waitFor(() => expect(screen.getByRole("button").textContent).toBe("Continue"));
  });

  it("test_fires_click_event", async () => {
    const client = makeClient();
    render(
      wrapper(
        client,
        <PollexButton id="checkout.continue" intent="progress" allow={{ text: true }}>
          Continue
        </PollexButton>
      )
    );

    fireEvent.click(screen.getByRole("button"), { clientX: 0, clientY: 0 });

    await waitFor(() => expect(client.track).toHaveBeenCalled());
    expect(JSON.stringify(vi.mocked(client.track).mock.calls[0][0])).toContain("click");
  });

  it("test_fires_hesitation_event_after_dwell", async () => {
    vi.useFakeTimers();
    const client = makeClient();
    render(
      wrapper(
        client,
        <PollexButton id="checkout.continue" intent="progress" allow={{ text: true }}>
          Continue
        </PollexButton>
      )
    );

    fireEvent.pointerEnter(screen.getByRole("button"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500);
    });

    expect(JSON.stringify(vi.mocked(client.track).mock.calls.at(-1)?.[0])).toContain("hesitation");
  });

  it("test_fires_rage_tap_on_rapid_clicks", async () => {
    const client = makeClient();
    render(
      wrapper(
        client,
        <PollexButton id="checkout.continue" intent="progress" allow={{ text: true }}>
          Continue
        </PollexButton>
      )
    );

    fireEvent.click(screen.getByRole("button"), { clientX: 0, clientY: 0 });
    fireEvent.click(screen.getByRole("button"), { clientX: 0, clientY: 0 });
    fireEvent.click(screen.getByRole("button"), { clientX: 0, clientY: 0 });

    await waitFor(() => expect(JSON.stringify(vi.mocked(client.track).mock.calls)).toContain("rage_tap"));
  });

  it("test_does_not_inject_html", async () => {
    const client = makeClient({
      resolve: vi.fn().mockResolvedValue(makeDecision({ adaptations: { text: "<img src=x onerror=alert(1)>" } }))
    });
    render(
      wrapper(
        client,
        <PollexButton id="checkout.continue" intent="progress" allow={{ text: true }}>
          Continue
        </PollexButton>
      )
    );

    await waitFor(() => expect(screen.getByRole("button").textContent).toContain("<img"));
    expect(document.querySelector("img")).toBeNull();
  });

  it("test_does_not_apply_inline_css", async () => {
    const client = makeClient({
      resolve: vi.fn().mockResolvedValue(makeDecision({ adaptations: { size: "lg", style: "color: red;" } }))
    });
    render(
      wrapper(
        client,
        <PollexButton id="checkout.continue" intent="progress" allow={{ size: true }}>
          Continue
        </PollexButton>
      )
    );

    await waitFor(() => expect(screen.getByRole("button").className).toContain("pollex-size-lg"));
    expect(screen.getByRole("button").getAttribute("style")).toBeNull();
  });
});
