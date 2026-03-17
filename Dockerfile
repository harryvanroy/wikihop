FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/

RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "packages/server/dist/index.js"]
