const express = require('express');
const router = express.Router();
const OAuth = require('@node-oauth/express-oauth-server');
const oauthClient = require('../models/oauth-client');
const oauthScope = require('../models/oauth-scope');
const { mkLogger } = require('../logger');
const account = require('../models/account');
const oauthToken = require('../models/oauth-token');
const createHttpError = require('http-errors');
const getUserInfo = require('../routines/get-user-info');
const logger = mkLogger('oauth');
/**
 * @type {import('@node-oauth/express-oauth-server')}
 */
const oauth = new OAuth({
  model: require('../oauth2'),
  useErrorHandler: true,
  requireClientAuthentication: { password: false, authorization_code: false },
  allowBearerTokensInQueryString: true,
  allowExtendedTokenAttributes: true
});
/* GET home page. */
router.get("/:provider?/authorize", async (req, res, next) => {
  logger.trace("query:", req.query);
  logger.trace("session:", req.session);
  req.session.originalUrl = req.originalUrl;
  const user = req.user || await account.findByPk(req.user?.id);
  if (!req.query.client_id) return next(createHttpError(400, "`client_id` required"));
  if (user) {
    if (!user.username) {
      let suggestedUsername = user.meta?.profile?.username;
      if (!suggestedUsername) {
        suggestedUsername = user.email.split('@').shift();
        if (suggestedUsername.length < 6) {
          suggestedUsername = [req.params.provider, suggestedUsername].filter(Boolean).join('-');
        }
      }
      return res.render("enter_username", {
        suggestedUsername
      })
    }
    if (!user?.authorized?.includes?.(req.query.client_id)) {
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
          return user;
        }
      }
    })(req, res, next);
  }
  return res.redirect(
    "/auth" +
    (req.params.provider ?
      '/' + req.params.provider :
      '') + "/login?r=" +
    encodeURIComponent(req.originalUrl)
  )
});
router.post("/update-username", async (req, res, next) => {
  const u = await account.findByPk(req.user?.id);
  if (!u) {
    const to = req.originalUrl;
    logger.trace("no user account found, redirecting back", to);
    return res.redirect(to);
  }
  const username = req.body.username;
  if (!username) {
    return res.render("enter_username", {
      error: "Username required"
    });
  }
  u.username = username;
  await u.save();
  res.redirect(`/oauth/authorize?` + res.locals.querystring);
});
router.post("/:provider?/authorize", async (req, res, next) => {
  const u = await account.findByPk(req.user?.id)
  if (!u) {
    const to = req.originalUrl;
    logger.trace("no user account found, redirecting back", to);
    return res.redirect(to);
  }
  u.authorized ??= [];
  !u.authorized.includes(req.query.client_id) && u.authorized.push(req.query.client_id);
  u.changed('authorized', true);
  await u.save();
  return res.redirect(req.originalUrl);
})
router.use('/token', oauth.token({
  allowExtendedTokenAttributes: true
}));
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
  if (header) {
    const [type, credential] = header.split(' ');
    token = credential;
  }
  else if (req.query.token) {
    token = req.query.token;
  }
  if (!token) {
    return next(createHttpError(401, "`access_token` or Bearer token required."));
  }

  const { user_info: ui } = await getUserInfo(token);
  if (!ui) return next(createHttpError(401, "Unauthorized"));
  res.status(200).json(ui);
})
module.exports = router; 
