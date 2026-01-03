# STAGE 1: Builder
# We use a larger image with dev tools to compile TypeScript
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (including typescript/ts-node from devDependencies)
COPY package*.json ./
RUN npm ci

# Copy source code and build
# This runs "tsc", creating the /dist folder
COPY . .
RUN npm run build

# STAGE 2: Runner
# We use a tiny image for the actual server on the Pi
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Since your app has 0 runtime dependencies, we don't need npm install here!
# Just copy the compiled code from the builder stage.
COPY --from=builder /app/dist ./dist

# Expose the port (matches your index.ts default)
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]