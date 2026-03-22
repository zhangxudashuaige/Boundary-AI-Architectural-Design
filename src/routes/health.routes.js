const express = require('express');

const { checkDatabaseConnection } = require('../config/database');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ai-arch-render-backend',
    timestamp: new Date().toISOString()
  });
});

router.get('/db', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseConnection();

    res.status(200).json({
      status: 'ok',
      connected: true,
      database: dbHealth.database,
      latencyMs: dbHealth.latencyMs,
      serverTime: dbHealth.serverTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    req.log.warn({ err: error }, 'Database health check failed');

    res.status(503).json({
      status: 'error',
      connected: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
