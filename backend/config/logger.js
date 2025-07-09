/**
 * @file Configures and exports a Winston logger instance for the application.
 * Sets up logging to console in development and to daily rotating files in production,
 * including a separate file for error logs.
 */

const winston = require('winston');
require('winston-daily-rotate-file'); // Required for daily file rotation

// Environment variable check for log level and file paths
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug'); // Default level based on environment
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || 'logs/application'; // Base path for general logs
const ERROR_LOG_FILE_PATH = process.env.ERROR_LOG_FILE_PATH || 'logs/error'; // Base path for error logs

// Define custom log levels if needed, or stick to npm levels.
// Using `npm` levels as default is often sufficient and widely understood.
// If your application requires more granular control, these custom levels are fine.
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
};

// Define colors for console output for better readability
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'grey'
};

// Add custom colors to Winston
winston.addColors(colors);

// --- Formats ---

// Format for file transports (JSON for production, easier parsing by log aggregators)
const fileLogFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Timestamp
    winston.format.errors({ stack: true }), // Include stack trace for errors
    winston.format.splat(), // Interpolate %j, %d, etc.
    winston.format.json() // Output as JSON
);

// Format for console transport (human-readable)
const consoleLogFormat = winston.format.combine(
    winston.format.colorize({ all: true }), // Apply colors to level and message
    winston.format.printf(
        ({ timestamp, level, message, stack, ...meta }) => { // Include meta for extra data
            let logMessage = `${timestamp} [${level}] ${message}`;
            if (stack) {
                logMessage += `\n${stack}`;
            }
            // If there's extra metadata, stringify it (e.g., from `logger.info('User action', { userId: '123' })`)
            if (Object.keys(meta).length > 0) {
                logMessage += ` ${JSON.stringify(meta)}`;
            }
            return logMessage;
        }
    )
);

// --- Transports ---
const transports = [
    // Daily rotating file for general logs (info and above)
    new winston.transports.DailyRotateFile({
        filename: `${LOG_FILE_PATH}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true, // Compress old log files
        maxSize: '20m', // Max file size before rotation
        maxFiles: '14d', // Retain logs for 14 days
        level: LOG_LEVEL, // Use configurable log level
        format: fileLogFormat,
        handleExceptions: true // Capture uncaught exceptions to this file
    }),
    // Daily rotating file specifically for errors
    new winston.transports.DailyRotateFile({
        filename: `${ERROR_LOG_FILE_PATH}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d', // Keep error logs longer, maybe 30 days
        level: 'error', // Only log 'error' level messages here
        format: fileLogFormat,
        handleExceptions: true // Crucial: Capture uncaught exceptions to this file
    })
];

// Add console transport only in non-production environments
if (NODE_ENV !== 'production') {
    transports.push(
        new winston.transports.Console({
            level: LOG_LEVEL, // Use configurable log level
            format: consoleLogFormat,
            handleExceptions: true, // Also capture exceptions to console
            silent: process.env.NODE_ENV === 'test' // Silence logs during tests if needed
        })
    );
}

// Create the logger instance
const logger = winston.createLogger({
    levels: levels, // Assign custom levels
    transports: transports,
    exitOnError: false, // Do not exit on handled exceptions, let middleware/process handle it
    // Default format for all transports if not overridden
    format: winston.format.json() // Default to JSON, can be overridden per transport
});

// For unhandled promise rejections (important for async code)
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Optionally, depending on criticality, you might want to exit the process
    // process.exit(1);
});

module.exports = logger;
