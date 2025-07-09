const helmet = require('helmet');
const logger = require('../config/logger');

/**
 * @typedef {object} CSPDirectives
 * @property {string[]} defaultSrc
 * @property {string[]} scriptSrc
 * @property {string[]} styleSrc
 * @property {string[]} imgSrc
 * @property {string[]} fontSrc
 * @property {string[]} connectSrc
 * @property {string[]} frameSrc
 * @property {string[]} objectSrc
 * @property {string[]} baseUri
 * @property {string[]} formAction
 * @property {string[]} frameAncestors
 * @property {string[]} upgradeInsecureRequests
 * // Add other directives as needed
 */

/**
 * Defines the Content Security Policy (CSP) directives.
 * IMPORTANT: You MUST customize these directives based on your dApp's specific needs.
 * Missing a necessary source will block resources, leading to broken functionality.
 * Sources for dApps typically include:
 * - Your own frontend and backend domains.
 * - Solana RPC endpoints (devnet, mainnet-beta, custom).
 * - Wallet adapter origins (e.g., Phantom, Solflare, Ledger Live).
 * - CDN URLs for libraries (e.g., Google Fonts, analytics).
 * - IPFS/Arweave gateways for NFT/asset data.
 * - Any external services your dApp interacts with.
 *
 * It is highly recommended to manage these via environment variables or a dedicated
 * configuration file (`config/csp.js` for example) for different environments.
 */
const getCspDirectives = () => {
    // These values should ideally come from environment variables for production
    // or a more structured config for different environments (dev/prod).
    const self = "'self'";
    const unsafeInline = "'unsafe-inline'"; // Needed for some style/script injections, but a risk. Avoid if possible.
    const unsafeEval = "'unsafe-eval'";     // Needed by some bundlers (e.g., Webpack dev, Vue/React dev builds). Avoid in prod.

    // Common external sources for a dApp
    const googleFonts = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
    const placeholderImages = ['https://via.placeholder.com']; // For development
    const localDevelopment = ['http://localhost:3000', 'ws://localhost:3000', 'http://127.0.0.1:3000', 'ws://127.0.0.1:3000'];

    // Solana RPC endpoints: Add the cluster URLs your dApp connects to
    // e.g., 'https://api.devnet.solana.com', 'https://api.mainnet-beta.solana.com'
    // Consider adding `ws` for WebSocket connections if used.
    const solanaRpcEndpoints = [
        process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', // Use env var if available
        'https://api.mainnet-beta.solana.com',
        'https://api.testnet.solana.com',
        'https://solana-api.projectserum.com', // Example common RPC
        'wss://api.devnet.solana.com', // WebSocket endpoints if needed
        'wss://api.mainnet-beta.solana.com'
    ];

    // Wallet adapter origins (e.g., Phantom, Solflare, WalletConnect)
    // IMPORTANT: Check the exact origins for each wallet adapter you use.
    // This is a crucial security boundary.
    const walletAdapterOrigins = [
        'https://phantom.app',
        'https://solflare.com',
        'https://backpack.app',
        'https://walletconnect.com',
        // Add more wallet origins here
    ];

    // IPFS / Arweave gateways (if you serve NFTs/metadata from decentralized storage)
    // Replace with your preferred gateways or CDN for IPFS/Arweave.
    const ipfsGateways = [
        'https://ipfs.io',
        'https://cloudflare-ipfs.com',
        'https://arweave.net',
        // Add your custom IPFS gateway if applicable
    ];

    return {
        defaultSrc: [self],
        // scriptSrc: Add specific origins for your JS bundles and wallet adapters.
        // Avoid 'unsafe-inline' and 'unsafe-eval' in production if possible.
        scriptSrc: [self, unsafeEval, ...localDevelopment, ...walletAdapterOrigins], // unsafe-eval often needed for dev builds/some frameworks
        styleSrc: [self, unsafeInline, ...googleFonts], // unsafe-inline often needed for CSS-in-JS or similar
        // imgSrc: Allow images from your domain, data URIs, and potentially IPFS/Arweave
        imgSrc: [self, 'data:', ...placeholderImages, ...localDevelopment, ...ipfsGateways], 
        fontSrc: [self, ...googleFonts],
        // connectSrc: Your API backend, Solana RPC, and wallet adapter connections
        connectSrc: [self, ...localDevelopment, ...solanaRpcEndpoints, ...walletAdapterOrigins], 
        frameSrc: [self, ...walletAdapterOrigins], // For wallet connection iframes/popups
        objectSrc: ["'none'"], // Disallow <object>, <embed>, <applet>
        baseUri: [self],
        formAction: [self],
        frameAncestors: [self], // Prevent embedding your site in iframes by others
        upgradeInsecureRequests: [], // Recommend using HTTPS in production anyway
        // Add report-uri or report-to for CSP violation reporting in production
        reportUri: process.env.CSP_REPORT_URI ? [process.env.CSP_REPORT_URI] : [],
    };
};

