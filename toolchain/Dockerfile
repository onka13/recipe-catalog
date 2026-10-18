# Toolchain image: the tools the catalog's stacks need, and nothing else. The check (FORMAT.md 7.3) builds and tests
# items in it; a product that runs these items in its own sandbox can build FROM this image to get the same versions.
FROM ubuntu:22.04

ARG NODE_MAJOR=20
ARG FLUTTER_VERSION=3.47.7

ENV DEBIAN_FRONTEND=noninteractive
ENV FLUTTER_HOME=/opt/flutter
ENV PATH="${FLUTTER_HOME}/bin:${PATH}"

RUN apt-get update && apt-get install -y --no-install-recommends \
      bash curl git unzip xz-utils zip libglu1-mesa ca-certificates jq python3 build-essential \
    && curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Flutter at a fixed release tag, so the same image always analyzes and tests the same way.
RUN git clone --depth 1 -b "${FLUTTER_VERSION}" https://github.com/flutter/flutter.git "${FLUTTER_HOME}" \
    && git config --global --add safe.directory "${FLUTTER_HOME}" \
    && git config --global --add safe.directory '*' \
    && flutter config --no-analytics \
    && flutter precache --universal \
    && flutter --version

WORKDIR /work
