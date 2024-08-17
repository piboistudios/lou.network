const express = require('express');
const router = express.Router();
const pug = require('pug');
const { mkLogger } = require('../logger');
const logger = mkLogger('index');
const fs = require('fs');
/* GET home page. */
router.get('/oauth-authorization-server', function (req, res, next) {
  res.status(200)
    .header('content-type', 'application/json')
    .end(fs.readFileSync('./fixtures/oauth-metadata.json', 'utf-8').replace(/%BASE_URL%/gi, process.env.BASE_URL))
});

router.get('/mta-sts.txt', function (req, res, next) {
  res.status(200)
    .header('content-type', 'text/plain')
    .end(fs.readFileSync('./fixtures/mta-sts.txt', 'utf-8').replace(/%BASE_URL%/gi, process.env.BASE_URL))
});


module.exports = router;
