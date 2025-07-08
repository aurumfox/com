// config/swagger.js
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Load the OpenAPI (Swagger) YAML file
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));

// Options for Swagger UI (optional)
const swaggerOptions = {
    customCss: '.swagger-ui .topbar { display: none }', // Hide top bar
    customSiteTitle: "Aurum Fox API Documentation",
    swaggerOptions: {
        docExpansion: 'none', // Collapse all sections by default
        filter: true, // Enable filtering of operations
        displayRequestDuration: true, // Display request duration
    }
};

module.exports = {
    swaggerUi,
    swaggerDocument,
    swaggerOptions
};
