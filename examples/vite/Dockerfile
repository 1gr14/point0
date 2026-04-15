FROM oven/bun:1

WORKDIR /app

# Copy workspace so local packages are available.
COPY . .

# Install all workspace dependencies from repo root.
RUN bun install

WORKDIR /app/examples/basic

# Build the example with point0.
RUN bun run build

EXPOSE 3000

# Start built server output.
CMD ["bun", "run", "./dist/server/main.js"]
