const express = require('express');
const router = express.Router();
const OAuth = require('@node-oauth/express-oauth-server');
const oauthClient = require('../models/oauth-client');
const oauthScope = require('../models/oauth-scope');
const { mkLogger } = require('../logger');
const account = require('../models/account');
const oauthToken = require('../models/oauth-token');
const createHttpError = require('http-errors');
const logger = mkLogger('oauth');
/**
 * @type {import('@node-oauth/express-oauth-server')}
 */
const oauth = new OAuth({
  model: require('../oauth2'),
  useErrorHandler: true,
  requireClientAuthentication: { password: false, authorization_code: false },
  allowBearerTokensInQueryString: true
});
/* GET home page. */
router.get("/authorize", async (req, res, next) => {
  logger.trace("query:", req.query);
  if (!req.query.client_id) return next(createHttpError(400, "`client_id` required"));
  if (req.session.user) {
    if (!req.session.user?.authorized?.includes?.(req.query.client_id)) {
      /**
       * @todo get client info
       */
      const client = await oauthClient.findByPk(req.query.client_id);
      /**
       * @todo get scope details
       */
      const scope = await Promise.all(req.query.scope.split(' ').map(async s => (await oauthScope.findByPk(s)) || { id: s, name: s }));
      logger.trace({ client, scope });
      return res.render("authorize", {
        client,
        scope,
      });
    }
    return oauth.authorize({
      allowEmptyState: true,
      authenticateHandler: {
        /**@type {import('@types/express').Handler} */
        handle(req, res) {
          return req.session.user;
        }
      }
    })(req, res, next);
  }
  return res.redirect("/auth/login?r=" + encodeURIComponent(req.originalUrl))
});
router.post("/authorize", async (req, res, next) => {
  const u = await account.findByPk(req.session?.user?.id)
  if (!u) {
    return res.redirect(req.originalUrl);
  }
  if (!u.authorized) {
    u.authorized = [];
  }
  !u.authorized.includes(req.query.client_id) && u.authorized.push(req.query.client_id);
  await u.save();
  req.session.user = u;
  return res.redirect(req.originalUrl);
})
router.use('/token', oauth.token());
router.post("/introspect", async (req, res, next) => {
  const token = await oauthToken.findOne({
    where: {
      data: req.body.token
    },

  });
  if (!token) return next(createHttpError(404, "Token not found"))
  const user = await account.findByPk(token.user);
  const client = await oauthClient.findByPk(token.client);
  logger.trace("Token found:", token);
  res.status(200).json({
    active: true,
    username: token.scope.includes('openid') && user.username,
    email: token.scope.includes('email') && user.email,
    

    // token,
    // user,
    // client
  })
})
router.get("/userinfo", async (req, res, next) => {
  const header = req.header('authorization');
  let token;
  if(header) {
    const [type, credential] = header.split(' ');
    token = credential;
  }
  else if(req.query.token) {
    token = req.query.token;
  }
  if(!token) {
    return next(createHttpError(401, "`access_token` or Bearer token required."));
  }
  
  const dbo = await oauthToken.findOne({
    where: {
      data: token
    }
  });
  if (!token) return next(createHttpError(401, "Unauthorized"));

  const user = await account.findByPk(dbo.user);
  const client = await oauthClient.findByPk(dbo.client);
  logger.trace("Token found:", token);
  res.status(200).json({
    active: true,
    sub: dbo.scope.includes('openid') && user.id,
    username: user.username,
    email: dbo.scope.includes('email') && user.email,
    ...((dbo.scope.includes('profile') ? user?.meta?.profile : null) || {})
  });
})
module.exports = router; 
