const { minimatch } = require('minimatch');
const { mkLogger } = require('../../logger');
const logger = mkLogger('validate:redirect-uri')
module.exports = function (redirectUri, client) {
    const stripped = stripUri(redirectUri);
    return Boolean(client.redirectUris.find(u => {
        const ret = minimatch(stripped, u)
        logger.trace(stripped, "matches", u, "?", ret);
        return ret;
    }));
}
function stripUri(redirectUri) {
    const splitOff = function (u, char) {
        return u.indexOf(char) !== -1 ?
            u.split(char)[0] : u;
    }
    let uriBare = splitOff(redirectUri, '?');
    uriBare = splitOff(uriBare, '#');
    uriBare = uriBare.charAt(uriBare.length - 1) === '/' ? uriBare.slice(0, -1) : uriBare;
    return uriBare;
}