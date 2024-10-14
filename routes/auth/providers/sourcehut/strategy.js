const OAuth2Strategy = require('passport-oauth2')
    , util = require('util');
/**
 * @type {import('axios').AxiosStatic}
 */
const axios = require('axios');
function SourceHutStrategy(options, verify) {
    OAuth2Strategy.call(this, {
        ...options,
        authorizationURL: 'https://meta.sr.ht/oauth2/authorize',
        tokenURL: 'https://meta.sr.ht/oauth2/access-token'
    }, verify);
}
util.inherits(SourceHutStrategy, OAuth2Strategy);

SourceHutStrategy.prototype.userProfile = function (accessToken, done) {
    axios.get("https://git.sr.ht/api/user", {
        headers: {
            "Authorization": "token " + accessToken
        }
    })
        .then(res => {
            done(null, res.data);
        })
        .catch(e => {
            done(e);
        })
}

module.exports = SourceHutStrategy;