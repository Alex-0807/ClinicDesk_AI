FROM node:22-slim

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

EXPOSE 3002

# Dev mode
CMD ["npx", "next", "dev", "--port", "3002"]
