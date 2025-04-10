const express = require('express');
const router = express.Router();

module.exports = (db, logger) => {
    router.post('/auth', (req, res) => {
        const { initData } = req.body;
        if (!initData) {
            logger.warn('Попытка авторизации без данных Telegram');
            return res.status(400).json({ error: 'Отсутствуют данные авторизации' });
        }

        const data = Object.fromEntries(new URLSearchParams(initData));
        const userId = data.id;
        const username = data.username || 'Гость';

        const query = `
            INSERT INTO users (telegram_id, username)
            VALUES (?, ?)
            ON CONFLICT(telegram_id) DO UPDATE SET username = excluded.username
        `;
        db.run(query, [userId, username], (err) => {
            if (err) return res.status(500).json({ error: 'Ошибка при сохранении пользователя' });
            res.status(200).json({ message: 'Авторизация успешна', userId });
        });
    });

    return router;
};
