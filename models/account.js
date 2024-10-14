const h = require('./helpers/typed-define');
const oauthCode = require('./oauth-code');
const oauthToken = require('./oauth-token');

const model =  h(
    "Account",
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
            autoIncrement: true,
        },

        username: {
            type: {
                name: "STRING",
                params: [32]
            },
            allowNull: true,
            unique: true,
        },
        password: {
            type: {
                name: "STRING",
                params: [512]
            },
            allowNull: true,
        },
        email: {
            type: {
                name: "STRING",
                params: [128]
            }
        },
        createdAt: {
            type: {
                name: "DATE",
            },
        },
        updatedAt: {
            type: {
                name: "DATE",
            },
        },
        deleted: {
            type: {
                name: "BOOLEAN"
            }
        },
        meta: {
            type: {
                name: "JSON"
            }
        },
        authorized: {
            type: {
                name: "JSON"
            }
        },
    }),

);
// model.hasMany(oauthToken, { foreignKey: "user", sourceKey: "id"})
// model.hasMany(oauthCode, { foreignKey: "user", sourceKey: "id"})
// oauthToken.belongsTo(model, { foreignKey: "user", targetKey: "id"})
// oauthCode.belongsTo(model, { foreignKey: "user", targetKey: "id"})
module.exports = model;