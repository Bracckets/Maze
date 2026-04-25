import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PollexProvider } from "../src";
import { jsonResponse } from "./test-utils";

describe("PollexProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls identify on mount", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PollexProvider apiKey="px_test" apiBaseUrl="http://localhost:8000" userId="user_123" traits={{ locale: "en" }}>
        <div>child</div>
      </PollexProvider>
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/sdk/identify",
      expect.objectContaining({
        body: JSON.stringify({
          subject_id: "user_123",
          traits: { locale: "en" }
        })
      })
    );
  });
});
