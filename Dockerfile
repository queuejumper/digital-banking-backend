FROM node:20-bullseye-slim

WORKDIR /usr/src/app

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Install system deps required by Prisma engines
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Install JS dependencies
RUN npm install

COPY . .

# Build TypeScript for production
RUN npm run build

EXPOSE 3001

# Default to production start; dev overrides via docker-compose command
CMD ["npm", "run", "start"]


