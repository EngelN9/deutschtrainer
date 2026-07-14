import { apiErrorResponseSchema } from "@deutschtrainer/validation";
import { mobileEnv } from "./env";
import { supabase } from "./supabase";

interface ApiSchema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
}

interface ApiRequestOptions {
  authenticated?: boolean;
  body?: unknown;
  fallbackMessage: string;
  method?: "DELETE" | "GET" | "POST";
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
      throw new Error("登入狀態已失效，請重新登入。");
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
    throw new Error("無法連線至學習服務，請檢查網路後重試。");
  }

  const payload = await readJson(response);
  if (!response.ok) {
    const parsedError = apiErrorResponseSchema.safeParse(payload);
    throw new Error(parsedError.success ? parsedError.data.error.message : options.fallbackMessage);
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(options.fallbackMessage);
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
