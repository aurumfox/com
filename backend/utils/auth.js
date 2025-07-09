const jwt = require('jsonwebtoken');

/**
 * @typedef {object} UserPayload
 * @property {string} id - The user's unique identifier (e.g., MongoDB _id).
 * @property {string} role - The user's role (e.g., 'user', 'admin', 'developer').
 * @property {string} walletAddress - The user's Solana wallet address. (Added for dApp context)
 */

/**
 * Generates a JSON Web Token (JWT) for user authentication.
 *
 * @param {UserPayload} payload - The data to be included in the token payload.
 * This should contain essential, non-sensitive user information.
 * @param {string} [expiresIn='1h'] - The token's expiration time (e.g., '1h', '30m', '7d').
 * Short expiration times are recommended for access tokens.
 * @returns {string} The generated JWT string.
 * @throws {Error} If `process.env.JWT_SECRET` is not defined.
 */
const generateToken = (payload, expiresIn = '1h') => {
    // Ensure the secret key is defined in environment variables for security.
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in environment variables. Token generation failed.');
    }

    // You can add more standard JWT claims here for better token management and security:
    const options = {
        expiresIn: expiresIn,
        issuer: 'your-dapp-name', // 'iss' (Issuer) claim: Identifies the principal that issued the JWT.
                                  // Use your dApp's domain or name.
        audience: 'your-frontend-app', // 'aud' (Audience) claim: Identifies the recipients that the JWT is intended for.
                                       // E.g., your frontend application's identifier.
        // algorithm: 'HS256', // 'alg' (Algorithm) claim: Defaults to HS256 with jsonwebtoken.
                               // Explicitly setting it can be good, but generally not needed unless changing.
        // jwtid: crypto.randomUUID(), // 'jti' (JWT ID) claim: Unique identifier for the JWT.
                                    // Useful for token blacklisting/revocation if not using a refresh token strategy.
    };

    // The payload itself can be directly passed from the function argument.
    // For a dApp, `walletAddress` is a crucial identifier.
    const tokenPayload = {
        id: payload.id,             // MongoDB user ID
        role: payload.role,         // User role
        walletAddress: payload.walletAddress, // User's Solana wallet address (CRITICAL for dApps)
        // Add other non-sensitive, essential user data here if needed.
        // NEVER include passwords, sensitive personal info, or large data.
    };

    return jwt.sign(tokenPayload, process.env.JWT_SECRET, options);
};

module.exports = generateToken;
