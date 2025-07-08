// routes/docs.js
const express = require('express');
const { swaggerUi, swaggerDocument, swaggerOptions } = require('../config/swagger');

const router = express.Router();

// Serve Swagger UI at /api-docs
router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

module.exports = router;
