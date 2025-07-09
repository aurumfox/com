/**
 * @file This middleware attaches the Dependency Injection (DI) container
 * to the request object, making services and dependencies available to
 * subsequent middleware and route handlers.
 */

/**
 * Creates a middleware function that injects the DI container into the request object.
 *
 * This allows controllers, services, and other components to access registered
 * dependencies by retrieving them from `req.container`.
 *
 * @param {object} container - The Dependency Injection container instance
 * (e.g., an Awilix container, or a simple object acting as a container).
 * @returns {Function} Express middleware function.
 */
const diMiddleware = (container) => (req, res, next) => {
    // Attach the container to the request object
    req.container = container;
    next(); // Proceed to the next middleware or route handler
};

module.exports = diMiddleware;
