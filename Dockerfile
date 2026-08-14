FROM node:24-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and configuration to generate client
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy application source code and TypeScript configuration
COPY tsconfig.json ./
COPY src ./src/

EXPOSE 3000

CMD ["node", "--watch", "src/server.ts"]
