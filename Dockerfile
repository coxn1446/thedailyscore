# Minimal production image for Cloud Run
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

RUN npm prune --omit=dev && rm -rf src node_modules/.cache

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "serverIndex.js"]
