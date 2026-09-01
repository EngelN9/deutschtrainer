/** @type {import('jest').Config} */
module.exports = {
  clearMocks: true,
  moduleNameMapper: {
    "^@deutschtrainer/ai-prompts$": "<rootDir>/packages/ai-prompts/src/index.ts",
    "^@deutschtrainer/ai-schemas$": "<rootDir>/packages/ai-schemas/src/index.ts",
    "^@deutschtrainer/grading$": "<rootDir>/packages/grading/src/index.ts",
    "^@deutschtrainer/learning-engine$": "<rootDir>/packages/learning-engine/src/index.ts",
    "^@deutschtrainer/shared-types$": "<rootDir>/packages/shared-types/src/index.ts",
    "^@deutschtrainer/ui$": "<rootDir>/packages/ui/src/index.ts",
    "^@deutschtrainer/validation$": "<rootDir>/packages/validation/src/index.ts",
  },
  // `work/` holds gitignored git worktrees of other branches. testMatch already skips them, but
  // jest-haste-map still indexes their package.json files and then refuses to resolve
  // @deutschtrainer/* because several packages claim the same name.
  modulePathIgnorePatterns: ["<rootDir>/work/"],
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/apps/admin/src/**/*.test.ts",
    "<rootDir>/apps/api/**/*.test.ts",
    "<rootDir>/apps/classroom/src/**/*.test.ts",
    "<rootDir>/apps/mobile/src/**/*.test.ts",
    "<rootDir>/packages/**/*.test.ts",
  ],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.test.json",
      },
    ],
  },
};
