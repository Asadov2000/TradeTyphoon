import telebot
from telebot.types import WebAppInfo, ReplyKeyboardMarkup, KeyboardButton

TOKEN = '7890107637:AAFnRXy5Ld0rUSxv8QTmAQlSW4p8_6S7Pf8'
bot = telebot.TeleBot(TOKEN)

@bot.message_handler(commands=['start'])
def send_welcome(message):
    markup = ReplyKeyboardMarkup(resize_keyboard=True)
    btn = KeyboardButton(
        text="🎮 Открыть игру",
        web_app=WebAppInfo(url="https://asadov2000.github.io/TradeTyphoon/")
    )
    markup.add(btn)
    bot.send_message(message.chat.id, "Добро пожаловать в Trade Typhoon!", reply_markup=markup)

bot.infinity_polling()
