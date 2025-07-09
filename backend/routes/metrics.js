const express = require('express');
const router = express.Router();

// Import the Prometheus registry instance.
// This 'register' object is where all your custom metrics (counters, gauges, histograms)
// are stored and managed, ready to be exposed.
const { register } = require('../config/metrics'); 

// --- Prometheus Metrics Endpoint ---

// This route serves your application's metrics in a format that Prometheus can scrape.
// Typically accessed by a Prometheus server at a configured interval (e.g., /metrics).
router.get('/', async (req, res) => {
    // 1. Set the 'Content-Type' header. This is crucial for Prometheus to correctly
    //    interpret the scraped data format (usually 'text/plain; version=0.0.4; charset=utf-8').
    res.set('Content-Type', register.contentType);

    // 2. Retrieve the current metrics from the registry.
    //    `register.metrics()` asynchronously collects all registered metrics
    //    and formats them into the Prometheus text exposition format.
    res.end(await register.metrics());
});

module.exports = router;
