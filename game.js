/* =====================================================
   2048 游戏逻辑（纯函数部分，可在 Node.js 中运行测试）
   ===================================================== */

const SIZE = 4;         // 棋盘尺寸 4x4
const WIN_VALUE = 2048; // 合成这个数字即获胜
let nextTileId = 1;

// 创建空棋盘
function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

// 新方块的值：90% 为 2，10% 为 4
function randomTileValue() {
  return Math.random() < 0.9 ? 2 : 4;
}

// 随机在一个空格子生成新方块，返回该方块（无空格时返回 null）
function addRandomTile(grid) {
  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) cells.push([r, c]);
    }
  }
  if (!cells.length) return null;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  const tile = { id: nextTileId++, value: randomTileValue(), row: r, col: c };
  grid[r][c] = tile;
  return tile;
}

// 计算一次移动，返回 { slides, merges, scoreGain, moved }
// slides：移动但不合并的方块 [{ tile, row, col }]
// merges：合并的方块 [{ keep, die, row, col, newValue }]
//   keep 是保留的方块对象（合并后值翻倍），die 是被吞并的方块
function findMove(grid, dir) {
  const horizontal = dir === 'left' || dir === 'right';
  const reverse = dir === 'right' || dir === 'down';
  const slides = [];
  const merges = [];
  let scoreGain = 0;
  let moved = false;

  for (let i = 0; i < SIZE; i++) {
    // 取出这一行（或列）上的所有方块，保持顺序
    const line = [];
    for (let j = 0; j < SIZE; j++) {
      const [r, c] = horizontal ? [i, j] : [j, i];
      if (grid[r][c]) line.push(grid[r][c]);
    }
    if (reverse) line.reverse();

    // 贪心合并：相邻相等即合并，每个方块每步最多合并一次
    const out = [];
    for (let k = 0; k < line.length; k++) {
      const a = line[k];
      const b = line[k + 1];
      if (b && a.value === b.value) {
        out.push({ a, b, value: a.value * 2 });
        k++;
      } else {
        out.push({ a });
      }
    }

    // 计算每个方块的目标位置
    for (let k = 0; k < out.length; k++) {
      const idx = reverse ? SIZE - 1 - k : k;
      const [r, c] = horizontal ? [i, idx] : [idx, i];
      const entry = out[k];
      if (entry.b) {
        merges.push({ keep: entry.a, die: entry.b, row: r, col: c, newValue: entry.value });
        scoreGain += entry.value;
        moved = true;
      } else {
        slides.push({ tile: entry.a, row: r, col: c });
        if (entry.a.row !== r || entry.a.col !== c) moved = true;
      }
    }
  }
  return { slides, merges, scoreGain, moved };
}

// 应用一次移动，返回新棋盘（会就地修改方块对象，用于动画追踪）
function applyMove(grid, mv) {
  const newGrid = emptyGrid();
  for (const m of mv.merges) {
    m.keep.value = m.newValue;
    m.keep.row = m.row;
    m.keep.col = m.col;
    newGrid[m.row][m.col] = m.keep;
    m.die.dead = true;
  }
  for (const s of mv.slides) {
    s.tile.row = s.row;
    s.tile.col = s.col;
    newGrid[s.row][s.col] = s.tile;
  }
  return newGrid;
}

// 是否还能继续移动（有空位或有相邻相同的方块）
function canMove(grid) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) return true;
      const v = grid[r][c].value;
      if (c + 1 < SIZE && grid[r][c + 1] && grid[r][c + 1].value === v) return true;
      if (r + 1 < SIZE && grid[r + 1][c] && grid[r + 1][c].value === v) return true;
    }
  }
  return false;
}

// 是否已合成 2048
function hasWon(grid) {
  for (const row of grid) {
    for (const t of row) {
      if (t && t.value >= WIN_VALUE) return true;
    }
  }
  return false;
}

/* =====================================================
   浏览器端：渲染与交互
   ===================================================== */
