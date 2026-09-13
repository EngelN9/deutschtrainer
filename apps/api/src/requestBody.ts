import type { IncomingMessage } from "node:http";

export const MAX_API_REQUEST_BODY_BYTES = 1_048_576;

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the configured limit.");
    this.name = "RequestBodyTooLargeError";
  }
}

export function readRequestBody(
  request: IncomingMessage,
  maximumBytes = MAX_API_REQUEST_BODY_BYTES,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    request.on("data", (chunk: Buffer | string) => {
      if (settled) {
        return;
      }
      const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      totalBytes += buffer.length;
      if (totalBytes > maximumBytes) {
        settled = true;
        request.resume();
        reject(new RequestBodyTooLargeError());
        return;
      }
      chunks.push(buffer);
    });
    request.on("end", () => {
      if (!settled) {
        settled = true;
        resolve(Buffer.concat(chunks));
      }
    });
    request.on("error", (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
  });
}
