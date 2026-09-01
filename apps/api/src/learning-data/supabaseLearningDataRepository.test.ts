import { describe, expect, it } from "@jest/globals";
import { ApiError } from "../errors";
import { SupabaseLearningDataRepository } from "./supabaseLearningDataRepository";

/**
 * Every Supabase query here is a builder chain that is finally awaited. This stub answers any
 * chain shape with one fixed result, so the test does not have to mirror each query.
 */
function stubClientAlwaysFailingWith(error: { code?: string; message: string }): unknown {
  const result = { data: null, error };
  const builder: unknown = new Proxy(function () {} as object, {
    get(_target, property) {
      if (property === "then") {
        return (resolve: (value: unknown) => unknown) => resolve(result);
      }
      return () => builder;
    },
    apply() {
      return builder;
    },
  });
  return builder;
}

function repositoryFailingWith(message: string): SupabaseLearningDataRepository {
  const repository = new SupabaseLearningDataRepository("https://example.test", "service-role-key");
  Object.defineProperty(repository, "client", {
    value: stubClientAlwaysFailingWith({ code: "PGRST000", message }),
    writable: true,
  });
  return repository;
}

describe("SupabaseLearningDataRepository error sanitization", () => {
  // GET /courses is public and unauthenticated. Interpolating the provider's exception text
  // into the ApiError message published it to anyone who called the endpoint while Supabase
  // was unreachable.
  const providerFailure = "TypeError: fetch failed for internal-provider.example";

  it("does not expose the provider failure through the public catalog endpoint", async () => {
    const repository = repositoryFailingWith(providerFailure);

    await expect(repository.listPublishedCatalog()).rejects.toMatchObject({
      code: "DATABASE_ERROR",
      message: "無法載入已發布課程。",
      retryable: true,
      status: 500,
    });
  });

  it("attaches the provider failure as a cause instead of dropping it", async () => {
    const repository = repositoryFailingWith(providerFailure);

    const error = (await repository.listPublishedCatalog().catch((thrown: unknown) => thrown)) as
      ApiError | undefined;

    expect(error).toBeInstanceOf(ApiError);
    expect(error?.message).not.toContain("fetch failed");
    expect(error?.message).not.toContain("internal-provider.example");
    expect(error?.cause).toMatchObject({ message: providerFailure });
  });
});
