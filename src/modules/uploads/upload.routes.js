const express = require('express');

const { uploadImage } = require('./upload.controller');
const { uploadSingleImage } = require('./upload.middleware');

const router = express.Router();

router.post('/', uploadSingleImage, uploadImage);

module.exports = router;
