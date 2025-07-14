const jwt = require('jsonwebtoken');
// Предполагаем, что у вас есть файл logger, например, config/logger.js
const logger = require('../config/logger'); 
const ApiError = require('../utils/ApiError'); // Импорт вашего кастомного ApiError
const { ROLES } = require('../config/constants'); // Импорт константы ROLES

/**
 * Middleware для аутентификации JWT (JSON Web Token).
 * Извлекает токен из заголовка Authorization и проверяет его.
 * В случае успеха прикрепляет декодированный пользовательский payload к `req.user`.
 *
 * @param {object} req - Объект запроса Express.
 * @param {object} res - Объект ответа Express.
 * @param {function} next - Функция перехода к следующему middleware Express.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Ожидаемый формат: "Bearer TOKEN"
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        logger.warn('Authentication attempt blocked: No token provided in Authorization header.');
        // Используем ApiError для единообразных ответов об ошибках
        return next(ApiError.unauthorized('Authentication token is required. Please log in.'));
    }

    // КРИТИЧНО: Убедитесь, что JWT_SECRET определен в ваших переменных окружения.
    // Это проверка должна быть выполнена при запуске сервера, но хорошо иметь и здесь.
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) { // Добавлена проверка на минимальную длину секрета
        logger.fatal('Server configuration error: JWT_SECRET environment variable is missing or too short. Aborting authentication.');
        // Это критическая ошибка конфигурации сервера, должна немедленно вызывать тревогу
        return next(ApiError.internal('Server configuration error. Please contact support.'));
    }

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            // Обработка специфических ошибок JWT
            if (err.name === 'TokenExpiredError') {
                logger.warn(`Authentication failed: Token expired for user ${user ? user.id : 'unknown'}.`);
                return next(ApiError.unauthorized('Authentication token has expired. Please log in again.'));
            }
            // Для всех других ошибок верификации (e.g., JsonWebTokenError, NotBeforeError)
            logger.warn(`Authentication failed: Invalid token. Error: ${err.message}`);
            return next(ApiError.forbidden('Invalid authentication token. Access denied.')); 
        }
        
        // Прикрепляем декодированный пользовательский payload к объекту запроса
        // Убедитесь, что payload соответствует вашим ожиданиям (e.g., { userId: '...', username: '...', walletAddress: '...', role: '...' })
        req.user = user; 
        logger.debug(`User authenticated: ${req.user.walletAddress || req.user.username} (Role: ${req.user.role})`);
        next(); // Переходим к следующему middleware или обработчику маршрута
    });
};

/**
 * Middleware для авторизации доступа на основе роли(ей) пользователя.
 * Этот middleware должен использоваться *после* `authenticateToken`.
 *
 * @param {string|string[]} allowedRoles - Одна строка роли (например, 'admin')
 * или массив ролей (например, ['admin', 'publisher']), которым разрешен доступ к маршруту.
 * Используйте константы из объекта `ROLES` (например, `ROLES.ADMIN`).
 * @returns {function} Функция middleware Express.
 */
const authorizeRole = (allowedRoles) => (req, res, next) => {
    // Убедитесь, что req.user заполнен `authenticateToken`
    if (!req.user || !req.user.role) {
        logger.error('Authorization failed: User not authenticated or role missing on token payload. Ensure authenticateToken runs first.');
        // Это указывает на ошибку логического потока или некорректный payload токена
        return next(ApiError.internal('Authentication context missing for authorization check.')); 
    }

    // Преобразуем allowedRoles в массив, если это одна строка, для единообразной обработки
    const rolesToCheck = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // Проверяем, включена ли роль пользователя в список разрешенных ролей
    if (!rolesToCheck.includes(req.user.role)) {
        logger.warn(`Authorization denied for user ${req.user.walletAddress || req.user.username} (Role: ${req.user.role}): Required roles: [${rolesToCheck.join(', ')}].`);
        // Используем ApiError для единообразных ответов об ошибках
        return next(ApiError.forbidden(`Access denied. Requires one of the following roles: ${rolesToCheck.join(', ')}.`));
    }

    logger.debug(`Authorization granted for user ${req.user.walletAddress || req.user.username} (Role: ${req.user.role}) for route requiring [${rolesToCheck.join(', ')}].`);
    next(); // Пользователь авторизован, продолжаем
};

module.exports = {
    authenticateToken,
    authorizeRole
};
