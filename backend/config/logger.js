const winston = require('winston');
require('winston-daily-rotate-file'); // For daily log rotation

const NODE_ENV = process.env.NODE_ENV || 'development';

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }), // Log stack trace for errors
    winston.format.splat(), // Interpolate variables
    winston.format.json() // Use JSON format for logs
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(
        ({ timestamp, level, message, stack }) => {
            if (stack) {
                return `${timestamp} ${level}: ${message}\n${stack}`;
            }
            return `${timestamp} ${level}: ${message}`;
        }
    )
);

const transports = [
    new winston.transports.DailyRotateFile({
        filename: 'logs/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m', // Max size of 20MB per file
        maxFiles: '14d', // Keep logs for 14 days
        level: 'info',
        format: logFormat
    }),
    new winston.transports.DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'error', // Only log errors to this file
        format: logFormat
    })
];

// Add console transport for development environment
if (NODE_ENV === 'development') {
    transports.push(
        new winston.transports.Console({
            level: 'debug', // Show debug logs in development console
            format: consoleFormat
        })
    );
}

const logger = winston.createLogger({
    levels: winston.config.npm.levels, // Use npm logging levels (error, warn, info, http, verbose, debug, silly)
    transports: transports,
    exitOnError: false, // Do not exit on handled exceptions
});

module.exports = logger;
