<template>
  <view class="gomoku-container">
    <view class="controls">
      <view class="size-selector">
        <text class="size-label">棋盘大小:</text>
        <picker @change="onSizeChange" :value="sizeIndex" :range="sizeOptions">
          <view class="picker-text">{{sizeOptions[sizeIndex]}}</view>
        </picker>
      </view>
      <button class="restart-btn" @click="restartGame">重新开始</button>
      <button class="mode-btn" @click="toggleGameMode">{{ gameMode === 'pvp' ? '切换人机模式' : '切换双人模式' }}</button>
    </view>
    <view class="timer-board">
      <text class="timer">对局时间: {{formatTime(gameTime)}}</text>
      <text class="timer">当前步数: {{moveCount}}</text>
      <text class="timer">步数时间: {{formatTime(stepTime)}}</text>
    </view>
    <view class="score-board">
      <text class="score black-score">黑方: {{scores.black}}</text>
      <text class="status">{{ statusMessage }}</text>
      <text class="score white-score">白方: {{scores.white}}</text>
    </view>
    <view class="board" :class="{ 'disabled-board': aiThinking }">
      <view 
        v-for="(row, rowIndex) in board" 
        :key="rowIndex" 
        class="row"
      >
        <view 
          v-for="(cell, colIndex) in row" 
          :key="colIndex" 
          class="cell"
          @click="handleCellClick(rowIndex, colIndex)"
        >
          <view 
            v-if="cell === 1" 
            class="stone black"
          ></view>
          <view 
            v-if="cell === 2" 
            class="stone white"
          ></view>
        </view>
      </view>
      <view v-if="aiThinking" class="ai-thinking-overlay">
        <text class="ai-thinking-text">AI思考中...</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      sizeOptions: ['13×13 格', '15×15 格', '19×19 格'],
      sizeIndex: 0,
      board: Array(13).fill().map(() => Array(13).fill(0)),
      currentPlayer: 1, // 1 for black, 2 for white
      gameOver: false,
      statusMessage: '黑方回合',
      scores: {
        black: 0,
        white: 0
      },
      gameTime: 0, // 总对局时间(秒)
      stepTime: 0, // 当前步数时间(秒)
      moveCount: 0, // 当前步数
      gameTimer: null, // 对局计时器
      stepTimer: null, // 步数计时器
      lastStepTime: 0, // 上一步时间戳
      gameMode: 'pvc', // 'pvp' for player vs player, 'pvc' for player vs computer
      aiThinking: false // 防止AI思考时玩家操作
    };
  },
  created() {
    this.loadScores();
    this.startTimers();
  },
  beforeDestroy() {
    this.clearTimers();
  },
  methods: {
    startTimers() {
      this.clearTimers();
      this.lastStepTime = Date.now();
      
      this.gameTimer = setInterval(() => {
        this.gameTime++;
      }, 1000);
      
      this.stepTimer = setInterval(() => {
        this.stepTime = Math.floor((Date.now() - this.lastStepTime) / 1000);
      }, 1000);
    },
    clearTimers() {
      if (this.gameTimer) clearInterval(this.gameTimer);
      if (this.stepTimer) clearInterval(this.stepTimer);
    },
    resetTimers() {
      this.gameTime = 0;
      this.stepTime = 0;
      this.moveCount = 0;
      this.lastStepTime = Date.now();
    },
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    loadScores() {
      try {
        const savedScores = uni.getStorageSync('gomoku_scores');
        if (savedScores) {
          this.scores = JSON.parse(savedScores);
        }
      } catch (e) {
        console.error('Failed to load scores:', e);
      }
    },
    saveScores() {
      try {
        uni.setStorageSync('gomoku_scores', JSON.stringify(this.scores));
      } catch (e) {
        console.error('Failed to save scores:', e);
      }
    },
    toggleGameMode() {
      this.gameMode = this.gameMode === 'pvp' ? 'pvc' : 'pvp';
      this.restartGame();
    },
    onSizeChange(e) {
      this.sizeIndex = e.detail.value;
      this.initializeBoard();
    },
    initializeBoard() {
      const sizes = [13, 15, 19];
      const newSize = sizes[this.sizeIndex];
      this.board = Array(newSize).fill().map(() => Array(newSize).fill(0));
      this.currentPlayer = 1;
      this.gameOver = false;
      this.statusMessage = '黑方回合';
      this.aiThinking = false;
      this.resetTimers();
      
      // 如果是人机模式且AI先手，则AI走第一步
      if (this.gameMode === 'pvc' && this.currentPlayer === 2) {
        this.aiThinking = true;
        setTimeout(() => {
          this.aiMakeMove();
          this.aiThinking = false;
        }, 500);
      }
    },
    restartGame() {
      this.initializeBoard();
      this.startTimers();
    },
    handleCellClick(row, col) {
      // 游戏结束、格子已有棋子或AI正在思考时，不允许玩家操作
      if (this.gameOver || this.board[row][col] !== 0 || this.aiThinking) return;
      
      this.makeMove(row, col);
      
      // 如果是人机模式且游戏未结束，让AI走下一步
      if (this.gameMode === 'pvc' && !this.gameOver && this.currentPlayer === 2) {
        this.aiThinking = true;
        // 添加一点延迟，让玩家看到自己的落子
        setTimeout(() => {
          this.aiMakeMove();
          this.aiThinking = false;
        }, 500);
      }
    },
    makeMove(row, col) {
      this.board[row][col] = this.currentPlayer;
      this.moveCount++;
      this.lastStepTime = Date.now();
      this.stepTime = 0;
      
      if (this.checkWin(row, col)) {
        this.gameOver = true;
        const winner = this.currentPlayer === 1 ? 'black' : 'white';
        this.statusMessage = winner === 'black' ? '黑方胜利!' : '白方胜利!';
        this.scores[winner]++;
        this.saveScores();
        this.clearTimers();
        return;
      }
      
      // 检查平局
      if (this.moveCount === this.board.length * this.board.length) {
        this.gameOver = true;
        this.statusMessage = '平局!';
        this.clearTimers();
        return;
      }
      
      this.switchPlayer();
    },
    switchPlayer() {
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
      this.statusMessage = this.currentPlayer === 1 ? '黑方回合' : '白方回合';
    },
    aiMakeMove() {
      const [row, col] = this.findBestMove();
      if (row !== -1 && col !== -1) {
        this.makeMove(row, col);
      }
    },
    findBestMove() {
      const boardSize = this.board.length;
      
      // 1. 首先检查AI是否能直接获胜
      for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
          if (this.board[i][j] === 0) {
            this.board[i][j] = 2; // 假设AI下这里
            if (this.checkWin(i, j)) {
              this.board[i][j] = 0; // 恢复
              return [i, j];
            }
            this.board[i][j] = 0; // 恢复
          }
        }
      }
      
      // 2. 检查玩家是否有即将获胜的位置，进行拦截
      for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
          if (this.board[i][j] === 0) {
            this.board[i][j] = 1; // 假设玩家下这里
            if (this.checkWin(i, j)) {
              this.board[i][j] = 0; // 恢复
              return [i, j];
            }
            this.board[i][j] = 0; // 恢复
          }
        }
      }
      
      // 3. 简单的评分系统
      let bestScore = -1;
      let bestMoves = [];
      
      for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
          if (this.board[i][j] === 0) {
            const score = this.evaluatePosition(i, j);
            if (score > bestScore) {
              bestScore = score;
              bestMoves = [[i, j]];
            } else if (score === bestScore) {
              bestMoves.push([i, j]);
            }
          }
        }
      }
      
      // 如果有多个最佳位置，随机选择一个
      if (bestMoves.length > 0) {
        const randomIndex = Math.floor(Math.random() * bestMoves.length);
        return bestMoves[randomIndex];
      }
      
      // 如果没有找到合适的位置(理论上不会发生)，随机选择一个空位
      const emptyCells = [];
      for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
          if (this.board[i][j] === 0) {
            emptyCells.push([i, j]);
          }
        }
      }
      
      if (emptyCells.length > 0) {
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        return emptyCells[randomIndex];
      }
      
      return [-1, -1]; // 没有可下的位置
    },
    evaluatePosition(row, col) {
      // 简单的评分函数，评估在(row,col)下子的价值
      let score = 0;
      const directions = [
        [0, 1], [1, 0], [1, 1], [1, -1], // 水平, 垂直, 对角线
        [0, -1], [-1, 0], [-1, -1], [-1, 1] // 反方向
      ];
      
      // 检查周围8个方向
      for (const [dx, dy] of directions) {
        // 检查AI的棋子
        let aiCount = 0;
        for (let i = 1; i <= 4; i++) {
          const newRow = row + i * dx;
          const newCol = col + i * dy;
          if (newRow >= 0 && newRow < this.board.length && 
              newCol >= 0 && newCol < this.board.length && 
              this.board[newRow][newCol] === 2) {
            aiCount++;
          } else {
            break;
          }
        }
        
        // 检查玩家的棋子
        let playerCount = 0;
        for (let i = 1; i <= 4; i++) {
          const newRow = row + i * dx;
          const newCol = col + i * dy;
          if (newRow >= 0 && newRow < this.board.length && 
              newCol >= 0 && newCol < this.board.length && 
              this.board[newRow][newCol] === 1) {
            playerCount++;
          } else {
            break;
          }
        }
        
        // 根据连子数量加分
        if (aiCount >= 3) score += 100;
        else if (aiCount === 2) score += 10;
        else if (aiCount === 1) score += 1;
        
        // 根据玩家连子数量加分(拦截)
        if (playerCount >= 3) score += 80;
        else if (playerCount === 2) score += 8;
        else if (playerCount === 1) score += 1;
      }
      
      // 中心位置更有价值
      const center = Math.floor(this.board.length / 2);
      const distanceToCenter = Math.sqrt(Math.pow(row - center, 2) + Math.pow(col - center, 2));
      score += (this.board.length / 2 - distanceToCenter) * 2;
      
      return score;
    },
    checkWin(row, col) {
      const directions = [
        [0, 1], [1, 0], [1, 1], [1, -1]
      ];
      
      for (const [dx, dy] of directions) {
        let count = 1;
        
        // 正向检查
        for (let i = 1; i <= 4; i++) {
          const newRow = row + i * dx;
          const newCol = col + i * dy;
          if (
            newRow >= 0 && newRow < this.board.length && 
            newCol >= 0 && newCol < this.board.length && 
            this.board[newRow][newCol] === this.currentPlayer
          ) {
            count++;
          } else {
            break;
          }
        }
        
        // 反向检查
        for (let i = 1; i <= 4; i++) {
          const newRow = row - i * dx;
          const newCol = col - i * dy;
          if (
            newRow >= 0 && newRow < this.board.length && 
            newCol >= 0 && newCol < this.board.length && 
            this.board[newRow][newCol] === this.currentPlayer
          ) {
            count++;
          } else {
            break;
          }
        }
        
        if (count >= 5) return true;
      }
      
      return false;
    }
  }
};
</script>

