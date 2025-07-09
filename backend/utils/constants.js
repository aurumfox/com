/**
 * @file This file centralizes various application-wide constants.
 * Using constants improves code readability, maintainability, and reduces the risk
 * of typos compared to hardcoding string literals throughout the application.
 */

/**
 * Defines API version prefixes used in routes.
 * @typedef {object} API_VERSIONS
 * @property {string} V1 - The prefix for API version 1 (e.g., '/api/v1').
 */
const API_VERSIONS = {
    V1: '/api/v1',
};

/**
 * Defines the various user roles within the application.
 * These roles are typically used for authorization checks.
 * @typedef {object} ROLES
 * @property {string} USER - Standard authenticated user.
 * @property {string} ADMIN - Administrator with full access.
 * @property {string} DEVELOPER - Developer role, often with enhanced privileges for testing/managing.
 * @property {string} PUBLISHER - Role for users who can create and manage content/posts.
 * @property {string} ADVERTISER - Role for users who can manage advertisements.
 */
const ROLES = {
    USER: 'user',
    ADMIN: 'admin',
    DEVELOPER: 'developer',
    PUBLISHER: 'publisher',
    ADVERTISER: 'advertiser',
};

/**
 * Defines an array of allowed MIME types for file uploads (e.g., images).
 * This is typically used in Multer configuration or custom file validation.
 * @typedef {Array<string>} ALLOWED_MIME_TYPES
 */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

module.exports = {
    API_VERSIONS,
    ROLES,
    ALLOWED_MIME_TYPES,
};
