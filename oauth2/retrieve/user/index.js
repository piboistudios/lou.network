const Account = require("../../../models/account");
const pbkdf2 = require('@phc/pbkdf2');

/**
 * 
 * @param {*} username 
 * @param {*} password  - Should be a hash
 */
module.exports = async function (username, password) {

    // const userResponse = await client.getOAuthUser({
    //     filter: `username == '${encodeURIComponent(username)}' && password == '${encodeURIComponent(password)}'`,
    //     limit: 1,
    //     decodeUriStrings: true
    // });
    // const { result } = userResponse.data;
    // const [oauthUser] = result.rows;
    const oauthUser = await Account.findOne({
        where: {
            username,
            deleted: false
        }
    });
    const verified = await pbkdf2.verify(oauthUser.password, password);
    return verified && oauthUser;
}