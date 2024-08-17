
module.exports = function (redirectUri, client) {
    const stripped = stripUri(redirectUri);
    return client.redirectUris.includes(stripped);
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