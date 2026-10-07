# ⚡ VibeSMS - Autonomous Disposable SMS & OTP Studio
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./

RUN npm ci --only=production --ignore-scripts

COPY . .

EXPOSE 4000

RUN mkdir -p /app/data

CMD ["node", "index.js", "web"]
