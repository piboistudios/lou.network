const express = require('express');
const router = express.Router();
const passport = require('passport');
const GithubStrategy = require('passport-github2');
const Account = require('../../../models/account');
const { mkLogger } = require('bizi-irc/logger');
const logger = mkLogger('auth:providers:github');
passport.use(new GithubStrategy({
    clientID: process.env['GITHUB_CLIENT_ID'],
    clientSecret: process.env['GITHUB_CLIENT_SECRET'],
    callbackURL: process.env.BASE_URL + '/auth/github/redirect',
    scope: ['user'],
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
        // const topLevelEmailVerified = profile._json?.email_verified;
        const email = profile.emails[0].value;
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
                        provider: 'github',
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
    passport.authenticate('github')(req, res, next);
});
router.get('/redirect',
    passport.authenticate('github', {
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
const github = router;
module.exports = github;