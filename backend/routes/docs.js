const express = require('express');
const router = express.Router();

// Import Swagger UI and the generated Swagger/OpenAPI specification from your config.
// 'swaggerUi' provides the middleware to serve the UI assets.
// 'swaggerDocument' is your actual API definition (JSON/YAML).
// 'swaggerOptions' allows for customization of the Swagger UI.
const { swaggerUi, swaggerDocument, swaggerOptions } = require('../config/swagger');

// --- API Documentation Route ---

// This route serves the Swagger UI.
// When a GET request comes to the base path (e.g., '/api-docs' if mounted there),
// 'swaggerUi.serve' prepares the necessary static assets, and
// 'swaggerUi.setup' initializes the UI using your 'swaggerDocument' and 'swaggerOptions'.
router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

module.exports = router;
