"use client";

/**
 * Typed client-side API helper.
 *  - Sends the CSRF token (double-submit) on every mutating request.
 *  - Unwraps the `{ data }` envelope and throws rich `ClientApiError`s so
 *    forms can show warm, specific messages.
 */

let csrfToken: string | null = null;

export function setCsrfToken(token: string) {
  csrfToken = token;
}

export class ClientApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface ApiEnvelope<T> {
  data?: T;
  error?: string;
  code?: string;
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (method !== "GET" && csrfToken) headers["x-csrf-token"] = csrfToken;

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // fall through — non-JSON error below
  }

  if (!res.ok) {
    const message =
      payload?.error ??
      (res.status === 429
        ? "You're moving fast — give it a few seconds and try again."
        : "Something went wrong. Please try again.");
    throw new ClientApiError(res.status, message, payload?.code);
  }
  return payload?.data as T;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
  patch: <T>(url: string, body?: unknown) => request<T>("PATCH", url, body),
  del: <T>(url: string) => request<T>("DELETE", url),
};
