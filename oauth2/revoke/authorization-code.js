const { mkLogger } = require('../../logger');
const debug = mkLogger('revoke:authorization_code').debug

const { inspect } = require('util');
const OAuthCode = require('../../models/oauth-code');
const authorizationCode = require('../generate/authorization-code');
module.exports = async function (code, client, user) {
    // /**@type {App} */
    // const app = App.inst;
    // const apiClient = await app.clientSource;
    try {

        // const result = await apiClient.deleteOAuthCode({
        //     filter: `code == '${encodeURIComponent(code.authorizationCode)}'`,
        //     decodeUriStrings: true,
        //     limit: 1,
        //     destroy: true
        // });
        const result = await OAuthCode.destroy({
            where: {
                code: encodeURIComponent(code.code)
            }
        })
        debug("Deleted token", inspect(result, true, 100));
        return true;
    } catch (error) {
        debug(error);
        return false;
    }
}