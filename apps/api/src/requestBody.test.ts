import { describe, expect, it } from "@jest/globals";
import type { IncomingMessage } from "node:http";
import { PassThrough } from "node:stream";
import { readRequestBody, RequestBodyTooLargeError } from "./requestBody";

function createRequest(): PassThrough & IncomingMessage {
  return new PassThrough() as PassThrough & IncomingMessage;
}

describe("readRequestBody", () => {
  it("returns a request body within the configured limit", async () => {
    const request = createRequest();
    const result = readRequestBody(request, 8);

    request.end("class");

    await expect(result).resolves.toEqual(Buffer.from("class"));
  });

  it("rejects a streaming request as soon as it exceeds the configured limit", async () => {
    const request = createRequest();
    const result = readRequestBody(request, 4);

    request.write("class");
    request.end("room");

    await expect(result).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });
});
