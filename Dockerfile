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

EXPOSE 3001

CMD ["npm", "run", "dev"]


