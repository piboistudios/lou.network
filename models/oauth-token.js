const h = require('./helpers/typed-define')

module.exports = h(
  "OAuthToken",    
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
    data: {
      type: { name: "STRING", params: [4096] },
      allowNull: false,
    },
    scope: {
      type: "JSON",
      allowNull: false,
    },
    expiresAt: {
      type: { name: "DATE" },
    },
    type: {
      type: { name: "STRING", params: [16] },
      allowNull: false,
    },
    createdAt: {
      type: { name: "DATE" },
      allowNull: true,
    },
    updatedAt: {
      type: { name: "DATE" },
      allowNull: true,
    },
  }),

);
