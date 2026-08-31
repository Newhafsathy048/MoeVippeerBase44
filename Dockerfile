FROM node:20-alpine

# Install dependencies for sharp and ffmpeg
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    vips-dev \
    ffmpeg

# Install pnpm globally (project uses pnpm-lock.yaml)
RUN npm install -g pnpm@9

WORKDIR /app

# Copy package files first (for layer caching)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy app code
COPY . .

# Create directories with proper permissions
# /data is the persistent volume mount point on Railway
RUN mkdir -p /data && chmod 777 /data
RUN mkdir -p /app/auth_info && chmod 777 /app/auth_info
RUN mkdir -p /app/tmp && chmod 777 /app/tmp

# Tell the app to store all persistent data in /data
ENV DATA_DIR=/data

# Expose dashboard port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "src/index.js"]
