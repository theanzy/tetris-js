import './style.css';

const FIELD_TILE_SIZE = 32;
const FIELD_COLS = 10;
const FIELD_ROWS = 20;
const FIELD_WIDTH = FIELD_COLS * FIELD_TILE_SIZE;
const FIELD_HEIGHT = FIELD_ROWS * FIELD_TILE_SIZE;
const FIELD_START = [Math.floor(FIELD_COLS / 2), 0];
const FIELD_BG = 'hsl(252, 4%, 20%)';

const SIDE_TILE_SIZE = 32;
const SIDE_COLS = 5;
const SIDE_ROWS = 20;
const SIDE_BG = 'hsl(0, 4%, 5%)';
const SIDE_WIDTH = SIDE_COLS * SIDE_TILE_SIZE;
const FONT_SIZE = Math.floor(SIDE_TILE_SIZE * 0.56);

const GAME_WIDTH = FIELD_WIDTH + SIDE_WIDTH;
const GAME_HEIGHT = FIELD_HEIGHT;

type TetroShape = 'T' | 'O' | 'J' | 'L' | 'I' | 'S' | 'Z';
const TETROMINOES: Record<TetroShape, [number, number][]> = {
  T: [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
  ],
  O: [
    [0, 0],
    [0, -1],
    [1, 0],
    [1, -1],
  ],
  J: [
    [0, 0],
    [-1, 0],
    [0, -1],
    [0, -2],
  ],
  L: [
    [0, 0],
    [1, 0],
    [0, -1],
    [0, -2],
  ],
  I: [
    [0, 0],
    [0, 1],
    [0, -1],
    [0, -2],
  ],
  S: [
    [0, 0],
    [-1, 0],
    [0, -1],
    [1, -1],
  ],
  Z: [
    [0, 0],
    [1, 0],
    [0, -1],
    [-1, -1],
  ],
};

const LINE_SCORE_MULTIPLIER = 20;

const TETRO_SHAPES = Object.keys(TETROMINOES) as [TetroShape, ...TetroShape[]];
function randomTetroShape() {
  const idx = Math.floor(Math.random() * TETRO_SHAPES.length);
  return TETRO_SHAPES[idx];
}
const TETRO_HUES = new Map<TetroShape, number>();

const TETRO_COLORS = TETRO_SHAPES.reduce((res, s, idx) => {
  const h = (idx * 40) % 255;
  res[s] = `hsl(${h}, 80%, 66%)`;
  TETRO_HUES.set(s, h);
  return res;
}, {} as Record<TetroShape, string>);

const DIRECTIONS = {
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
} as const;
type Direction = keyof typeof DIRECTIONS;
class BlockSFX {
  size: number;
  x: number;
  y: number;
  color: string;
  angle: number;
  alive: boolean;
  constructor(size: number, x: number, y: number, color: string) {
    this.size = size;
    // use coordinates here
    this.x = x * this.size;
    this.y = y * this.size;
    this.color = color;
    this.angle = 0.2;
    this.alive = true;
  }
  render(ctx: CanvasRenderingContext2D) {
    if (!this.alive) {
      return;
    }
    ctx.strokeStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(this.x + 2, this.y + 2, this.size - 4, this.size - 4, 3);
    ctx.stroke();
    ctx.closePath();
  }
  update(dt: number) {
    if (!this.alive) {
      return;
    }
    const d = 0.2 * dt;
    const halfd = 0.1 * dt;
    this.size += d;
    this.x -= halfd;
    this.y -= halfd;
    if (this.size >= FIELD_TILE_SIZE + 10) {
      this.alive = false;
    }
  }
}

class Block {
  size: number;
  x: number;
  y: number;
  color: string;
  constructor(size: number, x: number, y: number, color: string) {
    this.size = size;
    this.x = x;
    this.y = y;
    this.color = color;
  }
  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(
      this.x * this.size + 2,
      this.y * this.size + 2,
      this.size - 4,
      this.size - 4,
      3
    );
    ctx.fill();
    ctx.closePath();
  }
  move(d: [number, number]) {
    this.x += d[0];
    this.y += d[1];
  }

  getRotation(pivot: [number, number]) {
    return rotatePoint([this.x, this.y], pivot);
  }
}

