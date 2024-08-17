const { mkLogger } = require('../../logger');
const debug = mkLogger('retrieve:accesS_token').debug
const moment = require('moment');
const OAuthToken = require('../../models/oauth-token');
module.exports = async function (accessToken) {
    debug("Generating token");
    // /**@type {App} */
    // const app = App.inst;
    // const client = await app.clientSource;
    // const tokenResponse = await client.getOAuthToken({
    //     filter: `type == 'access' && data == '${encodeURIComponent(accessToken)}'`,
    //     decodeUriStrings: true,
    //     limit: 1
    // });
    // const { result } = tokenResponse.data;
    // const [token] = result.rows;
    const token = await OAuthToken.findOne({
        where: {
            type: "access",
            data: enencodeURIComponent(accessToken)
        }
    })
    if (!token) {
        logger.trace("Token not found.", token);
        return null;
    }
    const tokenData = {
        accessToken: token.data,
        accessTokenExpiresAt: moment(token.expiresAt).toDate(),
        scope: token.scope,
        client: {
            id: token.client
        },
        user: {
            id: token.user
        }
    };
    debug("Token", tokenData)
    return tokenData;
}