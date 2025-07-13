/**
 * @file Configures Multer for file uploads and provides a middleware for handling them.
 * Includes functions to ensure the upload directory exists.
 * In production, this should be replaced with cloud storage integration (e.g., S3, Arweave, IPFS).
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Use fs.promises directly for async file operations

// IMPORTANT: In production, REMOVE LOCAL STORAGE and integrate with cloud storage!
const uploadDir = 'uploads/'; // Local upload directory

/**
 * Ensures that the local upload directory exists. If not, it creates it recursively.
 * This is crucial for local file storage to prevent errors during uploads.
 * In a production environment using cloud storage, this function would not be needed.
 */
async function ensureUploadDir() {
    try {
        await fs.mkdir(uploadDir, { recursive: true });
        console.log(`Upload directory '${uploadDir}' ensured.`);
    } catch (err) {
        console.error(`Error ensuring upload directory '${uploadDir}':`, err);
        // It's critical that the upload directory exists, so exit if creation fails.
        process.exit(1);
    }
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Set the destination directory for uploaded files
    },
    filename: (req, file, cb) => {
        const originalName = path.parse(file.originalname).name;
        const extension = path.parse(file.originalname).ext;
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Sanitize original name to remove invalid characters and limit length
        const sanitizedOriginalName = originalName.replace(/[^a-zA-Z0-9-_.]/g, '_').substring(0, 50);
        cb(null, `${sanitizedOriginalName}-${uniqueSuffix}${extension}`);
    }
});

// Multer upload middleware configuration
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit (10 * 1024 * 1024 bytes)
    fileFilter: (req, file, cb) => {
        // Define allowed MIME types
        const allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', // Images
            'video/mp4', 'video/webm', 'video/ogg', // Videos
            'application/json', // JSON files (e.g., for NFT metadata)
            'text/html', 'application/javascript' // HTML/JS (e.g., for game files)
        ];

        // Check if the uploaded file's MIME type is in the allowed list
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true); // Accept the file
        } else {
            // Reject the file with an error if its type is not allowed
            cb(new Error(`Invalid file type: ${file.mimetype}. Only images, videos, JSON, HTML, and JS files are allowed.`), false);
        }
    }
});

module.exports = {
    upload,
    ensureUploadDir,
    // It's good practice to export fs.promises here if other modules need to delete/manage files
    // created by this upload module. For instance, in NFT minting error handling.
    fsPromises: fs
};
