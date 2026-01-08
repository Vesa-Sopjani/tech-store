# frontend/tech-store-frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all files
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 5173

# Start the app
CMD ["npm", "run", "dev", "--", "--host"]