if (typeof document !== 'undefined') {
  (function () {
    const board = document.getElementById('board');
    const scoreEl = document.getElementById('score');
    const bestEl = document.getElementById('best');
    const scoreBoxEl = scoreEl.closest('.score-box');
    const undoBtn = document.getElementById('undo');
    const overlay = document.getElementById('overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlaySub = document.getElementById('overlay-sub');
    const overlayContinue = document.getElementById('overlay-continue');
    const overlayRestart = document.getElementById('overlay-restart');

    const BEST_KEY = 'best-2048-score';
    const ANIM_MS = 130; // 与 CSS 滑动动画时长保持一致

    let grid = emptyGrid();
    let score = 0;
    let best = Number(localStorage.getItem(BEST_KEY)) || 0;
    let history = [];   // 撤销栈
    let over = false;
    let won = false;
    let animating = false;
    let seq = 0;        // 动画序列号，防止新游戏/撤销打断进行中的动画
    const tileDivs = new Map(); // tile.id -> DOM

    // ---------- 工具 ----------
    function cellPos(row, col) {
      const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gap'));
      const size = (board.clientWidth - gap * (SIZE + 1)) / SIZE;
      return { x: gap + col * (size + gap), y: gap + row * (size + gap), size };
    }

    function tileClass(value) {
      return value <= WIN_VALUE ? 'tile-' + value : 'tile-super';
    }

    function fontSizeRatio(value) {
      const d = String(value).length;
      if (d <= 1) return 0.52;
      if (d === 2) return 0.46;
      if (d === 3) return 0.38;
      if (d === 4) return 0.31;
      return 0.25;
    }

    // 刷新方块 DOM 的内容与位置；可传入 value 覆盖显示值（合并动画用）
    function refreshTileDiv(tile, div, row, col, value) {
      const v = value == null ? tile.value : value;
      const inner = div.firstElementChild;
      const { x, y, size } = cellPos(row == null ? tile.row : row, col == null ? tile.col : col);
      inner.textContent = v;
      inner.className = 'tile-inner ' + tileClass(v);
      inner.style.fontSize = Math.round(size * fontSizeRatio(v)) + 'px';
      div.style.width = size + 'px';
      div.style.height = size + 'px';
      div.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    }

    function createTileDiv(tile, appear) {
      const div = document.createElement('div');
      div.className = 'tile';
      const inner = document.createElement('div');
      inner.className = 'tile-inner';
      div.appendChild(inner);
      board.appendChild(div);
      tileDivs.set(tile.id, div);
      refreshTileDiv(tile, div);
      if (appear) inner.classList.add('appear');
      return div;
    }

    function updateScore() {
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        localStorage.setItem(BEST_KEY, String(best));
      }
      bestEl.textContent = best;
      scoreBoxEl.classList.remove('bump');
      void scoreBoxEl.offsetWidth;
      scoreBoxEl.classList.add('bump');
    }

    function updateUndoBtn() {
      undoBtn.disabled = history.length === 0;
    }

    function showOverlay(title, sub, showContinue) {
      overlayTitle.textContent = title;
      overlaySub.textContent = sub;
      overlayContinue.classList.toggle('hidden', !showContinue);
      overlay.classList.remove('hidden');
    }

    function hideOverlay() {
      overlay.classList.add('hidden');
    }

    function serialize() {
      return {
        grid: grid.map((row) => row.map((t) => (t ? { id: t.id, value: t.value, row: t.row, col: t.col } : null))),
        score,
      };
    }

    function restore(snapshot) {
      grid = snapshot.grid.map((row) =>
        row.map((t) => (t ? { id: t.id, value: t.value, row: t.row, col: t.col } : null))
      );
      score = snapshot.score;
    }

    function renderAllTiles() {
      tileDivs.forEach((div) => div.remove());
      tileDivs.clear();
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (grid[r][c]) createTileDiv(grid[r][c], false);
        }
      }
    }

    function findTileById(id) {
      for (const row of grid) {
        for (const t of row) {
          if (t && t.id === id) return t;
        }
      }
      return null;
    }

    // ---------- 游戏流程 ----------
    function newGame() {
      seq++;
      grid = emptyGrid();
      score = 0;
      history = [];
      over = false;
      won = false;
      animating = false;
      hideOverlay();
      addRandomTile(grid);
      addRandomTile(grid);
      renderAllTiles();
      updateScore();
      updateUndoBtn();
    }

    function move(dir) {
      if (over || animating) return;
      const mv = findMove(grid, dir);
      if (!mv.moved) return;
      animating = true;
      const mySeq = ++seq;

      history.push(serialize());
      if (history.length > 10) history.shift();
      updateUndoBtn();

      grid = applyMove(grid, mv);
      score += mv.scoreGain;
      updateScore();

      // 更新所有方块位置（触发 CSS 滑动动画）
      for (const s of mv.slides) {
        const div = tileDivs.get(s.tile.id);
        if (div) {
          refreshTileDiv(s.tile, div);
          div.style.zIndex = '1';
        }
      }
      for (const m of mv.merges) {
        const keepDiv = tileDivs.get(m.keep.id);
        if (keepDiv) {
          refreshTileDiv(m.keep, keepDiv, m.row, m.col, m.newValue / 2); // 滑动时先显示旧值
          keepDiv.style.zIndex = '2';
        }
        const dieDiv = tileDivs.get(m.die.id);
        if (dieDiv) {
          refreshTileDiv(m.die, dieDiv, m.row, m.col); // 被吞并的方块一起滑向目标格
          dieDiv.style.zIndex = '1';
        }
      }

      setTimeout(() => {
        if (mySeq !== seq) return; // 期间开了新游戏或被撤销，放弃本次动画结算
        // 结算合并：显示新值并弹出动画，移除被吞并的方块
        for (const m of mv.merges) {
          const dieDiv = tileDivs.get(m.die.id);
          if (dieDiv) {
            dieDiv.remove();
            tileDivs.delete(m.die.id);
          }
          const keepDiv = tileDivs.get(m.keep.id);
          if (keepDiv) {
            refreshTileDiv(m.keep, keepDiv);
            keepDiv.style.zIndex = '1';
            const inner = keepDiv.firstElementChild;
            inner.classList.remove('pop');
            void inner.offsetWidth;
            inner.classList.add('pop');
          }
        }
        // 生成新方块
        const tile = addRandomTile(grid);
        if (tile) createTileDiv(tile, true);
        animating = false;

        if (!won && hasWon(grid)) {
          won = true;
          showOverlay('你赢了！🎉', '合成出了 2048！继续挑战更高分吧', true);
        } else if (!canMove(grid)) {
          over = true;
          showOverlay('游戏结束', '本局得分：' + score, false);
        }
      }, ANIM_MS);
    }

    function undo() {
      if (animating || !history.length) return;
      seq++;
      restore(history.pop());
      over = false;
      renderAllTiles();
      updateScore();
      hideOverlay();
      updateUndoBtn();
    }

    // ---------- 事件绑定 ----------
    const keyMap = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      a: 'left', d: 'right', w: 'up', s: 'down',
      A: 'left', D: 'right', W: 'up', S: 'down',
    };
    document.addEventListener('keydown', (e) => {
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        move(dir);
      }
    });

    // 触屏滑动
    let touchStart = null;
    document.addEventListener('touchstart', (e) => {
      touchStart = e.touches[0];
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.clientX;
      const dy = t.clientY - touchStart.clientY;
      touchStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
      else move(dy > 0 ? 'down' : 'up');
    }, { passive: true });

    // 窗口尺寸变化时重新布局
    window.addEventListener('resize', () => {
      for (const [id, div] of tileDivs) {
        const tile = findTileById(id);
        if (tile) refreshTileDiv(tile, div);
      }
    });

    document.getElementById('new-game').addEventListener('click', (e) => {
      e.target.blur();
      newGame();
    });
    undoBtn.addEventListener('click', (e) => {
      e.target.blur();
      undo();
    });
    overlayRestart.addEventListener('click', (e) => {
      e.target.blur();
      newGame();
    });
    overlayContinue.addEventListener('click', (e) => {
      e.target.blur();
      hideOverlay();
    });

    // 生成 16 个背景格
    for (let i = 0; i < SIZE * SIZE; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      board.appendChild(cell);
    }

    newGame();
  })();
}

// 供 Node.js 测试使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SIZE, WIN_VALUE, emptyGrid, addRandomTile, findMove, applyMove, canMove, hasWon, randomTileValue };
}
