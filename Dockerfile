FROM node:20-alpine

WORKDIR /app

# Install dependencies for bcrypt native compilation
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start command (overridden in docker-compose for dev)
CMD ["npm", "run", "dev"]