class Tetromino {
  shape: TetroShape;
  blocks: Block[];
  isLanded: boolean;
  filledGrid: string[][];
  constructor(filledGrid: string[][], startPos = FIELD_START) {
    this.shape = randomTetroShape();
    const tetro = TETROMINOES[this.shape];
    const minY = tetro.reduce((r, t) => {
      return Math.min(r, t[1]);
    }, Infinity);

    this.blocks = tetro.map(
      ([x, y]) =>
        new Block(
          FIELD_TILE_SIZE,
          startPos[0] + x,
          startPos[1] + y - minY,
          TETRO_COLORS[this.shape]
        )
    );
    this.isLanded = false;
    this.filledGrid = filledGrid;
  }

  filled(x: number, y: number) {
    return Boolean(this.filledGrid[y]?.[x]);
  }

  rotate() {
    if (this.shape === 'O') {
      return;
    }
    const first = this.blocks[0];
    const pivot = [first.x, first.y];
    let newPos = this.blocks.map((b) => b.getRotation(pivot as any));

    let canRotate = false;
    let shifted = newPos.slice();
    // shift right
    for (let i = 0; i <= 4; i++) {
      shifted = newPos.map(([x, y]) => [x + i, y]);
      canRotate = !this.isCollide(shifted);
      if (canRotate) {
        newPos = shifted;
        break;
      }
    }
    if (!canRotate) {
      // shift left
      for (let i = 1; i <= 4; i++) {
        shifted = newPos.map(([x, y]) => [x - i, y]);
        canRotate = !this.isCollide(shifted);
        if (canRotate) {
          newPos = shifted;
          break;
        }
      }
    }

    if (canRotate) {
      this.blocks.forEach((b, i) => {
        b.x = newPos[i][0];
        b.y = newPos[i][1];
      });
    }
  }

  isCollide(positions: number[][]) {
    return positions.some((p) => {
      const xCollide = p[0] < 0 || p[0] >= FIELD_COLS;
      const yCollide = p[1] >= FIELD_ROWS;
      const collided = yCollide || xCollide || this.filled(p[0], p[1]);
      return collided;
    });
  }

  move(dir: Direction) {
    let vDir = DIRECTIONS[dir];
    const newBlockPos = this.blocks.map((b) => [b.x + vDir[0], b.y + vDir[1]]);
    const canmove = !this.isCollide(newBlockPos);
    if (canmove) {
      this.blocks.forEach((b) => {
        b.x += vDir[0];
        b.y += vDir[1];
      });
    } else if (dir === 'down') {
      this.isLanded = true;
    }
  }

  update(dt: number) {
    this.move('down');
  }

  render(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.blocks.length; i++) {
      const b = this.blocks[i];
      b.render(ctx);
    }
  }
}

function setupCanvas() {
  const canvas = document.querySelector('#myCanvas') as HTMLCanvasElement;
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  canvas.style.height = `${GAME_HEIGHT}px`;
  canvas.style.backgroundColor = FIELD_BG;

  canvas.style.maxHeight = '100%';
  canvas.style.maxWidth = '100%';
  canvas.style.imageRendering = 'crisp-edges';
  return canvas;
}

let lastTime = 0;

function drawText(
  ctx: CanvasRenderingContext2D,
  msg: string,
  x: number,
  y: number,
  fontSize = 20
) {
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'white';
  ctx.font = `bold ${fontSize}px Play`;
  ctx.fillText(msg, x, y);
}

