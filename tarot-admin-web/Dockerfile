# Install deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
# Build
FROM node:20-alpine AS build
WORKDIR /app
ENV NEXT_PUBLIC_BACKEND_URL=/
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app .
EXPOSE 3000
CMD ["npm", "run", "start"]