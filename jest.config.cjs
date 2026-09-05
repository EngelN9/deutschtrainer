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
  // Gitignored worktrees contain duplicate workspace manifests. Keep haste-map scoped to the
  // product workspaces so Windows worktree paths never enter test discovery.
  modulePathIgnorePatterns: ["<rootDir>/work/", "<rootDir>/.claude/worktrees/"],
  preset: "ts-jest",
  roots: ["<rootDir>/apps", "<rootDir>/packages"],
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.test.json",
      },
    ],
  },
};
