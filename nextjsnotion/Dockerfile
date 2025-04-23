# Production Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Installeer dependencies
COPY nextjs-notionnc/package*.json ./
RUN npm install

# Kopieer de rest van de applicatie
COPY nextjs-notionnc/. .

# Bouw de applicatie
RUN npm run build

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

# Kopieer alleen de benodigde bestanden
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Expose poort 3000
EXPOSE 3000

# Start de production server
CMD ["npm", "start"] 