/**
 * Applies various security headers to the Express application using Helmet.
 * @param {object} app - The Express application instance.
 */
const applySecurityHeaders = (app) => {
    // Helmet default headers - provides a good baseline
    app.use(helmet()); 
    logger.info('Default Helmet security headers applied.');

    // Content Security Policy (CSP) - Custom and critical for dApps
    app.use(
        helmet.contentSecurityPolicy({
            directives: getCspDirectives(),
            // In development, just report violations without blocking.
            // In production, you might switch to `reportOnly: false` after thorough testing.
            reportOnly: process.env.NODE_ENV !== 'production' // Report violations without blocking in dev/test
        })
    );
    logger.info('Content Security Policy applied.');

    // Strict-Transport-Security (HSTS) - Forces HTTPS
    // Only enable in production after HTTPS is fully configured and tested.
    // HSTS preloading is a serious commitment.
    if (process.env.NODE_ENV === 'production') {
        app.use(
            helmet.hsts({
                maxAge: 31536000, // 1 year in seconds
                includeSubDomains: true,
                preload: true // Opt-in to browser preload list (requires submission)
            })
        );
        logger.info('Strict-Transport-Security (HSTS) header applied.');
    } else {
        logger.debug('HSTS not applied (NODE_ENV is not production).');
    }

    // X-Frame-Options: 'DENY' or 'SAMEORIGIN' to prevent clickjacking
    // `DENY` is safer, prevents embedding even by your own domains.
    // If you need to embed your app in an iframe on the same domain, use `SAMEORIGIN`.
    // helmet() already includes frameguard. Explicitly setting if you need `SAMEORIGIN`.
    // app.use(helmet.frameguard({ action: 'deny' })); // Already part of default helmet() with 'DENY'
    logger.debug('X-Frame-Options (Clickjacking protection) configured via Helmet defaults.');

    // X-Content-Type-Options: Prevents browsers from MIME-sniffing a response away from the declared content-type.
    // helmet() already includes noSniff.
    // app.use(helmet.noSniff()); // Already part of default helmet()
    logger.debug('X-Content-Type-Options (MIME-sniffing protection) configured via Helmet defaults.');

    // Referrer-Policy: Controls how much referrer information is included with requests.
    // 'same-origin' is a good balance for privacy and functionality.
    // helmet() already includes referrerPolicy.
    // app.use(helmet.referrerPolicy({ policy: 'same-origin' })); // Already part of default helmet()
    logger.debug('Referrer-Policy configured via Helmet defaults.');

    // X-Permitted-Cross-Domain-Policies: Controls policy files for Flash/PDF.
    // helmet() already includes permittedCrossDomainPolicies.
    // app.use(helmet.permittedCrossDomainPolicies()); // Already part of default helmet()
    logger.debug('X-Permitted-Cross-Domain-Policies configured via Helmet defaults.');

    // Expect-CT: Helps mitigate misissued SSL certificates.
    // Ensure `CSP_REPORT_URI` is set in production if you want reports.
    app.use(helmet.expectCt({
        maxAge: 86400, // 24 hours
        enforce: process.env.NODE_ENV === 'production', // Enforce only in production
        reportUri: process.env.CSP_REPORT_URI // Optional: URI to send reports to
    }));
    logger.info('Expect-CT header applied.');

    // X-DNS-Prefetch-Control: Controls DNS prefetching.
    // Disabling can improve privacy but might slightly impact performance.
    // helmet() already includes dnsPrefetchControl.
    // app.use(helmet.dnsPrefetchControl({ allow: false })); // Already part of default helmet()
    logger.debug('X-DNS-Prefetch-Control configured via Helmet defaults.');

    // Cross-Origin-Opener-Policy (COOP): Isolates your window from potentially malicious pop-ups.
    // 'same-origin' is a good default.
    app.use(helmet.crossOriginOpenerPolicy({ policy: 'same-origin' }));
    logger.info('Cross-Origin-Opener-Policy applied.');

    // Cross-Origin-Resource-Policy (CORP): Prevents other domains from loading your resources.
    // 'same-origin' if resources are only for your domain.
    app.use(helmet.crossOriginResourcePolicy({ policy: 'same-origin' }));
    logger.info('Cross-Origin-Resource-Policy applied.');

    // Cross-Origin-Embedder-Policy (COEP): Prevents embedding of cross-origin resources that don't opt-in.
    // Required for SharedArrayBuffer in some contexts, but can be complex.
    // Use with caution, it can break valid embeds if not configured properly.
    // app.use(helmet.crossOriginEmbedderPolicy());
    // logger.info('Cross-Origin-Embedder-Policy applied (if uncommented).');

    // Add X-Powered-By removal (often done by Express itself or other middleware, but good to be explicit)
    app.disable('x-powered-by');
    logger.info('X-Powered-By header removed.');
};

module.exports = applySecurityHeaders;