<style>
.gomoku-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2vw;
  background-color: #f5f5dc;
  min-height: 100vh;
  box-sizing: border-box;
  width: 100%;
}

.controls {
  display: flex;
  align-items: center;
  margin-bottom: 2vw;
  width: 100%;
  max-width: 500px;
  justify-content: space-between;
  flex-wrap: nowrap;
  overflow-x: auto;
  white-space: nowrap;
}

.timer-board {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 90%;
  max-width: 500px;
  margin-bottom: 10px;
  font-family: 'SimSun', serif;
  background-color: #e6d8b5;
  border-radius: 8px;
  padding: 8px;
  border: 1px solid #8b4513;
  flex-wrap: nowrap;
  overflow-x: auto;
  white-space: nowrap;
}

.timer {
  padding: 5px 10px;
  font-size: 14px;
  color: #8b4513;
  flex-shrink: 0;
  margin: 0 1px;
}

.score-board {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 90%;
  max-width: 500px;
  margin-bottom: 10px;
  font-family: 'SimSun', serif;
  background-color: #e6d8b5;
  border-radius: 8px;
  padding: 8px;
  border: 1px solid #8b4513;
  flex-wrap: nowrap;
  overflow-x: auto;
  white-space: nowrap;
}

.score {
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 14px;
  flex-shrink: 0;
}

