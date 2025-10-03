// server.js
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Connection, clusterApiUrl, PublicKey, Transaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

// Инициализация соединений
mongoose.connect('mongodb://localhost:27017/nft_marketplace_secure'); // Измените на ваш URI
const solanaConnection = new Connection(
    process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'),
    'confirmed'
);

// Middleware
app.use(express.json());

// --- СХЕМЫ И МОДЕЛИ ---

// Модель Пользователя
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user', enum: ['user', 'admin', 'developer'] },
    walletAddress: { type: String, required: true, unique: true },
});

// Хеширование пароля перед сохранением
UserSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    }
    next();
});

const User = mongoose.model('User', UserSchema);

// Модель NFT
const NftSchema = new mongoose.Schema({
    mintAddress: { type: String, required: true, unique: true },
    ownerAddress: { type: String, required: true },
    price: { type: Number, default: 0 },
    isListed: { type: Boolean, default: false },
    status: { type: String, default: 'available', enum: ['available', 'listed', 'pending_list', 'pending_buy', 'sold', 'failed'] }
});
const Nft = mongoose.model('Nft', NftSchema);


// --- MIDDLEWARE БЕЗОПАСНОСТИ ---

// 1. Аутентификация: Верификация JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ error: 'Требуется токен' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Неверный или просроченный токен' });
        req.user = user;
        next();
    });
};

// 2. Авторизация: Проверка Роли
const authorizeRole = (requiredRole) => (req, res, next) => {
    if (req.user && req.user.role === requiredRole) {
        next();
    } else {
        res.status(403).json({ error: `Доступ запрещен. Требуется роль: ${requiredRole}.` });
    }
};


// --- МАРШРУТЫ АУТЕНТИФИКАЦИИ ---

// БЕЗОПАСНОСТЬ ИСПРАВЛЕНИЕ #1: Публичная регистрация (ТОЛЬКО 'user')
app.post('/api/auth/register', async (req, res, next) => {
    const { username, password, walletAddress } = req.body;

    if (!username || !password || !walletAddress) {
        return res.status(400).json({ error: 'Необходимы имя пользователя, пароль и адрес кошелька.' });
    }

    try {
        const newUser = new User({
            username,
            password,
            walletAddress,
            role: 'user' // ЖЕСТКО ЗАДАНО: ТОЛЬКО Обычный Пользователь
        });
        await newUser.save();
        res.status(201).json({ message: 'Пользователь успешно зарегистрирован с ролью "user".' });
    } catch (error) {
        if (error.code === 11000) {
             return res.status(409).json({ error: 'Пользователь или адрес кошелька уже существует.' });
        }
        next(error);
    }
});

// Логин
app.post('/api/auth/login', async (req, res, next) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Неверное имя пользователя или пароль.' });
        }

        const token = jwt.sign({ 
            id: user._id, 
            username: user.username, 
            role: user.role, 
            walletAddress: user.walletAddress 
        }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ token, role: user.role });
    } catch (error) {
        next(error);
    }
});


// --- МАРШРУТЫ АДМИНИСТРАТОРА (Для безопасного назначения ролей) ---

// БЕЗОПАСНОСТЬ ИСПРАВЛЕНИЕ #1: Защищенный эндпоинт для изменения ролей
app.post('/api/admin/assign-role', authenticateToken, authorizeRole('admin'), async (req, res, next) => {
    const { targetUsername, newRole } = req.body;

    const validRoles = ['user', 'admin', 'developer'];
    if (!validRoles.includes(newRole)) {
        return res.status(400).json({ error: 'Недопустимая роль.' });
    }

    try {
        const user = await User.findOneAndUpdate(
            { username: targetUsername },
            { role: newRole },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден.' });
        }

        res.json({ message: `Роль пользователя ${targetUsername} успешно изменена на ${newRole}.` });
    } catch (error) {
        next(error);
    }
});


// --- МАРШРУТЫ NFT-МАРКЕТПЛЕЙСА (С верификацией Solana) ---

// Хелпер для создания заглушки транзакции (в реальном приложении это будет web3.js)
const createMockTransaction = (owner, price, action) => {
    // В продакшене: Здесь вы создаете реальную НЕПОДПИСАННУЮ транзакцию Solana
    // используя @solana/web3.js, кодируете её в base64 и отправляете клиенту.
    return Buffer.from(JSON.stringify({ owner, price, action, timestamp: Date.now() })).toString('base64');
};

// БЕЗОПАСНОСТЬ ИСПРАВЛЕНИЕ #2: Подготовка к листингу NFT (PREPARE)
app.post('/api/nfts/list', authenticateToken, async (req, res, next) => {
    const { mintAddress, price } = req.body;
    const ownerAddress = req.user.walletAddress;

    try {
        // 1. Предварительная запись: NFT в статусе ожидания
        const nft = await Nft.findOneAndUpdate(
            { mintAddress },
            { ownerAddress, price, isListed: false, status: 'pending_list' },
            { upsert: true, new: true }
        );

        // 2. Создание и возврат неподписанной транзакции
        const serializedTransaction = createMockTransaction(ownerAddress, price, 'list');

        res.status(200).json({
            message: 'Транзакция листинга подготовлена. Подпишите и отправьте.',
            transactionData: serializedTransaction 
        });
    } catch (error) {
        next(error);
    }
});

