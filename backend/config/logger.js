const winston = require('winston');
require('winston-daily-rotate-file');

const NODE_ENV = process.env.NODE_ENV || 'development';

// Define custom log levels if needed, or stick to npm levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'grey'
};

winston.addColors(colors);

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    // NEW: Use json format for production for easier parsing by log aggregators
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.printf(
        ({ timestamp, level, message, stack }) => {
            if (stack) {
                return `${timestamp} [${level}] ${message}\n${stack}`;
            }
            return `${timestamp} [${level}] ${message}`;
        }
    )
);

const transports = [
    new winston.transports.DailyRotateFile({
        filename: 'logs/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info', // Log info and above to this file
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

if (NODE_ENV === 'development') {
    transports.push(
        new winston.transports.Console({
            level: 'debug',
            format: consoleFormat
        })
    );
}

const logger = winston.createLogger({
    levels: levels, // Use custom levels
    transports: transports,
    exitOnError: false,
});

module.exports = logger;