.black-score {
  background-color: #333;
  color: white;
  margin-right: 5px;
}

.white-score {
  background-color: #fff;
  color: #333;
  border: 1px solid #ddd;
  margin-left: 5px;
}

.status {
  padding: 5px 10px;
  font-size: 14px;
  font-weight: bold;
  color: #8b4513;
  flex-shrink: 0;
  margin: 0 5px;
}

.board {
  display: flex;
  flex-direction: column;
  background-color: #e6d8b5;
  border: 2px solid #8b4513;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  padding: 1vw;
  border-radius: 8px;
  max-width: 100%;
  overflow: auto;
  margin-top: 12px;
  position: relative;
}

.disabled-board {
  opacity: 0.7;
  pointer-events: none;
}

.ai-thinking-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.ai-thinking-text {
  color: white;
  font-size: 18px;
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 10px 20px;
  border-radius: 8px;
}

.row {
  display: flex;
}

.cell {
  width: 5vw;
  height: 5vw;
  min-width: 24px;
  min-height: 24px;
  max-width: 40px;
  max-height: 40px;
  border: 1px solid #8b4513;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #e6d8b5;
}

.stone {
  width: 80%;
  height: 80%;
  border-radius: 50%;
  box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
}

.black {
  background-color: #333;
  border: 1px solid #000;
}

