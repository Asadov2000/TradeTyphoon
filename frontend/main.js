window.onload = () => {
    const tg = window.Telegram.WebApp;

    tg.ready();
    console.log("Telegram WebApp initialized");

    // Пример получения данных пользователя
    const user = tg.initDataUnsafe?.user;
    if (user) {
        document.getElementById('user-name').textContent = `Никнейм: ${user.first_name}`;
    } else {
        console.log("Не удалось получить данные пользователя.");
    }

    // Пример обработки кнопок
    document.getElementById('find-game').addEventListener('click', () => {
        alert('Поиск игры пока не реализован.');
    });

    document.getElementById('create-lobby').addEventListener('click', () => {
        alert('Создание лобби пока не реализовано.');
    });

    document.getElementById('list-lobbies').addEventListener('click', () => {
        alert('Список лобби пока не реализован.');
    });
};
