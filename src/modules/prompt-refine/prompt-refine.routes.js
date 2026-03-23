const express = require('express');

const { refinePrompt } = require('./prompt-refine.controller');

const router = express.Router();

router.post('/refine', refinePrompt);

module.exports = router;
