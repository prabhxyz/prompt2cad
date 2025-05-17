FROM node:20-alpine

WORKDIR /app

# Copy files with package.json first
COPY package.json ./

# Install dependencies
RUN npm install

# Install required packages explicitly
RUN npm install node-fetch@2 axios

# Create directory for data
RUN mkdir -p /app/data

# Copy application code (excluding node_modules)
COPY . .

# Expose port
EXPOSE 8080

# Start the API server
CMD ["node", "src/index.js"] 