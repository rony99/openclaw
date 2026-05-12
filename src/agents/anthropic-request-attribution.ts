import type { StreamFn } from "@mariozechner/pi-agent-core";
import { resolveProviderEndpoint } from "./provider-attribution.js";
import { mergeTransportHeaders } from "./transport-stream-shared.js";

const SESSION_KEY_HEADER = "x-openclaw-session-key";
const SESSION_ID_HEADER = "x-openclaw-session-id";
const RUN_ID_HEADER = "x-openclaw-run-id";
const OPENCLAW_CODE_SESSION_ID_HEADER = "X-OpenClaw-Code-Session-Id";

type AnthropicRequestAttributionParams = {
  runId?: string;
  sessionId?: string;
  sessionKey?: string;
};

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function isDirectAnthropicEndpoint(model: Parameters<StreamFn>[0]): boolean {
  const endpointClass = resolveProviderEndpoint(
    readNonEmptyString((model as { baseUrl?: unknown }).baseUrl),
  ).endpointClass;
  return endpointClass === "default" || endpointClass === "anthropic-public";
}

function buildAnthropicAttributionHeaders(
  params: AnthropicRequestAttributionParams,
): Record<string, string> | undefined {
  const headers: Record<string, string> = {};
  const sessionKey = readNonEmptyString(params.sessionKey);
  const sessionId = readNonEmptyString(params.sessionId);
  const runId = readNonEmptyString(params.runId);
  if (sessionKey) {
    headers[SESSION_KEY_HEADER] = sessionKey;
  }
  if (sessionId) {
    headers[OPENCLAW_CODE_SESSION_ID_HEADER] = sessionId;
    headers[SESSION_ID_HEADER] = sessionId;
  }
  if (runId) {
    headers[RUN_ID_HEADER] = runId;
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
}

export function createAnthropicRequestAttributionWrapper(
  baseStreamFn: StreamFn,
  params: AnthropicRequestAttributionParams,
): StreamFn {
  const attributionHeaders = buildAnthropicAttributionHeaders(params);
  if (!attributionHeaders) {
    return baseStreamFn;
  }
  return (model, context, options) => {
    if (
      (model as { api?: unknown }).api !== "anthropic-messages" ||
      isDirectAnthropicEndpoint(model)
    ) {
      return baseStreamFn(model, context, options);
    }
    return baseStreamFn(model, context, {
      ...options,
      headers: mergeTransportHeaders(options?.headers, attributionHeaders),
    });
  };
}
