const { mkLogger } = require('../../logger');
const debug = mkLogger('retrieve:authorization_code').debug
const moment = require('moment');
const OAuthCode = require('../../models/oauth-code');
module.exports = async function (authorizationCode) {
    // /**@type {App} */
    // const app = App.inst;
    // const client = await app.clientSource;
    // const authCodeResponse = await client.getOAuthCode({
    //     filter: `code == "${encodeURIComponent(authorizationCode)}"`,
    //     decodeUriStrings: true,
    //     limit: 1
    // });
    // const { result } = authCodeResponse.data;
    // const [codeDbo] = result.rows;
    const codeDbo = await OAuthCode.findOne({
        where: {
            code: encodeURIComponent(authorizationCode)
        }
    })
    const codeData = {
        code: codeDbo.code,
        expiresAt: moment(codeDbo.expiresAt).toDate(),
        redirectUri: codeDbo.redirectUrl,
        scope: codeDbo.scope,
        client: { id: codeDbo.client },
        user: { id: codeDbo.user }
    };
    debug("Code", codeData);
    return codeData;
}