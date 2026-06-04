// 游戏状态
const gameState = {
    score: 0,
    bestScore: 0,
    gridSize: 4,
    board: [],
    history: [],
    gameOver: false,
    touchStartX: 0, // 新增
    touchStartY: 0  // 新增
};

// DOM元素
const elements = {
    gameBoard: document.getElementById('game-board'),
    scoreDisplay: document.getElementById('score'),
    bestScoreDisplay: document.getElementById('best-score'),
    newGameBtn: document.getElementById('new-game'),
    undoBtn: document.getElementById('undo'),
    gridSizeSelect: document.getElementById('grid-size')
};

// 初始化游戏
function initGame() {
    // 从本地存储加载最高分
    gameState.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
    elements.bestScoreDisplay.textContent = gameState.bestScore;

    // 设置棋盘大小
    gameState.gridSize = parseInt(elements.gridSizeSelect.value);

    // 初始化空白游戏板
    initializeBoard();

    // 添加初始方块
    addRandomTile();
    addRandomTile();

    // 渲染游戏板
    renderBoard();

    // 绑定事件监听器
    bindEvents();
}

// 初始化空白游戏板
function initializeBoard() {
    gameState.board = [];
    for (let i = 0; i < gameState.gridSize; i++) {
        gameState.board.push(Array(gameState.gridSize).fill(0));
    }
}

