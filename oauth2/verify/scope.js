module.exports = async function (token, scope) {
    if (!token.scope) {
        return false;
    }
    let requestedScopes = scope //scope.split(' ');
    let authorizedScopes = token.scope //token.scope.split(' ');
    return requestedScopes.every(s => authorizedScopes.indexOf(s) >= 0);
}