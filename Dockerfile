FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

# Start server
ENV PORT=3000
CMD ["npm", "run", "start"]
