import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import {
  grammarTopicDetailResponseSchema,
  grammarTopicListResponseSchema,
  vocabularyDetailResponseSchema,
  vocabularyListResponseSchema,
} from "@deutschtrainer/validation";

const supabaseUrl = requireEnvironment("SUPABASE_URL");
const serviceRoleKey = requireEnvironment("SUPABASE_SERVICE_ROLE_KEY");
const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:8787";
const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

{
  const vocabularyResponse = await fetch(
    `${apiBaseUrl}/vocabulary?level=B1&query=${encodeURIComponent("租金")}&page=1&pageSize=5`,
  );
  assert.equal(vocabularyResponse.status, 200);
  assert.match(vocabularyResponse.headers.get("cache-control") ?? "", /max-age=60/);
  const vocabulary = vocabularyListResponseSchema.parse(await vocabularyResponse.json());
  assert.equal(vocabulary.total, 1);
  assert.equal(vocabulary.items[0]?.lemma, "die Miete");
  assert.equal(vocabulary.items[0]?.gender, "die");

  const vocabularyDetail = vocabularyDetailResponseSchema.parse(
    await readSuccessfulJson(
      await fetch(`${apiBaseUrl}/vocabulary/${vocabulary.items[0]!.id}`),
      "read vocabulary detail",
    ),
  );
  assert.ok(vocabularyDetail.item.exampleSentences.length > 0);
  assert.ok(vocabularyDetail.item.collocations.includes("Miete zahlen"));
  assert.ok(vocabularyDetail.relatedExercises.some((exercise) => exercise.level === "B1"));

  const grammar = grammarTopicListResponseSchema.parse(
    await readSuccessfulJson(
      await fetch(
        `${apiBaseUrl}/grammar-topics?level=B1&query=${encodeURIComponent("從句")}&pageSize=5`,
      ),
      "search grammar topics",
    ),
  );
  assert.equal(grammar.total, 1);
  assert.equal(grammar.items[0]?.code, "B1.nebensatz");

  const grammarDetail = grammarTopicDetailResponseSchema.parse(
    await readSuccessfulJson(
      await fetch(`${apiBaseUrl}/grammar-topics/${grammar.items[0]!.id}`),
      "read grammar detail",
    ),
  );
  assert.ok(grammarDetail.topic.rules.length > 0);
  assert.ok(grammarDetail.topic.examples.length > 0);
  assert.ok(grammarDetail.topic.commonMistakes.length > 0);
  assert.ok(grammarDetail.relatedExercises.length > 0);

  const firstPage = vocabularyListResponseSchema.parse(
    await readSuccessfulJson(
      await fetch(`${apiBaseUrl}/vocabulary?page=1&pageSize=2`),
      "read first vocabulary page",
    ),
  );
  const secondPage = vocabularyListResponseSchema.parse(
    await readSuccessfulJson(
      await fetch(`${apiBaseUrl}/vocabulary?page=2&pageSize=2`),
      "read second vocabulary page",
    ),
  );
  assert.equal(firstPage.items.length, 2);
  assert.equal(secondPage.items.length, 2);
  assert.notEqual(firstPage.items[0]?.id, secondPage.items[0]?.id);

  const returnedRows = await service
    .from("vocabulary")
    .select("id, status")
    .in(
      "id",
      firstPage.items.map((item) => item.id),
    );
  assertDatabaseSuccess(returnedRows.error, "check returned vocabulary status");
  assert.ok(returnedRows.data);
  assert.equal(returnedRows.data.length, firstPage.items.length);
  assert.ok(returnedRows.data.every((row) => row.status === "published"));

  const returnedGrammar = await service
    .from("grammar_topics")
    .select("id, status")
    .eq("id", grammar.items[0]!.id)
    .single();
  assertDatabaseSuccess(returnedGrammar.error, "check returned grammar status");
  assert.ok(returnedGrammar.data);
  assert.equal(returnedGrammar.data.status, "published");

  const publishedCount = await service
    .from("vocabulary")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");
  assertDatabaseSuccess(publishedCount.error, "count published vocabulary");
  assert.equal(firstPage.total, publishedCount.count);

  const invalidFilter = await fetch(`${apiBaseUrl}/grammar-topics?difficulty=9`);
  assert.equal(invalidFilter.status, 400);
  const missingDetail = await fetch(
    `${apiBaseUrl}/vocabulary/90000000-0000-4000-8000-000000000001`,
  );
  assert.equal(missingDetail.status, 404);

  console.log(
    JSON.stringify(
      {
        vocabularyTotal: firstPage.total,
        vocabularySearch: vocabulary.items[0]?.lemma,
        vocabularyRelatedExercises: vocabularyDetail.relatedExercises.length,
        grammarSearch: grammar.items[0]?.code,
        grammarRules: grammarDetail.topic.rules.length,
        grammarRelatedExercises: grammarDetail.relatedExercises.length,
        publishedOnly: true,
        pagination: true,
        invalidFilterStatus: invalidFilter.status,
        missingDetailStatus: missingDetail.status,
      },
      null,
      2,
    ),
  );
}

async function readSuccessfulJson(response: Response, operation: string): Promise<unknown> {
  const payload = (await response.json()) as unknown;
  assert.equal(response.status, 200, `${operation} failed: ${JSON.stringify(payload)}`);
  return payload;
}

function assertDatabaseSuccess(error: { message: string } | null, operation: string): void {
  assert.equal(error, null, `${operation} failed: ${error?.message}`);
}

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}
