const genIdTok = require('../generate/id-token');
const { inspect } = require('util');
const moment = require('moment');
const OAuthToken = require('../../models/oauth-token');
const { mkLogger } = require('../../logger');
const logger = mkLogger('oauth:access-token:store')
const debug = logger.debug
module.exports = async function (token, client, user) {
    const tokens = [
        { type: "access", data: token.accessToken, expiresAt: token.accessTokenExpiresAt },
        { type: "refresh", data: token.refreshToken, expiresAt: token.refreshTokenExpiresAt }
    ];
    debug({ token, client, user });
    const now = moment().format("MM/DD/YYYY hh:mm:ss");
    const tokenRecords = tokens
        .filter(token => token.data)
        .map(({ data, expiresAt, type }) => ({
            data,
            expiresAt,
            type,
            scope: token.scope,
            client: client.id,
            user: user.id,
            createdAt: '' + now,
            updatedAt: '' + now
        }));
    debug({ tokenRecords });
    // const result = await apiClient.createOAuthToken({}, tokenRecords);
    const result = await OAuthToken.bulkCreate(tokenRecords);
    debug("Saved token", result);
    token.client = client;
    token.user = user;
    if (client.secret_plain) {

        const idToken = await genIdTok(token);
        logger.trace("Id_token:", idToken);
        token.id_token = idToken;
    }
    return token;
}