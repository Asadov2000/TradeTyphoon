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

    let reconnectAttempts = 0;

    function connectWebSocket() {
        const ws = new WebSocket('ws://localhost:8080');

        ws.onopen = () => {
            console.log('WebSocket подключён');
            reconnectAttempts = 0; // Сброс попыток
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'game-found') {
                    alert(`Игра найдена! Подключение к игре: ${data.gameId}`);
                    window.location.href = `game.html?gameId=${data.gameId}`;
                }
            } catch (err) {
                console.error('Ошибка обработки сообщения WebSocket:', err.message);
            }
        };

        ws.onerror = (error) => {
            console.error('Ошибка WebSocket:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket отключён. Повторное подключение...');
            if (reconnectAttempts < 5) {
                setTimeout(connectWebSocket, 3000); // Повторное подключение
                reconnectAttempts++;
            } else {
                alert('Не удалось подключиться к серверу. Попробуйте позже.');
            }
        };

        return ws;
    }

    const ws = connectWebSocket();
};

// Функция для перемещения игрока
function movePlayer(player, steps) {
    const oldPosition = player.position;
    player.position = (player.position + steps) % boardCells.length;

    const oldCell = boardCells[oldPosition];
    const newCell = boardCells[player.position];

    oldCell.classList.remove(`player-${player.id}`);
    newCell.classList.add(`player-${player.id}`, 'active');
    newCell.style.animation = "movePlayer 0.5s ease-in-out";

    setTimeout(() => {
        newCell.classList.remove('active');
    }, 500);

    const cellType = newCell.dataset.type;
    handleCellEvent(player, cellType);
}

// Обработка событий клетки
function handleCellEvent(player, cellType) {
    switch (cellType) {
        case 'bonus':
            alert(`${player.name} получил бонус!`);
            break;
        case 'penalty':
            alert(`${player.name} получил штраф!`);
            break;
        case 'chance':
            alert(`${player.name} попал на клетку "Шанс"!`);
            break;
        default:
            alert(`${player.name} на обычной клетке.`);
    }
}
