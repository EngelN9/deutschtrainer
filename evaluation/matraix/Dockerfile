# syntax=docker/dockerfile:1.7
FROM ghcr.io/astral-sh/uv:0.12.3-python3.12-trixie-slim

ARG DT_SOURCE_COMMIT
ARG DT_SOURCE_CLEAN=false
ARG DT_MATRAIX_COMMIT=6439df181996c2a67cac16f3b0089a909c011ada

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates git \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 evaluator

WORKDIR /opt/evaluation
COPY pyproject.toml uv.lock README.md ./
COPY src ./src
COPY data ./data

RUN uv sync --frozen --no-dev --extra live \
    && git clone --filter=blob:none https://github.com/MatrAIx-ai/MatrAIx-Persona-8B.git /opt/matraix \
    && git -C /opt/matraix checkout "${DT_MATRAIX_COMMIT}" \
    && test "$(git -C /opt/matraix rev-parse HEAD)" = "${DT_MATRAIX_COMMIT}" \
    && mkdir -p /runs \
    && chown -R evaluator:evaluator /runs /home/evaluator

COPY reports ./reports

ENV DT_MATRAIX_CONTAINER=1 \
    DT_MATRAIX_COMMIT=${DT_MATRAIX_COMMIT} \
    DT_SOURCE_COMMIT=${DT_SOURCE_COMMIT} \
    DT_SOURCE_CLEAN=${DT_SOURCE_CLEAN} \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /opt/matraix
USER evaluator
ENTRYPOINT ["/opt/evaluation/.venv/bin/dt-matraix"]
CMD ["--help"]
