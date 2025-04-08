let tg = window.Telegram.WebApp;

tg.expand(); // Растягиваем на весь экран
tg.MainButton.setText("Начать игру");
tg.MainButton.show();

tg.MainButton.onClick(() => {
    alert("Скоро начнётся игра!");
});
