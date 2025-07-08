// middleware/securityHeaders.js
const helmet = require('helmet');
const logger = require('../config/logger');

const applySecurityHeaders = (app) => {
    // Content Security Policy (CSP)
    // IMPORTANT: Customize this for your specific frontend and external resources.
    // This is a strict example, you will likely need to relax it for your application.
    app.use(
        helmet.contentSecurityPolicy({
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // 'unsafe-eval' needed for some frameworks, 'unsafe-inline' for inline scripts (should be avoided)
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                imgSrc: ["'self'", "data:", "https://via.placeholder.com", "http://localhost:3000"], // Add your image sources
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                connectSrc: ["'self'", "http://localhost:3000", "ws://localhost:3000"], // Add your API endpoints, WebSockets
                frameSrc: ["'self'"], // For iframes
                objectSrc: ["'none'"], // Disallow <object>, <embed>, <applet>
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'self'"],
                upgradeInsecureRequests: [], // Automatically rewrite HTTP requests to HTTPS
            },
            reportOnly: process.env.NODE_ENV === 'development' // Report violations without blocking in dev
        })
    );
    logger.info('Content Security Policy applied.');

    // Strict-Transport-Security (HSTS)
    // Forces HTTPS for a specified duration. Only enable in production after HTTPS is fully configured.
    if (process.env.NODE_ENV === 'production') {
        app.use(
            helmet.hsts({
                maxAge: 31536000, // 1 year in seconds
                includeSubDomains: true,
                preload: true // Opt-in to browser preload list
            })
        );
        logger.info('HSTS header applied.');
    }

    // X-Frame-Options to prevent clickjacking
    app.use(helmet.frameguard({ action: 'deny' }));
    logger.info('X-Frame-Options applied.');

    // X-Content-Type-Options to prevent MIME-sniffing
    app.use(helmet.noSniff());
    logger.info('X-Content-Type-Options applied.');

    // Referrer-Policy
    app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
    logger.info('Referrer-Policy applied.');

    // X-Permitted-Cross-Domain-Policies
    app.use(helmet.permittedCrossDomainPolicies());
    logger.info('X-Permitted-Cross-Domain-Policies applied.');

    // Expect-CT
    app.use(helmet.expectCt({
        maxAge: 86400, // 24 hours
        enforce: true,
        reportUri: process.env.CSP_REPORT_URI // Optional: URI to send reports to
    }));
    logger.info('Expect-CT header applied.');

    // X-DNS-Prefetch-Control
    app.use(helmet.dnsPrefetchControl({ allow: false }));
    logger.info('X-DNS-Prefetch-Control applied.');
};

module.exports = applySecurityHeaders;
