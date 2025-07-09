/**
 * @file Prometheus metrics configuration and middleware for the application.
 * Defines custom metrics for HTTP requests and a gauge for active users,
 * and integrates with prom-client for default Node.js process metrics.
 */

const client = require('prom-client');
const logger = require('./logger');

// Create a Registry to register all metrics
// It's good practice to have a single, global registry
const register = new client.Registry();

// Make the default metrics collected into this custom registry
client.collectDefaultMetrics({ register });
logger.info('Prometheus default Node.js metrics configured and collected into custom registry.');

// --- Custom Metrics Definitions ---

// HTTP Request Counter
// Naming convention: <component>_<event>_total
const httpRequestCounter = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests processed by the application',
    labelNames: ['method', 'path', 'status_code'], // Renamed 'route' to 'path' for broader applicability
    registers: [register], // Register with the custom registry
});

// HTTP Request Duration Histogram
// Naming convention: <component>_<operation>_duration_seconds
const httpRequestDurationSeconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds, grouped by method, path, and status code',
    labelNames: ['method', 'path', 'status_code'], // Renamed 'route' to 'path'
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], // seconds
    registers: [register],
});

// Active Users Gauge (example of an application-specific metric)
// Naming convention: <component>_<metric_name>_current
const activeUsersGauge = new client.Gauge({
    name: 'app_active_users_current',
    help: 'Current number of active authenticated users',
    registers: [register],
});

// Example: Database Query Duration Histogram (if you want to track DB performance)
// const dbQueryDurationSeconds = new client.Histogram({
//     name: 'db_query_duration_seconds',
//     help: 'Duration of database queries in seconds',
//     labelNames: ['operation', 'collection'],
//     buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
//     registers: [register],
// });

// Example: Custom Event Counter (e.g., successful NFT mints, failed logins)
// const nftMintsTotal = new client.Counter({
//     name: 'nft_mints_total',
//     help: 'Total number of successful NFT mint operations',
//     registers: [register],
// });
// const loginAttemptsFailedTotal = new client.Counter({
//     name: 'login_attempts_failed_total',
//     help: 'Total number of failed user login attempts',
//     registers: [register],
// });


// --- Middleware to Track HTTP Requests ---
const metricsMiddleware = (req, res, next) => {
    // Start the timer for this request
    const end = httpRequestDurationSeconds.startTimer();

    res.on('finish', () => {
        // Determine the route path more robustly
        // req.route.path is best for defined routes (e.g., /users/:id)
        // req.baseUrl + req.path for sub-routers or non-matched paths
        // Fallback to req.path if route is not found (e.g., 404s, static files)
        const routePath = req.route ? req.route.path : req.path;

        const labels = {
            method: req.method,
            path: routePath,
            status_code: res.statusCode,
        };

        // Increment the counter
        httpRequestCounter.inc(labels);

        // Record the duration
        end(labels);

        logger.debug(`Metrics recorded for ${req.method} ${routePath} - Status: ${res.statusCode}`);
    });

    next();
};

module.exports = {
    register, // Export the registry to expose metrics at /metrics endpoint
    httpRequestCounter,
    httpRequestDurationSeconds,
    activeUsersGauge, // Export for external updates (e.g., from auth events)
    metricsMiddleware, // Export the middleware for use in Express
    // Exporting individual metrics is useful if you want to increment them
    // from other parts of your application based on business logic.
    // E.g., from a user service: metrics.loginAttemptsFailedTotal.inc();
    // No need for a separate 'registerMetrics' function if using registers: [register] directly.
    // It's just a conceptual placeholder now.
    registerMetrics: () => {
        logger.info('Prometheus custom and default metrics initialized.');
        // This function doesn't need to do anything now that `client.collectDefaultMetrics`
        // and `registers: [register]` are used directly on metric creation.
        // It's here as a convention if you prefer an explicit setup call.
    }
};
