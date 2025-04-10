const WebSocket = require('ws');
const crypto = require('crypto');

function setupWebSocket(server, logger, db, redisClient) {
    const wss = new WebSocket.Server({ server });

    const lobbies = new Map();
    const activeConnections = new Map();
    const activeSearches = new Set();

    wss.on('connection', (ws, req) => {
        const ip = req.socket.remoteAddress;
        logger.info(`Новое WebSocket подключение от ${ip}`);

        if (activeConnections.has(ip) && activeConnections.get(ip) >= 5) {
            ws.close(1008, 'Слишком много подключений с одного IP');
            return;
        }

        activeConnections.set(ip, (activeConnections.get(ip) || 0) + 1);

        ws.on('message', (message) => {
            try {
                const decryptedMessage = decryptMessage(message); // Расшифровка сообщения
                const data = JSON.parse(decryptedMessage);
                logger.info(`Получено сообщение от ${ip}: ${JSON.stringify(data)}`);

                switch (data.type) {
                    case 'search-game':
                        handleSearchGame(ws, data.userId);
                        break;
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
                        logger.warn(`Неизвестный тип сообщения: ${data.type}`);
                }
            } catch (err) {
                logger.error(`Ошибка обработки сообщения WebSocket: ${err.message}`);
            }
        });

        ws.on('close', () => {
            logger.info(`WebSocket соединение закрыто для ${ip}`);
            activeConnections.set(ip, activeConnections.get(ip) - 1);
            if (activeConnections.get(ip) <= 0) {
                activeConnections.delete(ip);
            }
            activeSearches.delete(ws);
            handleDisconnect(ws);
        });
    });

    function encryptMessage(message) {
        const cipher = crypto.createCipher('aes-256-cbc', process.env.SECRET_KEY);
        let encrypted = cipher.update(message, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    function decryptMessage(message) {
        const decipher = crypto.createDecipher('aes-256-cbc', process.env.SECRET_KEY);
        let decrypted = decipher.update(message, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    function handleSearchGame(ws, userId) {
        if (!userId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Не указан userId' }));
            return;
        }

        activeSearches.add(ws);
        setTimeout(() => {
            if (activeSearches.has(ws)) {
                const gameId = `game-${Date.now()}`;
                ws.send(JSON.stringify({ type: 'game-found', gameId }));
                activeSearches.delete(ws);
            }
        }, 5000);
    }

    function handleCreateLobby(ws, data) {
        const { lobbyName, maxPlayers, creatorId } = data;
        if (!lobbyName || !maxPlayers || !creatorId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Все поля обязательны' }));
            return;
        }

        const lobbyId = `lobby-${Date.now()}`;
        lobbies.set(lobbyId, {
            lobbyId,
            lobbyName,
            maxPlayers,
            players: [creatorId],
        });

        ws.send(JSON.stringify({ type: 'lobby-created', lobbyId, lobbyName }));
    }

    function handleJoinLobby(ws, data) {
        const { lobbyId, userId } = data;
        const lobby = lobbies.get(lobbyId);
        if (!lobby || lobby.players.length >= lobby.maxPlayers) {
            ws.send(JSON.stringify({ type: 'error', message: 'Лобби заполнено или не найдено' }));
            return;
        }

        lobby.players.push(userId);
        ws.send(JSON.stringify({ type: 'joined-lobby', lobbyId }));
    }

    function handleLeaveLobby(ws, data) {
        const { lobbyId, userId } = data;
        const lobby = lobbies.get(lobbyId);
        if (!lobby) return;

        lobby.players = lobby.players.filter((player) => player !== userId);
        if (lobby.players.length === 0) {
            lobbies.delete(lobbyId);
        }
    }

    function handleStartGame(data) {
        const { lobbyId } = data;
        const lobby = lobbies.get(lobbyId);
        if (!lobby) return;

        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'game-started', lobbyId }));
            }
        });
        lobbies.delete(lobbyId);
    }

    function handleDisconnect(ws) {
        for (const [lobbyId, lobby] of lobbies.entries()) {
            lobby.players = lobby.players.filter((player) => player !== ws);
            if (lobby.players.length === 0) {
                lobbies.delete(lobbyId);
            }
        }
    }
}

module.exports = setupWebSocket;
