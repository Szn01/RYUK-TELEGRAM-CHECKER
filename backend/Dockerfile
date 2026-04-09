# Use Node.js 20 Alpine as base
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables (defaults)
ENV PORT=3000
ENV NODE_ENV=production

# Command to run the application
CMD ["npm", "start"]
