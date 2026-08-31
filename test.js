// 2048 核心逻辑测试（Node 运行：node test.js）
const { emptyGrid, addRandomTile, findMove, applyMove, canMove, hasWon } = require('./game.js');

let id = 0;
let passed = 0;
let failed = 0;

function ok(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error('  FAIL: ' + msg);
  }
}

function makeGrid(rows) {
  return rows.map((r, i) => r.map((v, j) => (v ? { id: ++id, value: v, row: i, col: j } : null)));
}

function values(grid) {
  return grid.map((r) => r.map((t) => (t ? t.value : 0)));
}

function eq(actual, expected, msg) {
  ok(
    JSON.stringify(actual) === JSON.stringify(expected),
    msg + ' | expected ' + JSON.stringify(expected) + ' got ' + JSON.stringify(actual)
  );
}

const BLANK = [0, 0, 0, 0];

// 1. 基本合并
(function () {
  let g = makeGrid([[2, 2, 0, 0], BLANK, BLANK, BLANK]);
  const mv = findMove(g, 'left');
  ok(mv.moved && mv.scoreGain === 4, 'left on [2,2,0,0] should gain 4');
  g = applyMove(g, mv);
  eq(values(g), [[4, 0, 0, 0], BLANK, BLANK, BLANK], 'left on [2,2,0,0]');
})();

// 2. 一行四个相同数字只合并一次
(function () {
  let g = makeGrid([[2, 2, 2, 2], BLANK, BLANK, BLANK]);
  const mv = findMove(g, 'left');
  ok(mv.scoreGain === 8, '[2,2,2,2] left should gain 8');
  g = applyMove(g, mv);
  eq(values(g)[0], [4, 4, 0, 0], '[2,2,2,2] left -> [4,4,0,0]');
})();

// 3. 不同数字的合并
(function () {
  let g = makeGrid([[4, 2, 2, 0], BLANK, BLANK, BLANK]);
  g = applyMove(g, findMove(g, 'left'));
  eq(values(g)[0], [4, 4, 0, 0], '[4,2,2,0] left -> [4,4,0,0]');
})();

// 4. 向右合并（右侧优先）
(function () {
  let g = makeGrid([[2, 2, 2, 0], BLANK, BLANK, BLANK]);
  g = applyMove(g, findMove(g, 'right'));
  eq(values(g)[0], [0, 0, 2, 4], '[2,2,2,0] right -> [0,0,2,4]');
})();

// 5. 向上合并
(function () {
  let g = makeGrid([[2, 0, 0, 0], [2, 0, 0, 0], BLANK, BLANK]);
  g = applyMove(g, findMove(g, 'up'));
  ok(g[0][0] && g[0][0].value === 4, '[2]/[2] up -> 4 at top');
  ok(!g[1][0], 'row1 col0 should be empty after up');
})();

// 6. 向下合并
(function () {
  let g = makeGrid([[2, 0, 0, 0], BLANK, [2, 0, 0, 0], BLANK]);
  g = applyMove(g, findMove(g, 'down'));
  ok(g[3][0] && g[3][0].value === 4, '[2]/[0]/[2] down -> 4 at bottom');
})();

// 7. 无法移动的检测
(function () {
  const g = makeGrid([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]);
  ok(!findMove(g, 'left').moved, 'checkerboard left should not move');
  ok(!findMove(g, 'up').moved, 'checkerboard up should not move');
  ok(!canMove(g), 'canMove should be false on checkerboard');
})();

// 8. canMove 的真值
(function () {
  ok(canMove(makeGrid([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 0]])), 'canMove true with empty cell');
  ok(
    canMove(makeGrid([[2, 2, 4, 8], [4, 8, 16, 32], [16, 32, 64, 128], [256, 512, 1024, 2048]])),
    'canMove true with adjacent equal'
  );
})();

// 9. 胜利判定
(function () {
  let g = makeGrid([[1024, 1024, 0, 0], BLANK, BLANK, BLANK]);
  g = applyMove(g, findMove(g, 'left'));
  ok(hasWon(g), '1024+1024 -> 2048 should win');
})();

// 10. 随机模拟：不变量 + 终局
(function () {
  let g = emptyGrid();
  addRandomTile(g);
  addRandomTile(g);
  const dirs = ['left', 'right', 'up', 'down'];
  const sum = (grid) => grid.reduce((s, row) => s + row.reduce((a, t) => a + (t ? t.value : 0), 0), 0);
  let steps = 0;

  while (canMove(g) && steps < 20000) {
    const sumBefore = sum(g);
    let didMove = false;
    for (const d of dirs) {
      const mv = findMove(g, d);
      if (mv.moved) {
        const mergedSum = mv.merges.reduce((a, m) => a + m.newValue, 0);
        ok(mv.scoreGain === mergedSum, 'score gain should equal merged sum');
        g = applyMove(g, mv);
        didMove = true;
        break;
      }
    }
    if (!didMove) break;
    ok(sum(g) === sumBefore, 'merge/slide should not change total tile sum');
    if (!addRandomTile(g)) break;
    steps++;
    for (const row of g) {
      for (const cell of row) {
        if (cell) ok(Number.isInteger(Math.log2(cell.value)), 'tile value must be power of 2: ' + cell.value);
      }
    }
  }
  ok(!canMove(g), 'simulation should end in a dead position (steps: ' + steps + ')');
})();

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed) process.exit(1);
