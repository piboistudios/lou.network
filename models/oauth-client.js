const h = require('./helpers/typed-define')
module.exports = h(
    "OAuthClient",
    /**
     * @type {const}
     */
    ({
        id: {
            type: { name: "STRING", params: [128] },
            allowNull: false,
            primaryKey: true,
        }, //
        secret: {
            type: { name: "STRING", params: [512] },
            allowNull: false,
        },
        name: {
            type: {name: "STRING"},
            allowNull: true,
        },
        url: {
            type: {name: "STRING"},
            allowNull: true
        },
        company: {
            type: {name: "STRING"},
            allowNull: true
        },
        redirectUris: {
            type: { name: "JSON" },
        },
        grants: {
            type: { name: "JSON" }
        },
        createdAt: {
            type: { name: "DATE" },
        },
        updatedAt: {
            type: { name: "DATE" },
        }
    }),

);
