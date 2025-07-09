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

# If you needed dev dependencies for a build step (e.g., transpilation with Babel/TypeScript)
# BEFORE copying source code, you'd do something like:
# RUN npm install
# COPY . .
# RUN npm run build # Your build command
# RUN npm prune --production # Then remove dev dependencies

# Copy app source code to the container
# The .dockerignore file ensures that unnecessary files (like node_modules, .git, .env, logs)
# are not copied into the image, keeping the image lean.
COPY . .

# Expose the port the app runs on
# This informs Docker that the container listens on this port,
# but does not actually publish it to the host. Publishing is done via `docker run -p` or `docker-compose.yml`.
EXPOSE 3000

# Run the app
# CMD defines the default command to run when the container starts.
# It can be overridden when running the container.
# Using the "exec" form (CMD ["executable", "param1", "param2"]) is generally preferred
# as it allows Docker to manage the process directly.
CMD ["npm", "start"]

# --- Additional Considerations / Best Practices ---

# 1. Health Checks (Optional but Recommended for Production)
#    Adds a health check to your Dockerfile. Docker can use this to monitor
#    if your containerized application is actually running and responsive.
#    Replace /health-check-endpoint with an actual endpoint in your app that returns 200 OK.
# HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD curl -f http://localhost:3000/health || exit 1

# 2. User (Security - Recommended for Production)
#    Running as root inside the container is a security risk. Create a non-root user.
#    This requires changing file permissions if your app writes anywhere.
#    Example:
#    RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
#    USER appuser
#    # You'd also need to ensure /app and any necessary subdirectories have permissions
#    # for 'appuser' to read/write.

# 3. Environment Variables for Build-Time (if applicable)
#    If you have build-time variables (e.g., API keys for build tools), use ARG.
#    ARG MY_BUILD_VAR
#    ENV MY_RUNTIME_VAR=${MY_BUILD_VAR} # Set as runtime env if needed

# 4. Multi-Stage Builds (For more complex scenarios or smaller images)
#    If you have a build step (e.g., TypeScript compilation) that requires dev dependencies
#    but you want a very small final image, you'd use a multi-stage build:
#
#    # Stage 1: Build dependencies and app
#    FROM node:18-alpine as builder
#    WORKDIR /app
#    COPY package*.json ./
#    RUN npm install # Install all dependencies for build
#    COPY . .
#    RUN npm run build # Assuming you have a build script
#
#    # Stage 2: Production runtime
#    FROM node:18-alpine
#    WORKDIR /app
#    COPY --from=builder /app/package*.json ./ # Copy only package.json for production dependencies
#    RUN npm install --production # Install only production dependencies
#    COPY --from=builder /app/build ./build # Copy only built artifacts
#    # OR if you copy the whole /app folder in stage 1, copy specific necessary files/folders
#    COPY --from=builder /app/src ./src # Example, copy specific folders not just build
#    COPY --from=builder /app/dist ./dist
#    # And ensure other config files are copied like .env.production, etc. but not the sensitive values
#    EXPOSE 3000
#    CMD ["npm", "start"] # Or CMD ["node", "dist/server.js"] if transpiled
