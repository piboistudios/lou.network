/**
 * Compute a custom expiration time in seconds for a user
 */
module.exports = async ({ user, client, scope, type }) => {
  // return 300;
  // JOSE uses this notation
  return "1h";
};
