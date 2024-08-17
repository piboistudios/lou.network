const debug = require('debug')('oauth:auth-code:store')

const { isMoment } = require('moment');
const { inspect } = require('util')
const moment = require('moment');
const OAuthCode = require('../../models/oauth-code');
module.exports = async function (code, client, user) {
    debug("Creating auth code with:", { user, client });
    const codeDbo = {
        client: client.id,
        user: user.id,
        expiresAt: new Date(Date.now() + (1000 * 60 * 3)),
        redirectUrl: code.redirectUri,
        scope: code.scope,
        code: code.authorizationCode
    }
    const now = moment().format("MM/DD/YYYY hh:mm:ss");
    debug("Creating OAuth Code:", codeDbo);
    // const result = await apiClient.createOAuthCode({}, codeDbo, {
    //     validateStatus: () => true
    // });
    // if (result.status === 200) {
    const result = await OAuthCode.create(codeDbo)
    debug("Saved code", inspect(result));
    return code;
    // } else {
    // debug("ruh-roh", fmtRes(result))
    // throw 'oops';
}
