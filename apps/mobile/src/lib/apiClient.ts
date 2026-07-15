import { apiErrorResponseSchema, type ApiErrorResponse } from "@deutschtrainer/validation";
import { mobileEnv } from "./env";
import { supabase } from "./supabase";
import {
  markConnectivityOffline,
  markConnectivityOnline,
} from "../features/offline/connectivityStore";

export type ApiClientErrorKind = "auth" | "http" | "invalid_response" | "network";

export class ApiClientError extends Error {
  readonly code?: ApiErrorResponse["error"]["code"];
  readonly kind: ApiClientErrorKind;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    message: string,
    options: {
      code?: ApiErrorResponse["error"]["code"];
      kind: ApiClientErrorKind;
      retryable: boolean;
      status?: number;
    },
  ) {
    super(message);
    this.name = "ApiClientError";
    this.kind = options.kind;
    this.retryable = options.retryable;
    this.code = options.code;
    this.status = options.status;
  }
}

export function isNetworkApiError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError && error.kind === "network";
}

interface ApiSchema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
}

interface ApiRequestOptions {
  authenticated?: boolean;
  body?: unknown;
  fallbackMessage: string;
  method?: "DELETE" | "GET" | "POST" | "PUT";
}

export async function requestApi<T>(
  path: string,
  schema: ApiSchema<T>,
  options: ApiRequestOptions,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.authenticated) {
    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.error || !sessionResult.data.session?.access_token) {
      throw new ApiClientError("登入狀態已失效，請重新登入。", {
        kind: "auth",
        retryable: false,
      });
    }
    headers.authorization = `Bearer ${sessionResult.data.session.access_token}`;
  }
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(`${mobileEnv.apiBaseUrl.replace(/\/$/, "")}${path}`, {
      method: options.method ?? "GET",
      headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch {
    markConnectivityOffline();
    throw new ApiClientError("無法連線至學習服務，請檢查網路後重試。", {
      kind: "network",
      retryable: true,
    });
  }

  markConnectivityOnline();
  const payload = await readJson(response);
  if (!response.ok) {
    const parsedError = apiErrorResponseSchema.safeParse(payload);
    if (parsedError.success) {
      throw new ApiClientError(parsedError.data.error.message, {
        code: parsedError.data.error.code,
        kind: response.status === 401 || response.status === 403 ? "auth" : "http",
        retryable: parsedError.data.error.retryable,
        status: response.status,
      });
    }
    throw new ApiClientError(options.fallbackMessage, {
      kind: "http",
      retryable: response.status >= 500,
      status: response.status,
    });
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiClientError(options.fallbackMessage, {
      kind: "invalid_response",
      retryable: true,
      status: response.status,
    });
  }
  return parsed.data;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}