// БЕЗОПАСНОСТЬ ИСПРАВЛЕНИЕ #2: Подготовка к покупке NFT (PREPARE)
app.post('/api/nfts/buy', authenticateToken, async (req, res, next) => {
    const { mintAddress } = req.body;
    const buyerAddress = req.user.walletAddress;

    try {
        const nft = await Nft.findOne({ mintAddress, isListed: true });
        if (!nft) {
            return res.status(404).json({ error: 'NFT не найден или не выставлен на продажу.' });
        }
        
        // 1. Резервация: NFT в статусе ожидания
        await Nft.updateOne({ mintAddress }, { status: 'pending_buy', tempBuyerAddress: buyerAddress });

        // 2. Создание и возврат неподписанной транзакции
        const serializedTransaction = createMockTransaction(buyerAddress, nft.price, 'buy');

        res.status(200).json({
            message: 'Транзакция покупки подготовлена. Подпишите и отправьте.',
            transactionData: serializedTransaction 
        });
    } catch (error) {
        next(error);
    }
});

// БЕЗОПАСНОСТЬ ИСПРАВЛЕНИЕ #2: Верификация и Финализация (VERIFY)
app.post('/api/nfts/verify-tx', authenticateToken, async (req, res, next) => {
    const { mintAddress, transactionSignature } = req.body; 
    const requestingUserAddress = req.user.walletAddress;

    if (!transactionSignature || !mintAddress) {
        return res.status(400).json({ error: 'Недостаточно данных для верификации.' });
    }

    try {
        // 1. Получаем статус транзакции из блокчейна Solana
        const txStatus = await solanaConnection.getSignatureStatus(transactionSignature);

        if (!txStatus || txStatus.value === null || txStatus.value.err) {
            // Транзакция не подтверждена или содержит ошибку
            await Nft.updateOne({ mintAddress }, { $set: { status: 'failed', tempBuyerAddress: null } });
            return res.status(400).json({ error: 'Транзакция Solana не подтверждена или содержит ошибку.' });
        }

        // 2. Получаем детали транзакции
        const transaction = await solanaConnection.getParsedTransaction(transactionSignature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Детали транзакции не найдены.' });
        }

        // 3. ПРОВЕРКА СОДЕРЖИМОГО ТРАНЗАКЦИИ (КРИТИЧЕСКИЙ ЭТАП)
        // В продакшене: Здесь вы должны тщательно проверить инструкции транзакции
        // (например, Program ID, кому переведен SOL, кому передан NFT)
        
        // Для примера: просто проверяем, что кошелек-инициатор совпадает с текущим пользователем
        const initiator = transaction.transaction.message.accountKeys[0].pubkey.toBase58();
        if (initiator !== requestingUserAddress) {
            await Nft.updateOne({ mintAddress }, { $set: { status: 'failed', tempBuyerAddress: null } });
            return res.status(403).json({ error: 'Инициатор транзакции не соответствует аутентифицированному пользователю.' });
        }

        // 4. ОПРЕДЕЛЕНИЕ ТИПА ДЕЙСТВИЯ И ОБНОВЛЕНИЕ БАЗЫ ДАННЫХ
        const nft = await Nft.findOne({ mintAddress });
        if (!nft) return res.status(404).json({ error: 'NFT не найден.' });

        let updateData = {};
        let successMessage = '';
        
        if (nft.status === 'pending_list') {
            updateData = { isListed: true, status: 'listed' };
            successMessage = 'Листинг NFT успешно подтвержден блокчейном и БД обновлена.';
        } else if (nft.status === 'pending_buy') {
            // Убедитесь, что покупатель совпадает с tempBuyerAddress
            if (nft.tempBuyerAddress !== requestingUserAddress) {
                 await Nft.updateOne({ mintAddress }, { $set: { status: 'failed', tempBuyerAddress: null } });
                 return res.status(403).json({ error: 'Несоответствие адреса покупателя.' });
            }
            updateData = { ownerAddress: nft.tempBuyerAddress, isListed: false, status: 'sold', tempBuyerAddress: null };
            successMessage = 'Покупка NFT успешно подтверждена блокчейном и БД обновлена.';
        } else {
            return res.status(400).json({ error: 'NFT не в статусе ожидания операции.' });
        }

        const updatedNft = await Nft.findOneAndUpdate(
            { mintAddress },
            { $set: updateData },
            { new: true }
        );

        res.json({ message: successMessage, nft: updatedNft });

    } catch (error) {
        console.error('Ошибка верификации транзакции:', error);
        next(error);
    }
});

// Снятие с продажи (Delist) - не требует верификации блокчейна, если не происходит перевода NFT
app.post('/api/nfts/delist', authenticateToken, async (req, res, next) => {
    const { mintAddress } = req.body;
    const ownerAddress = req.user.walletAddress;

    try {
        const nft = await Nft.findOneAndUpdate(
            { mintAddress, ownerAddress },
            { isListed: false, price: 0, status: 'available' },
            { new: true }
        );

        if (!nft) {
            return res.status(404).json({ error: 'NFT не найден или вы не являетесь владельцем.' });
        }

        res.json({ message: 'NFT снят с продажи.', nft });
    } catch (error) {
        next(error);
    }
});


// --- ОБЩИЙ ОБРАБОТЧИК ОШИБОК (КРАЙНЕ ВАЖЕН) ---

app.use((err, req, res, next) => {
    console.error(err.stack);
    // Избегаем отправки внутренних ошибок клиенту
    res.status(err.status || 500).json({ 
        error: 'Внутренняя ошибка сервера.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
});


// --- ЗАПУСК СЕРВЕРА ---

app.listen(PORT, () => {
    console.log(`Сервер работает на порту ${PORT}`);
    console.log(`Подключен к MongoDB и узлу Solana: ${solanaConnection.rpcEndpoint}`);
});

