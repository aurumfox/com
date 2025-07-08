// middleware/diMiddleware.js
const diMiddleware = (container) => (req, res, next) => {
    // Attach the container to the request object
    req.container = container;
    next();
};

module.exports = diMiddleware;
