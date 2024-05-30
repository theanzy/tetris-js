import './style.css';

const FIELD_TILE_SIZE = 32;
const FIELD_COLS = 10;
const FIELD_ROWS = 20;
const FIELD_WIDTH = FIELD_COLS * FIELD_TILE_SIZE;
const FIELD_HEIGHT = FIELD_ROWS * FIELD_TILE_SIZE;
const FIELD_START = [Math.floor(FIELD_COLS / 2), 0];
const FIELD_BG = 'hsl(252, 4%, 16%)';

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

const TETRO_COLORS = TETRO_SHAPES.reduce((res, s, idx) => {
  const h = (idx * 40) % 255;
  res[s] = `hsl(${h}, 80%, 66%)`;
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
    const r1 = [this.x - pivot[0], this.y - pivot[1]];
    const r2 = [-r1[1], r1[0]];
    return [r2[0] + pivot[0], r2[1] + pivot[1]] as [number, number];
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
    const newPos = this.blocks.map((b) => b.getRotation(pivot as any));

    const canRotate = !this.isCollide(newPos);

    if (canRotate) {
      this.blocks.forEach((b, i) => {
        b.x = newPos[i][0];
        b.y = newPos[i][1];
      });
    }
  }

  isCollide(newBlockPos: number[][]) {
    return newBlockPos.some((p) => {
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
    const done = this.wait('control', 80, dt);
    if (!done) {
      return;
    }
    const k = this.getKey();
    if (k === 'ArrowLeft') {
      this.currentTetromino.move('left');
    } else if (k === 'ArrowRight') {
      this.currentTetromino.move('right');
    } else if (k === 'ArrowUp') {
      this.currentTetromino.rotate();
    } else if (k === 'ArrowDown') {
      this.currentTetromino.move('down');
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

  drawSide(offsetX: number) {
    drawText(
      this.ctx,
      `Score ${this.score}`,
      offsetX + SIDE_TILE_SIZE,
      FONT_SIZE,
      FONT_SIZE
    );

    drawText(
      this.ctx,
      'Next',
      offsetX + SIDE_TILE_SIZE,
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
      SIDE_TILE_SIZE * 4
    );
    this.ctx.fillStyle = this.nextTetromino.blocks[0].color;
    const blocks = TETROMINOES[this.nextTetromino.shape];
    blocks.forEach((b) => {
      this.ctx.beginPath();
      this.ctx.roundRect(
        startX + SIDE_TILE_SIZE + b[0] * SIDE_TILE_SIZE + 2,
        startY + SIDE_TILE_SIZE * 2 + b[1] * SIDE_TILE_SIZE + 2,
        SIDE_TILE_SIZE - 4,
        SIDE_TILE_SIZE - 4,
        4
      );
      this.ctx.fill();
      this.ctx.closePath();
    });
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
      this.control(dt);
      this.dropTick += dt;
      if (this.dropTick >= this.dropInterval) {
        this.currentTetromino.update(dt);
        if (this.currentTetromino.isLanded) {
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
        this.dropTick = 0;
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
