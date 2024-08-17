const h = require('./helpers/typed-define')
module.exports = h(
    "OAuthCode",
    /**
     * @type {const}
     */
    ({
        id: {
            type: {
                name: "INTEGER",
            },
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        user: {
            type: { name: "INTEGER", },
         
            allowNull: true,
        },
        client: {
            type: { name: "STRING", params: [128] },
            allowNull: true,
          
        },
        code: {
            type: { name: "STRING", params: [64] },
            allowNull: false,
        },
        scope: {
            type: { name: "JSON" },
            allowNull: false,
        }, 
        expiresAt: {
            type: { name: "DATE" },
        },
        redirectUrl: {
            type: { name: "STRING", params: [512] },
            allowNull: false
        },
        createdAt: {
            type: { name: "DATE" },
            allowNull: true
        },
        updatedAt: {
            type: { name: "DATE" },
            allowNull: true
        }
    }),

);
