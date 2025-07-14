# Use an official Node.js runtime as a parent image
# node:18-alpine is an excellent choice for smaller image sizes and security.
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json and package-lock.json are copied
# This step leverages Docker's layer caching. If only package.json/package-lock.json change,
# this layer and subsequent layers will be rebuilt. If only source code changes,
# this layer is cached and much faster.
COPY package*.json ./

# Install production dependencies.
# Using --production greatly reduces the final image size by excluding dev dependencies.
RUN npm install --production

# If you had a build step (e.g., TypeScript transpilation, webpack bundling)
# that required dev dependencies, it would go here. For example:
# COPY . .
# RUN npm run build # Your build command (e.g., `tsc`)
# RUN npm prune --production # Remove dev dependencies after build

# Copy app source code to the container
# The .dockerignore file ensures that unnecessary files (like node_modules, .git, .env, logs)
# are not copied into the image, keeping the image lean.
COPY . .

# Create the uploads directory and set permissions for a non-root user.
# This ensures that your application can write to /app/uploads.
# We create it here so it's part of the image, then the named volume will mount over it.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# --- Security: Create and use a non-root user (RECOMMENDED FOR PRODUCTION) ---
# Running your application as a non-root user inside the container significantly
# reduces the security risk in case of a vulnerability.
# The 'node' user and group are typically pre-created in official Node.js images.
USER node

# Expose the port the app runs on
# This informs Docker that the container listens on this port,
# but does not actually publish it to the host. Publishing is done via `docker run -p` or `docker-compose.yml`.
EXPOSE 3000

# Run the app
# CMD defines the default command to run when the container starts.
# It can be overridden when running the container.
# Using the "exec" form (CMD ["executable", "param1", "param2"]) is generally preferred
# as it allows Docker to manage the process directly.
# This uses the `npm start` script defined in your package.json, which runs `node server.js`.
CMD ["npm", "start"]

# --- Additional Considerations / Best Practices (already good) ---
# HEALTHCHECK: Already configured in docker-compose.yml, which is generally where it belongs
#              when using compose, as it allows for service dependency health checks.
# MULTI-STAGE BUILDS: If you introduce TypeScript or a build step, uncomment and use the
#                     multi-stage build example for a significantly smaller production image.
