const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const { Telegraf } = require('telegraf');
const schedule = require('node-schedule');
const WebSocket = require('ws');

const app = express();
const PORT = 3000;
const TELEGRAM_BOT_TOKEN = '7890107637:AAFnRXy5Ld0rUSxv8QTmAQlSW4p8_6S7Pf8'; // Токен Telegram-бота

app.use(cors());
app.use(bodyParser.json());

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply('Добро пожаловать в Trade Typhoon!', {
        reply_markup: {
            keyboard: [[{ text: 'Запустить игру', web_app: { url: 'http://localhost:3000' } }]],
            resize_keyboard: true,
        },
    });
});

bot.launch();

function checkTelegramAuth(data) {
    const secretKey = crypto.createHash('sha256').update(TELEGRAM_BOT_TOKEN).digest();
    const checkString = Object.keys(data)
        .filter(key => key !== 'hash')
        .sort()
        .map(key => `${key}=${data[key]}`)
        .join('\n');
    const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');
    return hmac === data.hash;
}

app.post('/auth', (req, res) => {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: 'Отсутствуют данные авторизации' });

    const data = Object.fromEntries(new URLSearchParams(initData));
    if (!checkTelegramAuth(data)) return res.status(403).json({ error: 'Неверная подпись Telegram' });

    const userId = data.id;
    const username = data.username || 'Гость';
    const firstName = data.first_name || '';
    const lastName = data.last_name || '';

    const query = `
        INSERT INTO users (telegram_id, username, first_name, last_name)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(telegram_id) DO UPDATE SET username = excluded.username, first_name = excluded.first_name, last_name = excluded.last_name
    `;
    db.run(query, [userId, username, firstName, lastName], (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка при сохранении пользователя' });
        res.status(200).json({ message: 'Авторизация успешна', userId });
    });
});

schedule.scheduleJob('0 * * * *', () => {
    const query = `
        UPDATE users
        SET rating = rating + 10
        WHERE id IN (
            SELECT id FROM users ORDER BY RANDOM() LIMIT 5
        )
    `;
    db.run(query, (err) => {
        if (err) console.error('Ошибка при обновлении рейтинга:', err);
    });
});

const wss = new WebSocket.Server({ port: 8080 }, () => {
    console.log('WebSocket сервер запущен на порту 8080');
});

// Хранение активных лобби
const lobbies = new Map();

// Хранение подключений пользователей
const activeConnections = new Map();

wss.on('connection', (ws) => {
    console.log('Новое подключение WebSocket');

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'create-lobby':
                handleCreateLobby(ws, data);
                break;

            case 'join-lobby':
                handleJoinLobby(ws, data);
                break;

            case 'leave-lobby':
                handleLeaveLobby(ws, data);
                break;

            case 'start-game':
                handleStartGame(data);
                break;

            default:
                console.log('Неизвестный тип сообщения:', data.type);
        }
    });

    ws.on('close', () => {
        console.log('Подключение WebSocket закрыто');
        handleDisconnect(ws);
    });
});

function handleCreateLobby(ws, data) {
    const { lobbyName, maxPlayers, isPrivate, autoStart, mode, creatorId } = data;

    if (!lobbyName || !maxPlayers || !creatorId) {
        return ws.send(JSON.stringify({ type: 'error', message: 'Все поля обязательны' }));
    }

    const lobbyId = `lobby-${Date.now()}`;
    lobbies.set(lobbyId, {
        lobbyId,
        lobbyName,
        maxPlayers,
        isPrivate,
        autoStart,
        mode,
        creatorId,
        players: [creatorId],
    });

    activeConnections.set(creatorId, ws);

    ws.send(JSON.stringify({ type: 'lobby-created', lobbyId, lobbyName }));
    broadcastLobbies();
}

function handleJoinLobby(ws, data) {
    const { lobbyId, userId } = data;

    if (!lobbies.has(lobbyId)) {
        return ws.send(JSON.stringify({ type: 'error', message: 'Лобби не найдено' }));
    }

    const lobby = lobbies.get(lobbyId);
    if (lobby.players.length >= lobby.maxPlayers) {
        return ws.send(JSON.stringify({ type: 'error', message: 'Лобби заполнено' }));
    }

    lobby.players.push(userId);
    activeConnections.set(userId, ws);

    ws.send(JSON.stringify({ type: 'joined-lobby', lobbyId }));
    broadcastLobbyUpdate(lobbyId);
}

function handleLeaveLobby(ws, data) {
    const { lobbyId, userId } = data;

    if (!lobbies.has(lobbyId)) {
        return ws.send(JSON.stringify({ type: 'error', message: 'Лобби не найдено' }));
    }

    const lobby = lobbies.get(lobbyId);
    lobby.players = lobby.players.filter((player) => player !== userId);

    if (lobby.players.length === 0) {
        lobbies.delete(lobbyId);
    } else {
        broadcastLobbyUpdate(lobbyId);
    }

    activeConnections.delete(userId);
    ws.send(JSON.stringify({ type: 'left-lobby', lobbyId }));
}

function handleStartGame(data) {
    const { lobbyId } = data;

    if (!lobbies.has(lobbyId)) {
        return;
    }

    const lobby = lobbies.get(lobbyId);
    broadcastToLobby(lobbyId, { type: 'game-started', lobbyId });
    lobbies.delete(lobbyId);
}

function handleDisconnect(ws) {
    for (const [userId, connection] of activeConnections.entries()) {
        if (connection === ws) {
            activeConnections.delete(userId);

            for (const [lobbyId, lobby] of lobbies.entries()) {
                if (lobby.players.includes(userId)) {
                    lobby.players = lobby.players.filter((player) => player !== userId);
                    if (lobby.players.length === 0) {
                        lobbies.delete(lobbyId);
                    } else {
                        broadcastLobbyUpdate(lobbyId);
                    }
                    break;
                }
            }
            break;
        }
    }
}

function broadcastLobbies() {
    const lobbyList = Array.from(lobbies.values()).map(({ lobbyId, lobbyName, maxPlayers, players }) => ({
        lobbyId,
        lobbyName,
        maxPlayers,
        currentPlayers: players.length,
    }));

    activeConnections.forEach((ws) => {
        ws.send(JSON.stringify({ type: 'lobby-list', lobbies: lobbyList }));
    });
}

function broadcastLobbyUpdate(lobbyId) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;

    broadcastToLobby(lobbyId, {
        type: 'lobby-update',
        lobbyId,
        players: lobby.players,
    });
}

function broadcastToLobby(lobbyId, message) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;

    lobby.players.forEach((playerId) => {
        const ws = activeConnections.get(playerId);
        if (ws) {
            ws.send(JSON.stringify(message));
        }
    });
}

app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`));
