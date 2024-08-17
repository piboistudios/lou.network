const { mkLogger } = require('../../logger');
const debug = mkLogger('retrieve:refresh_token').debug
const moment = require('moment');
const OAuthToken = require('../../models/oauth-token');
module.exports = async function (refreshToken) {
    // /**@type {App} */
    // const app = App.inst;
    // const client = await app.clientSource;
    // const tokenResponse = await client.getOAuthToken({
    //     filter: `type == 'refresh' && data == '${encodeURIComponent(refreshToken)}'`,
    //     decodeUriStrings: true,
    //     limit: 1
    // });
    // const { result } = tokenResponse.data;
    // const [token] = result.rows;
    const token = await OAuthToken.findOne({
        where: {
            type: "refresh",
            data: encodeURIComponent(refreshToken)
        }
    })
    return {
        refreshToken: token.data,
        refreshTokenExpiresAt: moment(token.expiresAt).toDate(),
        scope: token.scope,
        client: {
            id: token.client
        },
        user: {
            id: token.user
        }
    };
}