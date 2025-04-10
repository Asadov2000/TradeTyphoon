const { Telegraf, Markup } = require('telegraf'); // Убедитесь, что Telegraf установлен
const bot = new Telegraf('7890107637:AAFnRXy5Ld0rUSxv8QTmAQlSW4p8_6S7Pf8'); // Замените YOUR_BOT_TOKEN на токен вашего бота

bot.start((ctx) => {
    ctx.reply('Добро пожаловать в Trade Typhoon!', Markup.inlineKeyboard([
        Markup.button.webApp('Запустить игру', 'https://asadov2000.github.io/TradeTyphoon/')
    ]));
});

bot.launch();