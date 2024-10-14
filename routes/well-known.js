const express = require('express');
const router = express.Router();
const pug = require('pug');
const { mkLogger } = require('../logger');
const logger = mkLogger('well-known');
const fs = require('fs');
const sendMeta = function (req, res, next) {
  res.status(200)
    .header('content-type', 'application/json')
    .end(fs.readFileSync('./fixtures/oauth-metadata.json', 'utf-8').replace(/%BASE_URL%/gi, process.env.BASE_URL))
}
/* GET home page. */
router.get('/oauth-authorization-server', sendMeta);
router.get('/openid-configuration', sendMeta);

router.get('/mta-sts.txt', function (req, res, next) {
  res.status(200)
    .header('content-type', 'text/plain')
    .end(fs.readFileSync('./fixtures/mta-sts.txt', 'utf-8').replace(/%BASE_URL%/gi, process.env.BASE_URL))
});
const jose = require('jose');
jose.generateKeyPair('RS256')
    .then(async (kp) => {
        const app = require('../app');
        const jwk = await jose.exportJWK(kp.publicKey);
        app.set('keypair', kp);
        app.set('jwk', jwk);
        router.get("/jwks.json", (req,res,next) => {
            res.status(200)
                .json({
                    keys: [jwk]
                });
        });
        
    })
    .catch(e => {
      logger.trace("Failed to setup JWK:", e);
    })

module.exports = router;
