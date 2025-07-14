// backend/graphql/index.js (This file remains mostly the same)
const { buildSchema } = require('graphql');
const { schemaString } = require('./schema'); // Your GraphQL schema SDL
const { rootResolver } = require('./resolvers'); // Your root resolver map

// Build schema from string (Schema Definition Language - SDL)
const schema = buildSchema(schemaString);

// Root resolver combines all query and mutation resolvers
const rootValue = rootResolver;

module.exports = { schema, rootValue };


// backend/app.js (Where you would typically set up your GraphQL endpoint)
const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { schema, rootValue } = require('./graphql'); // Your GraphQL setup
const logger = require('./config/logger'); // Your logger
const ApiError = require('./utils/ApiError'); // Your custom error class

// ... other middleware imports (security, auth, di, error)

const app = express();

// ... apply security headers, json parser, diMiddleware, etc.

// Example of how to integrate GraphQL endpoint
app.use(
    '/graphql',
    graphqlHTTP(async (req, res, graphQLParams) => { // graphQLParams contains query, variables, operationName
        // Context object: This is where you pass essential data to your resolvers.
        // req.user will be populated by your authenticateToken middleware.
        // req.container will be populated by your diMiddleware.
        const context = {
            req, // Full request object, useful for headers, auth, etc.
            user: req.user, // Authenticated user data
            container: req.container, // DI container for services/repositories
            // You can add more here, e.g., database instances if not using DI
        };

        return {
            schema: schema,
            rootValue: rootValue,
            context: context, // Pass the context to all resolvers
            graphiql: process.env.NODE_ENV === 'development', // Enable GraphiQL UI in development
            formatError: (error) => {
                // Custom error formatting for client responses
                logger.error('GraphQL Error:', error.message, error.stack, error.extensions);
                // Check if it's an ApiError you explicitly threw from a resolver
                if (error.originalError instanceof ApiError) {
                    return {
                        message: error.originalError.message,
                        statusCode: error.originalError.statusCode,
                        details: error.originalError.details,
                        // Only expose stack in development
                        stack: process.env.NODE_ENV === 'development' ? error.originalError.stack : undefined,
                        // Any custom extensions for client-side handling
                        extensions: error.originalError.extensions || { code: 'CUSTOM_ERROR' },
                    };
                }
                // Default error handling for unhandled errors
                return {
                    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error',
                    statusCode: 500,
                    // If you want to categorize generic GraphQL errors
                    extensions: { code: error.extensions && error.extensions.code || 'INTERNAL_SERVER_ERROR' },
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                };
            },
            // Optional: validationRules, fieldResolver, etc.
        };
    })
);

// ... apply error middleware (notFound, errorHandler)
