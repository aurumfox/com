const multer = require('multer');
const path = require('path');
const logger = require('../config/logger');
const { ALLOWED_MIME_TYPES } = require('../config/constants'); // Import constants

const uploadDir = 'uploads/'; // Defined here for consistency

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            logger.warn(`File upload attempt blocked: Invalid file type '${file.mimetype}' for file '${file.originalname}'.`);
            cb(new Error(`Invalid file type. Only ${ALLOWED_MIME_TYPES.join(', ')} files are allowed.`));
        }
    }
});

module.exports = upload;
