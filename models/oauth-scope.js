const h = require('./helpers/typed-define')
module.exports = h(
    "OAuthScope",
    /**
     * @type {const}
     */
    ({
        id: {
            type: { name: "STRING", params: [64] },
            allowNull: false,
            primaryKey: true,
        },
        name: {
            type: { name: "STRING", params: [256] },
            allowNull: false
        },
        description: {
            type: { name: "STRING", params: [512] },
            allowNull: true,
        }
    }),

);
