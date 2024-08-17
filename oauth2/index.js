const debug = require('debug')('oauth2')
const generateAccessToken = require('./generate/access-token');
const generateRefreshToken = require('./generate/refresh-token');
const generateAuthorizationCode = require('./generate/authorization-code');
const getAccessToken = require('./retrieve/access-token');
const getRefreshToken = require('./retrieve/refresh-token');
const getAuthorizationCode = require('./retrieve/authorization-code');
const getClient = require('./retrieve/client');
const getUser = require('./retrieve/user');
const getUserFromClient = require('./retrieve/user/from-client');
const saveToken = require('./save/access-token');
const saveAuthorizationCode = require('./save/authorization-code');
const revokeToken = require('./revoke/refresh-token');
const revokeAuthorizationCode = require('./revoke/authorization-code');
const validateScope = require('./validate/scope');
const verifyScope = require('./verify/scope');
const mkToken = require('./generate/token');
const validateRedirectUri = require('./validate/redirect-uri')
const result = Object.fromEntries(Object.entries({
    generateAccessToken: mkToken('access'),
    generateRefreshToken: mkToken('refresh'),
    getAccessToken,
    getAuthorizationCode,
    saveAuthorizationCode,
    revokeAuthorizationCode,
    saveToken,
    verifyScope,
    validateScope,
    revokeToken,
    getUser,
    getUserFromClient,
    getClient,
    getRefreshToken,
    validateRedirectUri
}).map(([key, value]) => [key, (...args) => {
    debug("Calling", key);
    return value(...args);
}]));
debug('' + result.generateAccessToken);
module.exports = result;