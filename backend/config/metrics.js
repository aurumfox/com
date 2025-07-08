// config/metrics.js
const client = require('prom-client');
const logger = require('./logger');

// Create a Registry to register the metrics
const register = new client.Registry();

// Register a custom counter
const httpRequestCounter = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestCounter);

// Register a custom histogram for request duration
const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] // seconds
});
register.registerMetric(httpRequestDurationMicroseconds);

// Register a gauge for current active users (example)
const activeUsersGauge = new client.Gauge({
    name: 'active_users_current',
    help: 'Current number of active users',
});
register.registerMetric(activeUsersGauge);

// Function to register default metrics (CPU, memory, etc.)
const collectDefaultMetrics = (options) => {
    client.collectDefaultMetrics({ register, ...options });
    logger.info('Prometheus default metrics collected.');
};

// Middleware to track HTTP requests
const metricsMiddleware = (req, res, next) => {
    const end = httpRequestDurationMicroseconds.startTimer();
    res.on('finish', () => {
        httpRequestCounter.inc({
            method: req.method,
            route: req.route ? req.route.path : req.path, // Use req.route.path for parameterized routes
            status_code: res.statusCode,
        });
        end({
            method: req.method,
            route: req.route ? req.route.path : req.path,
            status_code: res.statusCode,
        });
    });
    next();
};

module.exports = {
    register,
    httpRequestCounter,
    httpRequestDurationMicroseconds,
    activeUsersGauge, // Export for external updates
    collectDefaultMetrics,
    metricsMiddleware, // Export the middleware
    registerMetrics: () => {
        // This function is called once at app startup
        logger.info('Prometheus custom metrics registered.');
    }
};
