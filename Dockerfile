FROM alpine:latest

WORKDIR /app

# Install node and npm
RUN apk add --update --no-cache nodejs npm bash

# Install global dependencies
RUN npm install -g typescript ts-node prisma

# Install application dependencies
COPY ./bot/package*.json ./
RUN npm install

# Copy application code
COPY ./bot ./

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Generate Prisma Client
RUN npx prisma generate

# Use the custom entrypoint script
ENTRYPOINT ["/entrypoint.sh"]

# Expose the application port (adjust as needed)
EXPOSE 8081

# Default command to start your bot
CMD ["ts-node", "src/bot_home.ts"]
