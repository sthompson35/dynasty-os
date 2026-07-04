FROM node:22-slim
# Prisma's query engine needs OpenSSL to detect the correct engine binary —
# without it, Prisma silently falls back to a guessed version (see the
# "Prisma failed to detect the libssl/openssl version" warning).
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY frontend /app
EXPOSE 3000
# `prisma generate` runs at container start, not just at image build: this
# container bind-mounts ./frontend over /app for live dev, so schema.prisma
# can change without a rebuild — regenerating on every start keeps the
# client in node_modules (a separate named volume, not bind-mounted) in sync
# with whatever schema is currently mounted. Without this, editing
# schema.prisma on the host silently leaves the container's Prisma Client
# stale until someone manually re-runs `prisma generate` inside it.
CMD ["sh", "-c", "npx prisma generate && npm run dev"]
