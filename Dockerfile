FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Git does not preserve empty directories. Ensure Next public exists even if
# public/.gitkeep was not committed/pushed to GitHub.
RUN mkdir -p public
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Do not COPY /app/public: this app currently has no runtime public assets.
# Add this back later only when public contains real files.
EXPOSE 3000
CMD ["node","server.js"]
