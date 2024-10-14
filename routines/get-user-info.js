const account = require('../models/account');
const oauthToken = require('../models/oauth-token');
const oauthClient = require('../models/oauth-client');
const { mkLogger } = require('../logger');
const logger = mkLogger('get-user-info');
const ID_TYPES = ['string', 'number'];
module.exports = async (token) => {
    logger.trace("getting user info for", token);
    let user, client, authCtx;
    if (token.user) {
        user = token.user;
        if (token.client) {
            client = token.client;
        }
        if (token.ctx) {
            authCtx = token.ctx;
        } else {
            authCtx = {
                scope: [],
            }
        }
    } else {

        authCtx = typeof token === 'string' ? await oauthToken.findOne({
            where: {
                data: token
            }
        }) : token;
        if (!token) return null;

        user = !(authCtx.user instanceof account) ? await account.findByPk(authCtx.user?.id || authCtx.user) : authCtx.user;
        client = ID_TYPES.includes(typeof authCtx.client) ? await oauthClient.findByPk(authCtx.client) : authCtx.client;
    }
    logger.trace("Token found:", token);
    logger.trace("User:", user);
    logger.trace("Client:", client);
    const profile = user?.meta?.profile;
    return {
        user_info: {
            active: true,
            sub: authCtx.scope.includes('openid') && user.id,
            username: user.username,
            email: authCtx.scope.includes('email') && user.email,
            nickname: user.username,
            name: profile?.displayName,
            preferred_username: user.username,
            ...((authCtx.scope.includes('profile') ? user?.meta?.profile : null) || {}),
            ...(user?.meta?.[client?.id] || {}),
            ...(user?.meta?.['http://' + client?.id] || {}),
        },
        user,
        client
    }
}