const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./trade_typhoon.db');

// Создание таблицы пользователей
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT UNIQUE NOT NULL,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            rating INTEGER DEFAULT 0
        )
    `);
    console.log("Таблица пользователей создана.");
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS lobbies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lobby_name TEXT NOT NULL,
            max_players INTEGER NOT NULL,
            creator_id TEXT NOT NULL,
            current_players INTEGER DEFAULT 0
        )
    `);
    console.log("Таблица лобби создана.");
});

module.exports = db;
