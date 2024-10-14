const { mkLogger } = require('../../logger');
const logger = mkLogger('generate:id_token');
const debug = logger.debug
const jose = require("jose");
const uuid = require("uuid");
const getExpiration = require("../custom/get-expiration");
const getUserInfo = require('../../routines/get-user-info');
module.exports = async function (token) {
  const { user_info: ui, user, client } = await getUserInfo(token);
  logger.trace("user info:", ui);
  if (!ui) return null;
  const issuer =
    process.env.OAUTH_JWT_ISSUER || "lou.network";
  const subject = ui.sub;

  const audience = client.id;
  // replay attack prevention / token identification
  const jti = uuid.v4();

  const now = Date.now();
  const nbf = now - 10;
  const iat = now - 20;
  // const exp = now + (1000 * await getExpiration({ client, user, scope, type: 'access' }))
  const exp = await getExpiration({});
  const typ = "JWT";
  const secret = Buffer.from(client.secret_plain);
  const jwt = await new jose.SignJWT(ui)
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
  return jwt;
};
