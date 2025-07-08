// routes/metrics.js
const express = require('express');
const { register } = require('../config/metrics'); // Import the Prometheus registry

const router = express.Router();

router.get('/', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

module.exports = router;
