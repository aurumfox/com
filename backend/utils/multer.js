const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Node.js File System module for directory creation
const logger = require('../config/logger');
const { ALLOWED_MIME_TYPES } = require('../config/constants'); // Import constants
const ApiError = require('./ApiError'); // Import your custom ApiError class

// Define the upload directory. It's good practice to ensure this directory exists.
const uploadDir = path.join(__dirname, '..', '..', 'uploads'); // Relative to project root
// Or define it in config/index.js if you have a centralized config.

// Ensure the upload directory exists
if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
        logger.info(`Created upload directory: ${uploadDir}`);
    } catch (err) {
        logger.error(`Failed to create upload directory ${uploadDir}:`, err);
        // Depending on your app's criticality, you might want to exit or throw here.
        // For a dApp, this might prevent image uploads, but the app should still function.
    }
}

/**
 * Configures Multer for disk storage.
 * Files are stored on the server's disk.
 */
const storage = multer.diskStorage({
    /**
     * Defines the destination directory for uploaded files.
     * @param {object} req - The Express request object.
     * @param {object} file - The file being uploaded.
     * @param {function} cb - Callback function to set the destination.
     */
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Use the validated and created upload directory
    },
    /**
     * Defines the filename for uploaded files.
     * @param {object} req - The Express request object.
     * @param {object} file - The file being uploaded.
     * @param {function} cb - Callback function to set the filename.
     */
    filename: (req, file, cb) => {
        // Generate a unique filename to prevent collisions and potential path traversal issues.
        // Also sanitize the original filename just in case, though path.extname is generally safe.
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originalExtension = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, originalExtension); // Get filename without extension

        // Construct a safe filename: fieldname-timestamp-random_basename.ext
        cb(null, `${file.fieldname}-${uniqueSuffix}_${encodeURIComponent(baseName).replace(/%/g, '')}${originalExtension}`);
        // `encodeURIComponent` and `replace(/%/g, '')` make the basename URL-safe and remove problematic chars.
        // This helps prevent issues with special characters in filenames.
    }
});

/**
 * Multer instance configuration.
 * - `storage`: Specifies how and where files should be stored.
 * - `limits`: Defines constraints on the uploaded files (e.g., file size).
 * - `fileFilter`: Custom function to control which files are accepted.
 */
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB (10 * 1MB) file size limit, bytes
        files: 5 // Optional: Limit the number of files in a multi-file upload
    },
    /**
     * Custom file filter to validate MIME types.
     * @param {object} req - The Express request object.
     * @param {object} file - The file being uploaded (contains mimetype, originalname, etc.).
     * @param {function} cb - Callback function to indicate acceptance (true) or rejection (false/error).
     */
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true); // Accept the file
        } else {
            logger.warn(`File upload attempt blocked: Invalid file type '${file.mimetype}' for file '${file.originalname}'.`);
            // Reject the file with a custom ApiError for consistent error responses.
            cb(ApiError.badRequest(
                `Invalid file type. Only ${ALLOWED_MIME_TYPES.join(', ')} files are allowed.`,
                [{ field: file.fieldname, message: `Invalid MIME type: ${file.mimetype}` }]
            ));
        }
    }
});

module.exports = upload;
