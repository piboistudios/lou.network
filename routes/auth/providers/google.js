const express = require('express');
const router = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const Account = require('../../../models/account');
const { mkLogger } = require('bizi-irc/logger');
const logger = mkLogger('auth:providers:google');
passport.use(new GoogleStrategy({
    clientID: process.env['GOOGLE_CLIENT_ID'],
    clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
    callbackURL: process.env.BASE_URL + '/auth/google/redirect',
    scope: ['profile', 'email'],
    state: true,
    passReqToCallback: true,
},
    async function (
        req,
        accessToken,
        refreshToken,
        params,
        profile,
        verified,
    ) {
        logger.trace('verify args:', ...arguments);
        // verified(new Error('not implemented'));
        const topLevelEmailVerified = profile._json?.email_verified;
        const email = profile.emails.find(e => topLevelEmailVerified || e.verified === true)?.value;
        if (!email) return verified(new Error('No valid emails found.'));
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
                        provider: 'google',
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
    passport.authenticate('google')(req, res, next);
});
router.get('/redirect',
    passport.authenticate('google', {
        keepSessionInfo: true,
        failWithError: true,
        failureRedirect: '/login',
        failureMessage: true
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
const google = router;
module.exports = google;