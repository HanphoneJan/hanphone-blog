const fs = require('fs');
const path = require('path');

// 游戏名称映射表
const nameMap = {
  '2048': { name: '2048', icon: '🔢', desc: '经典数字拼图游戏' },
  'blackblocks': { name: 'Black Blocks', icon: '⬛', desc: '黑块挑战' },
  'breakout-bricks': { name: 'Breakout Bricks', icon: '🧱', desc: '打砖块' },
  'crossy-road': { name: 'Crossy Road', icon: '🐔', desc: '过马路大冒险' },
  'gomoku': { name: 'Gomoku', icon: '⚫', desc: '五子棋对战' },
  'minesweeper': { name: 'Minesweeper', icon: '💣', desc: '经典扫雷' },
  'ping-pong': { name: 'Ping Pong', icon: '🏓', desc: '乒乓球对战' },
  'shudu': { name: 'Sudoku', icon: '🔢', desc: '数独谜题' },
  'snake': { name: 'Snake', icon: '🐍', desc: '经典贪吃蛇' },
  'tetris': { name: 'Tetris', icon: '🎮', desc: '俄罗斯方块' },
  'tower-blocks': { name: 'Tower Blocks', icon: '🏗️', desc: '堆塔挑战' },
  'toy-claw': { name: 'Toy Claw', icon: '🧸', desc: '抓娃娃机' }
};

// 扫描包含 index.html 的游戏目录
function scanGames() {
  const rootDir = process.cwd();
  const games = [];

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'scripts') {
      const indexPath = path.join(rootDir, entry.name, 'index.html');
      if (fs.existsSync(indexPath)) {
        const gameKey = entry.name.toLowerCase();
        const gameInfo = nameMap[gameKey] || { name: entry.name, icon: '🎮', desc: '游戏' };
        games.push({
          key: entry.name,
          ...gameInfo
        });
      }
    }
  }

  // 按名称排序
  games.sort((a, b) => a.name.localeCompare(b.name));

  return games;
}

// 生成 markdown 表格
function generateGamesList(games) {
  if (games.length === 0) {
    return '> 暂无游戏\n';
  }

  let markdown = '| 图标 | 游戏 | 描述 | 链接 |\n';
  markdown += '|:---:|:---|:---|:---:|:---:|\n';

  for (const game of games) {
    const link = `[${game.name}](https://hanphonejan.github.io/hanphone-game/${game.key}/)`;
    const playLink = `[开始游戏](https://hanphonejan.github.io/hanphone-game/${game.key}/)`;
    markdown += `| ${game.icon} | **${game.name}** | ${game.desc} | ${playLink} |\n`;
  }

  return markdown;
}

// 更新 README.md
function updateReadme() {
  const readmePath = path.join(process.cwd(), 'README.md');

  if (!fs.existsSync(readmePath)) {
    console.error('README.md not found');
    process.exit(1);
  }

  let content = fs.readFileSync(readmePath, 'utf-8');

  const games = scanGames();
  const gamesList = generateGamesList(games);

  const startMarker = '<!-- GAMES-LIST:START -->';
  const endMarker = '<!-- GAMES-LIST:END -->';

  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    console.error('Markers not found in README.md');
    process.exit(1);
  }

  const newContent = content.slice(0, startIndex + startMarker.length) + '\n' +
    gamesList +
    content.slice(endIndex);

  fs.writeFileSync(readmePath, newContent);
  console.log(`Updated README.md with ${games.length} games`);
}

// 主函数
if (require.main === module) {
  updateReadme();
}

module.exports = { scanGames, generateGamesList, updateReadme, nameMap };
