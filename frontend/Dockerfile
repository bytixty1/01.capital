# !! DEV ONLY — not suitable for production !!
# Uses `npm run dev` (hot-reload server, no optimisation, no security headers).
# For production, build a standalone Next.js image instead:
#   1. Add `output: 'standalone'` to next.config.ts
#   2. RUN npm run build
#   3. CMD ["node", "server.js"] from .next/standalone/

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
