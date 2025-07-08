# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json and package-lock.json are copied
COPY package*.json ./

# Install dependencies, including dev dependencies for testing if needed, then prune
RUN npm install --production
# If you need dev dependencies for building/testing inside the container, use:
# RUN npm install
# RUN npm prune --production

# Copy app source code to the container
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Run the app
CMD ["npm", "start"]
