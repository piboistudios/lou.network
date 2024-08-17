module.exports = async function (client) {
    console.log("User from client");
    return { id: client.user }
}