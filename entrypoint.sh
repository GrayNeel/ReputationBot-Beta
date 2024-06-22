#!/bin/sh

# Navigate to the Prisma directory and push the database schema
cd /app/prisma
npx prisma db push

# Navigate back to the app directory
cd /app

# Start the bot application
exec "$@"