.white {
  background-color: #fff;
  border: 1px solid #ddd;
}

.size-selector {
  display: flex;
  align-items: center;
  font-family: 'SimSun', serif;
  background-color: #f5f5dc;
  border-radius: 6px;
  padding: 2px;
  border: 1px solid #8b4513;
  margin-right: 10px;
}

.size-label {
  padding: 0 8px;
  font-size: 14px;
  color: #8b4513;
  white-space: nowrap;
}

.size-picker {
  position: relative;
  min-width: 100px;
}

.picker-text {
  padding: 5px 12px;
  color: #8b4513;
  background-color: #f5f5dc;
  border-left: 1px solid #8b4513;
  font-size: 14px;
  text-align: center;
}

.restart-btn, .mode-btn {
  padding: 2px 12px;
  background-color: #8b4513;
  color: white;
  border: none;
  border-radius: 4px;
  font-family: 'SimSun', serif;
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
  margin: 1px 8px 1px 0;
}

.restart-btn:active, .mode-btn:active {
  background-color: #6d3610;
}

@media (min-width: 768px) {
  .cell {
    width: 36px;
    height: 36px;
  }
  .score, .status, .timer {
    font-size: 16px;
    padding: 8px 15px;
  }
  .restart-btn, .mode-btn {
    padding: 2px 18px;
    font-size: 16px;
  }
  .size-label {
    font-size: 18px;
    padding: 8px 15px;
  }
  .picker-text {
    font-size: 18px;
    padding: 8px 15px;
  }
  .size-selector {
    min-width: 180px;
  }
}

@media (max-width: 480px) {
  .cell {
    width: 6vw;
    height: 6vw;
  }
  .controls, .score-board, .timer-board {
    padding: 8px 6px;
  }
  .score, .status, .timer {
    font-size: 12px;
    padding: 3px 6px;
  }
  .restart-btn, .mode-btn {
    padding: 3px 6px;
    font-size: 13px;
    margin-right: 10px;
  }
  .size-label {
    font-size: 16px;
    padding: 0 5px;
  }
  .picker-text {
    font-size: 16px;
    padding: 3px 8px;
  }
  .size-selector {
    min-width: auto;
    margin-left: 10px;
  }
  .gomoku-container{
    padding-top: 90px;
  }
}
</style>