const express = require('express');
const router = express.Router();
const passport = require('passport');
const OidcStrategy = require('passport-openidconnect');
const Account = require('../../../models/account');
const { mkLogger } = require('bizi-irc/logger');
const logger = mkLogger('auth:providers:google');
passport.use('linkedin',new OidcStrategy({
    issuer: 'https://www.linkedin.com/oauth',
    authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfoURL: 'https://api.linkedin.com/v2/userinfo',
    scope: ['openid','profile','email'],
    clientID: process.env['LINKEDIN_CLIENT_ID'],
    clientSecret: process.env['LINKEDIN_CLIENT_SECRET'],
    skipUserProfile: false,
    callbackURL: process.env['BASE_URL'] + '/auth/linkedin/redirect',
    passReqToCallback: true,
    state: true,
},
    /**
     * 
     *   profile = {
          provider: 'okta-social',
          name: {
          fullName:   'John Smith',
          familyName: 'Smith',
          givenName:  'John'
          },
          emails: [{value: 'john.smith@example.com'}],
          _raw: '\{...\}'
          _json: {...}
      }
     * @param {import('express').Request} req
     * @param {*} accessToken 
     * @param {*} refreshToken 
     * @param {*} profile 
     * @param {*} done 
     */
    async function (
        req, 
        issuer, 
        profile, 
        idProfile, 
        context, 
        idToken, 
        accessToken, 
        refreshToken, 
        params, 
        verified
    ) {
        logger.trace('verify args:', ...arguments);
        // verified(new Error('not implemented'));
        const topLevelEmailVerified = profile._json?.email_verified;
        const email = profile.emails.find(e => topLevelEmailVerified || e.verified === true)?.value;
        if (!email) return verified(new Error('No valid emails found.'), null);
        let account = await Account.findOne({
            where: {
                email
            }
        });
        if (!account) {
            account = new Account({
                email,
                meta: {
                    creationMethod: 'passport',
                    creationInfo: {
                        provider: 'linkedin',
                        profile,
                    },
                    profile,
                }
            });
            await account.save();
        }
        verified(null, account);
    })
);

router.get('/login', (req, res, next) => {
    logger.trace('logging in...');
    req.session.query = { ...req.query };
    passport.authenticate('linkedin')(req, res, next);
});
router.get('/redirect',
    passport.authenticate('linkedin', {
        keepSessionInfo: true,
        failWithError: true,
        failureRedirect: '/auth/linkedin/login-failed',
        failureMessage: true,
        failureFlash: true,
        successFlash: true,
        successMessage: true,
    }),
    function (req, res) {
        const location = req.session?.query?.r || '/';
        logger.trace('redirecting to', location);
        logger.trace('req.session', req.session);
        logger.trace('req.user', req.user);
        logger.trace('req.auth', req.auth);
        if (req.session.query) {
            delete req.session.query;
        }
        req.session.user = req.user;
        res.redirect(location);
    });
const linkedin = router;
module.exports = linkedin;