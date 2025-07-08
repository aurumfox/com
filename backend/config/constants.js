// utils/constants.js
const API_VERSIONS = {
    V1: '/api/v1',
};

const ROLES = {
    USER: 'user',
    ADMIN: 'admin',
    DEVELOPER: 'developer',
    PUBLISHER: 'publisher',
    ADVERTISER: 'advertiser',
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

module.exports = {
    API_VERSIONS,
    ROLES,
    ALLOWED_MIME_TYPES,
};
