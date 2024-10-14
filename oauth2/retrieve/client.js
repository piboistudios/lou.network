const { mkLogger } = require('../../logger');
const debug = mkLogger('retrieve:client').debug
const pbkdf2 = require('@phc/pbkdf2');
const OAuthClient = require('../../models/oauth-client');
const invalid_credentials = require('../errors/invalid_credentials');
const { OAuthError } = require('@node-oauth/oauth2-server');
/**
 * 
 * @param {*} clientId 
 * @param {*} clientSecret 
 * @returns 
 */
module.exports = async function (clientId, clientSecret) {
    // let userId;
    // const identifierParts = clientId.split('@');
    // if (identifierParts.length > 1) {
    //     const [_clientId, onBehalfOf] = identifierParts.map(decodeURIComponent);
    //     debug({ identifierParts })
    //     clientId = _clientId;
    //     userId = onBehalfOf;
    // }
    clientId = decodeURIComponent(clientId);
    debug("Getting client", { clientId, clientSecret });

    // /**@type {App} */
    // const app = App.inst;
    // const client = await app.clientSource;
    // const oauthClientResponse = await client.getOAuthClient({
    //     filter: `id == '${clientId}'`,
    //     decodeUriStrings: true,
    //     limit: 1
    // });
    const oauthClient = await OAuthClient.findOne({
        where: {
            id: clientId
        }
    });
    debug("Got client", oauthClient);
    if (!oauthClient) invalid_credentials();
    // const { result } = oauthClientResponse.data;
    // const [oauthClient] = result.rows;
    // if (oauthClient) {
    //     const secretVerified = !clientSecret || await pbkdf2.verify(oauthClient.secret, clientSecret);
    //     if (!secretVerified) throw new Error("Unauthorized");
    //     oauthClient.userId = userId;
    //     oauthClient.redirectUris = oauthClient.redirectUris.split(',').map(decodeURIComponent);
    //     oauthClient.grants = oauthClient.grants.split(',');
    //     if (userId && !oauthClient.grants.includes('client_credentials_extended'))
    //         throw new Error("Unauthorized");

    // } else throw new Error("Unauthorized");
    // if (!clientSecret) throw new OAuthError("`client_secret` is required", {
    //     code: 401,
    //     name: "unauthorized",
    //     message: "`client_secret` is required"
    // })
    const verified = !clientSecret || await pbkdf2.verify(oauthClient.secret, clientSecret);
    debug({ oauthClient, verified });
    if (!verified) invalid_credentials();
    Object.defineProperty(oauthClient, 'secret_plain', {
        writable: true,
        value: clientSecret,
    });
    return oauthClient;
}