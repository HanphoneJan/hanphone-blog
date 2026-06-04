document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const startButton = document.getElementById('start-btn');
    const gridSizeSelect = document.getElementById('grid-size');
    
    // 添加速度调节滑动条
    const speedSlider = document.createElement('input');
    speedSlider.type = 'range';
    speedSlider.min = '1';
    speedSlider.max = '25';
    speedSlider.value = '8';
    speedSlider.id = 'speedSlider';
    speedSlider.style.marginBottom = '16px';
    startButton.parentNode.insertBefore(speedSlider, startButton);
    
    // 更新游戏速度
    speedSlider.addEventListener('input', function() {
        speed = parseInt(this.value);
        if (gameRunning) {
            clearInterval(gameLoop);
            gameLoop = setInterval(updateGame, 2000 / speed);
        }
    });
    
    const canvasSize = 400; // 画布大小
    let gridCount = 20; // 默认网格数量
    let gridSize = canvasSize / gridCount; // 网格大小
    
    let snake = [];
    let food = {
        x: 0,
        y: 0
    };
    
    let score = 0;
    let speed = 8;
    let gameRunning = false;
    let direction = 'right';
    let nextDirection = 'right';
    let gameLoop;
    
    // 更新网格大小
    function updateGridSize() {
        gridCount = parseInt(gridSizeSelect.value);
        gridSize = canvasSize / gridCount;
        
        // 如果游戏正在运行，重新开始游戏
        if (gameRunning) {
            initGame();
            clearInterval(gameLoop);
            gameLoop = setInterval(updateGame, 2000 / speed);
            drawGame(); // 重新绘制游戏
        } else {
            initGame();
            drawGame();
        }
    }
    
    // 初始化游戏
    function initGame() {
        snake = [];
        for (let i = 3; i >= 0; i--) {
            snake.push({ x: i, y: 0 });
        }
        
        score = 0;
        speed = 8;
        direction = 'right';
        nextDirection = 'right';
        gameRunning = false;
        generateFood();
        // 读取最高分数
    let highScore = localStorage.getItem('snakeHighScore') || 0;
    scoreElement.textContent = `${score }  | 最高分数：${highScore}`;
        
        drawGame();
    }
    
    // 开始游戏
    function startGame() {
        if (gameRunning) {
            clearInterval(gameLoop);
            initGame();
        }
        
        gameRunning = true;
        startButton.textContent = '重新开始';
        gameLoop = setInterval(updateGame, 2000 / speed);
    }
    
    function endGame() {
        gameRunning = false;
        clearInterval(gameLoop);
        
        // 保存最高分数到 localStorage
        let highScore = localStorage.getItem('snakeHighScore') || 0;
        if (score > highScore) {
            localStorage.setItem('snakeHighScore', score);
            highScore = score;
        }
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '24px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText(`最终得分: ${score} (最高: ${highScore})`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText('点击屏幕或按空格键重新开始', canvas.width / 2, canvas.height / 2 + 50);
        
        // 添加一次性点击事件监听器，点击后重新开始游戏
        canvas.addEventListener('click', restartAfterGameOver, { once: true });
    }
    
    function restartAfterGameOver() {
        initGame();
        startGame();
    }
    
    function generateFood() {
        let validPosition = false;
        while (!validPosition) {
            food.x = Math.floor(Math.random() * gridCount);
            food.y = Math.floor(Math.random() * gridCount);
            
            validPosition = true;
            for (let segment of snake) {
                if (segment.x === food.x && segment.y === food.y) {
                    validPosition = false;
                    break;
                }
            }
        }
    }
    
    function drawGrid() {
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 0.5;
        
        // 绘制垂直线
        for (let i = 0; i <= gridCount; i++) {
            ctx.beginPath();
            ctx.moveTo(i * gridSize, 0);
            ctx.lineTo(i * gridSize, canvas.height);
            ctx.stroke();
        }
        
        // 绘制水平线
        for (let i = 0; i <= gridCount; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * gridSize);
            ctx.lineTo(canvas.width, i * gridSize);
            ctx.stroke();
        }
    }
    
    function drawGame() {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        drawGrid();
        
        // 绘制蛇
        for (let i = 0; i < snake.length; i++) {
            const segment = snake[i];
            // 蛇头与身体使用不同颜色
            if (i === 0) {
                ctx.fillStyle = '#2E8B57'; // 蛇头颜色
            } else {
                ctx.fillStyle = '#3CB371'; // 蛇身颜色
            }
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 1, gridSize - 1);
        }
        
        // 绘制食物
        ctx.fillStyle = '#FF6347';
        ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 1, gridSize - 1);
    }
    
    function updateGame() {
        const head = { x: snake[0].x, y: snake[0].y };
        direction = nextDirection;
        
        // 移动蛇
        switch (direction) {
            case 'up':
                head.y--;
                break;
            case 'down':
                head.y++;
                break;
            case 'left':
                head.x--;
                break;
            case 'right':
                head.x++;
                break;
        }
        
        // 检查是否吃到食物
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            // 读取最高分数
    let highScore = localStorage.getItem('snakeHighScore') || 0;
    scoreElement.textContent = `${score} (最高: ${highScore})`;
            generateFood();
            // 每得100分增加速度
            if (score % 100 === 0) {
                speed += 1;
                clearInterval(gameLoop);
                gameLoop = setInterval(updateGame, 2000 / speed);
            }
        } else {
            snake.pop();
        }
        
        // 检查是否撞墙
        if (
            head.x < 0 || 
            head.x >= gridCount || 
            head.y < 0 || 
            head.y >= gridCount || 
            checkCollision(head)
        ) {
            endGame();
            return;
        }
        
        snake.unshift(head);
        // 绘制游戏
        drawGame();
    }
    
    // 检查是否与蛇身碰撞
    function checkCollision(head) {
        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                return true;
            }
        }
        return false;
    }
    
    // 键盘控制
    document.addEventListener('keydown', function(e) {
        // 防止按键导致页面滚动
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd'].includes(e.key)) {
            e.preventDefault();
        }
        
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
                if (direction !== 'down') nextDirection = 'up';
                break;
            case 'ArrowDown':
            case 's':
                if (direction !== 'up') nextDirection = 'down';
                break;
            case 'ArrowLeft':
            case 'a':
                if (direction !== 'right') nextDirection = 'left';
                break;
            case 'ArrowRight':
            case 'd':
                if (direction !== 'left') nextDirection = 'right';
                break;
            case ' ':
                if (!gameRunning) {
                    // 如果游戏结束，按空格键重新开始
                    restartAfterGameOver();
                }
                break;
        }
    });

    // 添加触摸屏控制
    let touchStartX = 0;
    let touchStartY = 0;
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, false);

    canvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
        if (!gameRunning) return;
        
        const touchEndX = e.touches[0].clientX;
        const touchEndY = e.touches[0].clientY;
        
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            // 水平滑动
            if (dx > 0 && direction !== 'left') {
                nextDirection = 'right';
            } else if (dx < 0 && direction !== 'right') {
                nextDirection = 'left';
            }
        } else {
            // 垂直滑动
            if (dy > 0 && direction !== 'up') {
                nextDirection = 'down';
            } else if (dy < 0 && direction !== 'down') {
                nextDirection = 'up';
            }
        }
    }, false);

    // 添加触摸屏点击重新开始功能
    canvas.addEventListener('touchend', function(e) {
        e.preventDefault();
        if (!gameRunning) {
            restartAfterGameOver();
        }
    }, false);
    
    gridSizeSelect.addEventListener('change', updateGridSize);
    // 开始按钮点击事件
    startButton.addEventListener('click', startGame);
    
    // 初始化
    updateGridSize();
    // 初始绘制
    drawGame();
});