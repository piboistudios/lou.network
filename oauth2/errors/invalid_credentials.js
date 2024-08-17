const { OAuthError } = require('@node-oauth/oauth2-server');

module.exports = () => {
    throw new OAuthError("Invalid client_id or client_secret", {
        code: 401,
        name: "invalid_credentials",
        message: "Invalid client credentials."
    })
}