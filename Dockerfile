FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

RUN npm install --quiet || true

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]