function rotatePoint(pos: [number, number], pivot: [number, number]) {
  const r1 = [pos[0] - pivot[0], pos[1] - pivot[1]];
  const r2 = [-r1[1], r1[0]];
  return [r2[0] + pivot[0], r2[1] + pivot[1]] as [number, number];
}

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  currentTetromino: Tetromino;
  nextTetromino: Tetromino;
  dropTick: number;
  dropInterval: number;
  keys: string[];
  waitTicks: Map<string, { delay: number; tick: number }>;
  filledGrid: string[][];
  score: number;
  blockEffects: BlockSFX[];
  state: 'game-over' | 'playing';
  sideTetroPositions: Record<TetroShape, number[][]>;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.ctx.imageSmoothingEnabled = false;
    this.filledGrid = Array.from({ length: FIELD_ROWS }, () => {
      return Array.from({ length: FIELD_COLS }, () => {
        return '';
      });
    });
    this.currentTetromino = new Tetromino(this.filledGrid);
    this.nextTetromino = new Tetromino(this.filledGrid);
    this.dropTick = 0;
    this.dropInterval = 400;
    this.keys = [];
    this.setupControls();
    this.waitTicks = new Map();
    this.score = 0;
    this.blockEffects = [];
    this.state = 'playing';
    this.sideTetroPositions = TETRO_SHAPES.reduce((r, shape) => {
      const tetro = TETROMINOES[shape];
      r[shape] = this.tetroCenteredPos(tetro, {
        left: FIELD_WIDTH,
        right: FIELD_WIDTH + SIDE_TILE_SIZE * 5,
        top: SIDE_TILE_SIZE * 3,
        bottom: SIDE_TILE_SIZE * 3 + SIDE_TILE_SIZE * 2,
      });
      return r;
    }, {} as Record<TetroShape, number[][]>);
  }

  setupControls() {
    window.onkeydown = (e) => {
      if (!this.keys.includes(e.key)) {
        this.keys.push(e.key);
      }
    };
    window.onkeyup = (e) => {
      const idx = this.keys.findIndex((k) => k === e.key);
      if (idx !== -1) {
        this.keys.splice(idx, 1);
      }
    };
  }

  control(dt: number) {
    const k = this.getKey();
    if (this.wait('control', 80, dt)) {
      if (k === 'ArrowLeft') {
        this.currentTetromino.move('left');
      } else if (k === 'ArrowRight') {
        this.currentTetromino.move('right');
      } else if (k === 'ArrowDown') {
        this.currentTetromino.move('down');
      }
    }
    if (k === 'ArrowUp' && this.wait('ArrowUp', 100, dt)) {
      this.keys.pop();
      this.currentTetromino.rotate();
    }
  }

  getKey() {
    return this.keys[this.keys.length - 1];
  }

  drawGrid() {
    this.ctx.strokeStyle = 'black';
    for (let r = 0; r < FIELD_ROWS; r++) {
      for (let c = 0; c < FIELD_COLS; c++) {
        this.ctx.strokeRect(
          c * FIELD_TILE_SIZE,
          r * FIELD_TILE_SIZE,
          FIELD_TILE_SIZE,
          FIELD_TILE_SIZE
        );
      }
    }
  }

  getDropPreview(tetro: Tetromino, filledGrid: string[][]) {
    let previewPos: number[][] = [];
    const maxY = tetro.blocks.reduce((r, b) => Math.max(r, b.y), -Infinity);
    for (let i = maxY; i < FIELD_ROWS; i++) {
      const newPos = tetro.blocks.map((b) => [b.x, b.y + (i - maxY)]);
      if (newPos.some(([x, y]) => filledGrid[y]?.[x])) {
        break;
      }
      previewPos = newPos;
    }
    return previewPos;
  }

  drawDropPreview(ctx: CanvasRenderingContext2D, tetro: Tetromino) {
    const previewPos = this.getDropPreview(tetro, this.filledGrid);
    ctx.strokeStyle = `${tetro.blocks[0].color}`;
    for (let i = 0; i < previewPos.length; i++) {
      const pos = previewPos[i];
      ctx.beginPath();
      ctx.roundRect(
        pos[0] * FIELD_TILE_SIZE + 2,
        pos[1] * FIELD_TILE_SIZE + 2,
        FIELD_TILE_SIZE - 4,
        FIELD_TILE_SIZE - 4,
        4
      );
      ctx.stroke();
      ctx.closePath();
    }
  }

  drawHardDropEffect(ctx: CanvasRenderingContext2D, tetro: Tetromino) {
    let startX = +Infinity;
    let endX = -Infinity;
    let startY = -Infinity;

    for (let i = 0; i < tetro.blocks.length; i++) {
      startX = Math.min(tetro.blocks[i].x, startX);
      endX = Math.max(tetro.blocks[i].x, endX);
      startY = Math.max(tetro.blocks[i].y, startY);
    }

    const dropPreview = this.getDropPreview(tetro, this.filledGrid);
    const endY = dropPreview.reduce((r, [x, y]) => Math.max(r, y), -Infinity);

    for (let i = startY; i <= endY; i++) {
      ctx.fillStyle = `hsl(${TETRO_HUES.get(tetro.shape)},10%, ${
        (endY - i) * 2 + 20
      }%)`;
      for (let j = startX; j <= endX; j++) {
        ctx.fillRect(
          j * FIELD_TILE_SIZE,
          i * FIELD_TILE_SIZE,
          FIELD_TILE_SIZE,
          FIELD_TILE_SIZE
        );
      }
    }
  }

  drawSide(offsetX: number) {
    drawText(
      this.ctx,
      `Score ${this.score}`,
      offsetX + SIDE_TILE_SIZE - 20,
      FONT_SIZE,
      FONT_SIZE
    );

    drawText(
      this.ctx,
      'Next',
      offsetX + SIDE_TILE_SIZE - 20,
      SIDE_TILE_SIZE * 2,
      FONT_SIZE
    );

    this.ctx.fillStyle = SIDE_BG;
    const startX = offsetX + SIDE_TILE_SIZE;
    const startY = SIDE_TILE_SIZE * 3;
    this.ctx.fillRect(
      startX - SIDE_TILE_SIZE,
      startY,
      SIDE_TILE_SIZE * 5,
      SIDE_TILE_SIZE * 2
    );
    this.ctx.fillStyle = this.nextTetromino.blocks[0].color;
    this.sideTetroPositions[this.nextTetromino.shape].forEach((t) => {
      this.ctx.beginPath();
      this.ctx.roundRect(t[0], t[1], SIDE_TILE_SIZE - 4, SIDE_TILE_SIZE - 4, 4);
      this.ctx.fill();
      this.ctx.closePath();
    });
  }

  tetroCenteredPos(
    tetro: [number, number][],
    box: { left: number; top: number; bottom: number; right: number }
  ) {
    let tleft = tetro.reduce((r, b) => Math.min(r, b[0]), Infinity);
    let tright = tetro.reduce((r, b) => Math.max(r, b[0]), -Infinity);
    let ttop = tetro.reduce((r, b) => Math.min(r, b[1]), Infinity);
    let tbottom = tetro.reduce((r, b) => Math.max(r, b[1]), -Infinity);

    let newPos = tetro;
    if (Math.abs(ttop - tbottom) >= 2) {
      newPos = newPos.map((p) => rotatePoint(p, newPos[0]));

      tleft = newPos.reduce((r, b) => Math.min(r, b[0]), Infinity);
      tright = newPos.reduce((r, b) => Math.max(r, b[0]), -Infinity);
      ttop = newPos.reduce((r, b) => Math.min(r, b[1]), Infinity);
      tbottom = newPos.reduce((r, b) => Math.max(r, b[1]), -Infinity);
    }

    const widthBox = Math.abs(box.right - box.left);
    const widthTetro = (Math.abs(tright - tleft) + 1) * SIDE_TILE_SIZE;
    const offsetX = (widthBox - widthTetro) / 2;

    const heightBox = Math.abs(box.top - box.bottom);

    const heightTetro = (Math.abs(tbottom - ttop) + 1) * SIDE_TILE_SIZE;
    const offsetY = (heightBox - heightTetro) / 2;

    return newPos.map((t) => [
      box.left + offsetX + (t[0] - tleft) * SIDE_TILE_SIZE,
      box.top + offsetY + (t[1] - ttop) * SIDE_TILE_SIZE,
    ]);
  }
  startWait(key: string, delay: number) {
    this.waitTicks.set(key, { delay, tick: 0 });
  }

  wait(key: string, delay: number, dt: number) {
    if (!this.waitTicks.has(key)) {
      this.waitTicks.set(key, { delay, tick: 0 });
    }
    const t = this.waitTicks.get(key);
    if (!t) {
      return false;
    }
    t.tick += dt;
    if (t.tick >= t.delay) {
      t.tick = 0;
      return true;
    }
    return false;
  }

  clearLines() {
    let rowToFill = FIELD_ROWS - 1;
    let clearedLines = 0;
    for (let r = FIELD_ROWS - 1; r >= 0; r--) {
      // fill cleared row
      for (let c = 0; c < FIELD_COLS; c++) {
        this.filledGrid[rowToFill][c] = this.filledGrid[r][c];
      }
      const lineFull = this.filledGrid[r].every((x) => x !== '');
      // keep row if it is not filled
      if (!lineFull) {
        rowToFill -= 1;
      } else {
        clearedLines += 1;
        for (let c = 0; c < FIELD_COLS; c++) {
          const color = this.filledGrid[r][c];
          this.blockEffects.push(new BlockSFX(FIELD_TILE_SIZE, c, r, color));
        }
      }
    }
    this.score += clearedLines * LINE_SCORE_MULTIPLIER;
  }

  render(dt: number) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // update
    if (this.state === 'playing') {
      if (this.getKey() === ' ' && this.wait('space-key', 100, dt)) {
        this.keys.pop();
        this.startWait('hard-dropping', 100);
      } else if (this.waitTicks.has('hard-dropping')) {
        this.drawHardDropEffect(this.ctx, this.currentTetromino);
        this.currentTetromino.move('down');
        if (
          this.wait('hard-dropping', 100, dt) &&
          this.currentTetromino.isLanded
        ) {
          this.waitTicks.delete('hard-dropping');
          this.tetroLanded();
        }
      } else {
        this.control(dt);
        this.dropTick += dt;
        if (this.dropTick >= this.dropInterval) {
          this.currentTetromino.update(dt);
          if (this.currentTetromino.isLanded) {
            this.tetroLanded();
          }
          this.dropTick = 0;
        }
      }
      for (let i = 0; i < this.blockEffects.length; i++) {
        const bfx = this.blockEffects[i];
        bfx.update(dt);
        if (!bfx.alive) {
          this.blockEffects.slice(i, 1);
          continue;
        }
      }
    }
    // draw
    this.drawFilled(this.ctx);
    this.drawGrid();
    this.drawDropPreview(this.ctx, this.currentTetromino);
    this.currentTetromino.render(this.ctx);
    for (let i = 0; i < this.blockEffects.length; i++) {
      const bfx = this.blockEffects[i];
      bfx.render(this.ctx);
    }
    this.drawSide(FIELD_WIDTH);
    if (this.state === 'game-over') {
      this.ctx.fillStyle = 'hsla(0,0%,0%,0.4)';
      this.ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
      drawText(
        this.ctx,
        'Game over',
        FIELD_WIDTH / 2 - FIELD_TILE_SIZE * 2,
        FIELD_HEIGHT / 2 - FIELD_TILE_SIZE,
        FONT_SIZE * 2
      );
    }
  }
  tetroLanded() {
    // fill grid
    this.currentTetromino.blocks.forEach((b) => {
      if (b.y >= 0) {
        this.filledGrid[b.y][b.x] = b.color;
      }
    });
    this.clearLines();

    if (this.currentTetromino.blocks.some((b) => b.y <= 0)) {
      this.state = 'game-over';
    }

    this.currentTetromino = this.nextTetromino;
    this.nextTetromino = new Tetromino(this.filledGrid);
  }

  drawFilled(ctx: CanvasRenderingContext2D) {
    for (let r = 0; r < this.filledGrid.length; r++) {
      for (let c = 0; c < this.filledGrid[r].length; c++) {
        if (!this.filledGrid[r][c]) {
          continue;
        }
        const x = c * FIELD_TILE_SIZE;
        const y = r * FIELD_TILE_SIZE;
        ctx.fillStyle = this.filledGrid[r][c];
        ctx.beginPath();
        ctx.roundRect(
          x + 2,
          y + 2,
          FIELD_TILE_SIZE - 4,
          FIELD_TILE_SIZE - 4,
          3
        );
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}

function run() {
  const canvas = setupCanvas();
  const game = new Game(canvas);
  function render(ts: number) {
    requestAnimationFrame(render);
    const dt = ts - lastTime;
    lastTime = ts;
    game.render(dt);
  }
  requestAnimationFrame(render);
}

document.addEventListener('DOMContentLoaded', run);
