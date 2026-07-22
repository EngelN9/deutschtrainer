FROM node:24-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts/setup-husky.cjs scripts/setup-husky.cjs
COPY apps/admin/package.json apps/admin/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/ai-prompts/package.json packages/ai-prompts/package.json
COPY packages/ai-schemas/package.json packages/ai-schemas/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/grading/package.json packages/grading/package.json
COPY packages/learning-engine/package.json packages/learning-engine/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/validation/package.json packages/validation/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @deutschtrainer/api build

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV APP_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787
WORKDIR /app

COPY --from=build --chown=node:node /workspace/apps/api/dist/server.mjs ./server.mjs
COPY --from=build --chown=node:node /workspace/apps/api/dist/server.mjs.map ./server.mjs.map

USER node
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "server.mjs"]