// 添加随机方块
function addRandomTile() {
    const emptyCells = [];

    // 查找所有空格子
    for (let row = 0; row < gameState.gridSize; row++) {
        for (let col = 0; col < gameState.gridSize; col++) {
            if (gameState.board[row][col] === 0) {
                emptyCells.push({ row, col });
            }
        }
    }

    // 如果有空格子，随机选择一个并添加2或4
    if (emptyCells.length > 0) {
        const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        gameState.board[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
}

// 渲染游戏板
function renderBoard() {
    elements.gameBoard.innerHTML = '';

    // 设置网格布局
    elements.gameBoard.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`;

    // 渲染每个方块
    for (let row = 0; row < gameState.gridSize; row++) {
        for (let col = 0; col < gameState.gridSize; col++) {
            const value = gameState.board[row][col];
            const tile = document.createElement('div');
            tile.className = 'tile';

            if (value > 0) {
                tile.textContent = value;
                tile.classList.add(`tile-${value}`);
            }

            elements.gameBoard.appendChild(tile);
        }
    }
}

// 处理键盘输入
function handleKeyPress(e) {
    if (gameState.gameOver) return;

    let moved = false;

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            moved = moveTiles('up');
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            moved = moveTiles('down');
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            moved = moveTiles('left');
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            moved = moveTiles('right');
            break;
        default:
            return; // 忽略其他按键
    }

    if (moved) {
        saveHistory();
        addRandomTile();
        renderBoard();
        updateScore();

        if (isGameOver()) {
            gameState.gameOver = true;
            setTimeout(() => alert('游戏结束!'), 100);
        }
    }
}

// 移动方块
function moveTiles(direction) {
    let moved = false;
    const boardCopy = JSON.parse(JSON.stringify(gameState.board));

    // 根据方向处理移动
    for (let i = 0; i < gameState.gridSize; i++) {
        const line = getLine(direction, i);
        const result = moveLine(line);

        if (!arraysEqual(line, result.line)) {
            moved = true;
            setLine(direction, i, result.line);
            gameState.score += result.score;
        }
    }

    return moved;
}

// 获取一行或一列(根据移动方向)
function getLine(direction, index) {
    const line = [];

    if (direction === 'left' || direction === 'right') {
        // 获取行
        for (let col = 0; col < gameState.gridSize; col++) {
            line.push(gameState.board[index][col]);
        }
    } else {
        // 获取列
        for (let row = 0; row < gameState.gridSize; row++) {
            line.push(gameState.board[row][index]);
        }
    }

    // 如果是向右或向下移动，需要反转数组以便统一处理
    if (direction === 'right' || direction === 'down') {
        return line.reverse();
    }

    return line;
}

// 设置一行或一列(根据移动方向)
function setLine(direction, index, line) {
    if (direction === 'right' || direction === 'down') {
        line = line.reverse();
    }

    if (direction === 'left' || direction === 'right') {
        // 设置行
        for (let col = 0; col < gameState.gridSize; col++) {
            gameState.board[index][col] = line[col];
        }
    } else {
        // 设置列
        for (let row = 0; row < gameState.gridSize; row++) {
            gameState.board[row][index] = line[row];
        }
    }
}

// 移动并合并一行或一列
function moveLine(line) {
    let score = 0;
    const newLine = Array(line.length).fill(0);
    let position = 0;

    // 移动和合并
    for (let i = 0; i < line.length; i++) {
        if (line[i] !== 0) {
            if (newLine[position] === 0) {
                newLine[position] = line[i];
            } else if (newLine[position] === line[i]) {
                newLine[position] *= 2;
                score += newLine[position];
                position++;
            } else {
                position++;
                newLine[position] = line[i];
            }
        }
    }

    return { line: newLine, score };
}

// 绑定事件监听器
function bindEvents() {
    // 键盘控制
    document.addEventListener('keydown', handleKeyPress);

    // 新游戏按钮
    elements.newGameBtn.addEventListener('click', resetGame);

    // 撤销按钮
    elements.undoBtn.addEventListener('click', undoMove);

    // 棋盘大小选择
    elements.gridSizeSelect.addEventListener('change', resetGame);

    // 触摸控制
    if (elements.gameBoard) {
        elements.gameBoard.addEventListener('touchstart', handleTouchStart, { passive: true });
        elements.gameBoard.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
}

// 重置游戏
function resetGame() {
    // 保存历史状态
    saveHistory();

    // 重置游戏状态
    gameState.score = 0;
    gameState.board = [];
    gameState.gameOver = false;

    // 更新分数显示
    elements.scoreDisplay.textContent = gameState.score;

    // 重新初始化游戏
    initGame();
}

// 保存当前状态到历史记录
function saveHistory() {
    gameState.history.push({
        board: JSON.parse(JSON.stringify(gameState.board)),
        score: gameState.score
    });

    // 限制历史记录数量
    if (gameState.history.length > 10) {
        gameState.history.shift();
    }
}

// 检查游戏是否结束
function isGameOver() {
    // 检查是否有空格子
    for (let row = 0; row < gameState.gridSize; row++) {
        for (let col = 0; col < gameState.gridSize; col++) {
            if (gameState.board[row][col] === 0) {
                return false;
            }
        }
    }

    // 检查是否有相邻相同数字
    for (let row = 0; row < gameState.gridSize; row++) {
        for (let col = 0; col < gameState.gridSize; col++) {
            const value = gameState.board[row][col];

            // 检查右侧
            if (col < gameState.gridSize - 1 && gameState.board[row][col + 1] === value) {
                return false;
            }

            // 检查下方
            if (row < gameState.gridSize - 1 && gameState.board[row + 1][col] === value) {
                return false;
            }
        }
    }

    return true;
}

// 更新分数
function updateScore() {
    elements.scoreDisplay.textContent = gameState.score;

    if (gameState.score > gameState.bestScore) {
        gameState.bestScore = gameState.score;
        elements.bestScoreDisplay.textContent = gameState.bestScore;
        localStorage.setItem('bestScore', gameState.bestScore.toString());
    }
}

// 比较两个数组是否相同
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

// 撤销上一步
function undoMove() {
    if (gameState.history.length > 0) {
        const lastState = gameState.history.pop();
        gameState.board = lastState.board;
        gameState.score = lastState.score;
        gameState.gameOver = false;

        elements.scoreDisplay.textContent = gameState.score;
        renderBoard();
    }
}

// 触摸开始事件处理
function handleTouchStart(event) {
    if (event.touches.length !== 1) return;
    gameState.touchStartX = event.touches[0].clientX;
    gameState.touchStartY = event.touches[0].clientY;
}

// 触摸结束事件处理
function handleTouchEnd(event) {
    if (gameState.gameOver) return;
    if (event.changedTouches.length !== 1) return;
    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;

    const diffX = endX - gameState.touchStartX;
    const diffY = endY - gameState.touchStartY;

    let moved = false;
    if (Math.abs(diffX) > Math.abs(diffY)) {
        // 水平滑动
        if (diffX > 30) {
            moved = moveTiles('right');
        } else if (diffX < -30) {
            moved = moveTiles('left');
        }
    } else {
        // 垂直滑动
        if (diffY > 30) {
            moved = moveTiles('down');
        } else if (diffY < -30) {
            moved = moveTiles('up');
        }
    }

    if (moved) {
        saveHistory();
        addRandomTile();
        renderBoard();
        updateScore();

        if (isGameOver()) {
            gameState.gameOver = true;
            setTimeout(() => alert('游戏结束!'), 100);
        }
    }
}

// 启动游戏
initGame();