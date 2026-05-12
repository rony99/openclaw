import type { StreamFn } from "@mariozechner/pi-agent-core";
import { createAssistantMessageEventStream } from "@mariozechner/pi-ai";
import type { Model } from "@mariozechner/pi-ai";
import { describe, expect, it } from "vitest";
import { createAnthropicRequestAttributionWrapper } from "./anthropic-request-attribution.js";

function captureHeaders(model: Partial<Model<"anthropic-messages">>) {
  const calls: Array<{ headers?: Record<string, string> }> = [];
  const baseStreamFn: StreamFn = (_model, _context, options) => {
    calls.push({ headers: options?.headers });
    return createAssistantMessageEventStream();
  };
  const wrapped = createAnthropicRequestAttributionWrapper(baseStreamFn, {
    runId: "run_123",
    sessionId: "session-runtime-1",
    sessionKey: "agent:demo:main",
  });

  void wrapped(
    {
      api: "anthropic-messages",
      provider: "anthropic",
      id: "claude-sonnet-4-6",
      ...model,
    } as Model<"anthropic-messages">,
    { messages: [] },
    { headers: { "X-Custom": "1" } },
  );

  return calls[0]?.headers;
}

describe("createAnthropicRequestAttributionWrapper", () => {
  it("adds OpenClaw session headers for custom Anthropic-compatible endpoints", () => {
    const headers = captureHeaders({
      baseUrl: "https://gateway.example/v1",
    });

    expect(headers).toEqual({
      "X-Custom": "1",
      "X-OpenClaw-Code-Session-Id": "session-runtime-1",
      "x-openclaw-session-key": "agent:demo:main",
      "x-openclaw-session-id": "session-runtime-1",
      "x-openclaw-run-id": "run_123",
    });
  });

  it("does not add OpenClaw session headers for direct Anthropic endpoints", () => {
    const headers = captureHeaders({
      baseUrl: "https://api.anthropic.com",
    });

    expect(headers).toEqual({ "X-Custom": "1" });
  });

  it("treats the Anthropic default route as direct Anthropic", () => {
    const headers = captureHeaders({});

    expect(headers).toEqual({ "X-Custom": "1" });
  });
});
