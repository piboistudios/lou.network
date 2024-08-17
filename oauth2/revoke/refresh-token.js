const { mkLogger } = require('../../logger');
const debug = mkLogger('revoke:refresh_token').debug
const { inspect } = require('util');
const OAuthToken = require('../../models/oauth-token');
module.exports = async function (token) {
    // /**@type {App} */
    // const app = App.inst;
    // const client = await app.clientSource;
    try {

        // const result = await client.deleteOAuthToken({
        //     filter: `type == 'refresh' && data == '${encodeURIComponent(token.refreshToken)}'`,
        //     decodeUriStrings: true,
        //     limit: 1,
        //     destroy: true
        // });
        const result = await OAuthToken.destroy({
            where: {
                type: 'refresh',
                data: encodeURIComponent(token.refreshToken)
            }
        })
        debug("Deleted token", inspect(result.data.result, true, 100));
        return true;
    } catch (error) {
        return false;
    }
}