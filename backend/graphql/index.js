// graphql/index.js
const { buildSchema } = require('graphql');
const { schemaString } = require('./schema');
const { rootResolver } = require('./resolvers');

// Build schema from string
const schema = buildSchema(schemaString);

// Root resolver combines all query and mutation resolvers
const rootValue = rootResolver;

module.exports = { schema, rootValue };
