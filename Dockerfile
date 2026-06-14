FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

# Copy all source files fresh — no cache
COPY . .

RUN npm run build

EXPOSE 3000
ENV PORT=3000
CMD ["npm", "run", "start"]
