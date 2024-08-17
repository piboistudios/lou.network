const { mkLogger } = require('../../logger');
const debug = mkLogger('generate:refresh_token').debug
const crypto = require('crypto');
const jose = require("jose");
const uuid = require("uuid");
const getExpiration = require("../custom/get-expiration");
const getCustomClaims = require("../custom/get-custom-claims");
module.exports = async function (client, user, scope) {
  debug({ client, user, scope });
  const issuer =
    process.env.OAUTH_JWT_ISSUER || "lou.network";
  const subject = user.id;
  const audience = client.id;
  // replay attack prevention / token identification
  const jti = uuid.v4();

  const now = Date.now();
  const nbf = now - 10;
  const iat = now - 20;
  // const exp = now + (1000 * await getExpiration({ client, user, scope, type: 'access' }))
  const exp = await getExpiration({ client, user, scope, type: "access" });
  const typ = "JWT";
  const secret = Buffer.from(process.env.OAUTH_JWT_SECRET);
  const jwt = await new jose.SignJWT({
    scope,
    // roles: scope.split(" "),
    ...(await getCustomClaims({ client, user, scope, type: "refresh" })),
  })
    .setProtectedHeader({ alg: "HS256", typ })
    .setIssuer(issuer)
    .setSubject(subject)
    .setAudience(audience)
    .setJti(jti)
    // .setNotBefore(nbf)
    .setExpirationTime(exp)
    .setIssuedAt(iat)
    .sign(secret);
  debug("Token", jwt);
  const cipher = crypto.createCipheriv('aes-128-gcm', Buffer.alloc(16).fill(process.env.OAUTH_JWT_SECRET), crypto.randomBytes(12));
  let ciphertext = cipher.update(jwt);
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  return ciphertext.toString('base64url');
};
