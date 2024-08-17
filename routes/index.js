const express = require('express');
const router = express.Router();
const pug = require('pug');
const { mkLogger } = require('../logger');
const logger = mkLogger('index');
/* GET home page. */
router.get('/', function (req, res, next) {
  return res.redirect('/kiwi');
  // res.render('index', { title: 'Express', session: JSON.stringify(req.session, null, 4) });
});


module.exports = router;
