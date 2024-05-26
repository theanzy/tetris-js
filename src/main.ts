import './style.css';

const FIELD_TILE_SIZE = 32;
const FIELD_COLS = 10;
const FIELD_ROWS = 20;
const FIELD_WIDTH = FIELD_COLS * FIELD_TILE_SIZE;
const FIELD_HEIGHT = FIELD_ROWS * FIELD_TILE_SIZE;
const FIELD_START = [Math.floor(FIELD_COLS / 2), 0];

const FIELD_BG = 'hsl(252, 4%, 25%)';
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

const DIRECTIONS = {
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
} as const;
type Direction = keyof typeof DIRECTIONS;

class Block {
  size: number;
  x: number;
  y: number;
  color: string;
  constructor(size: number, x: number, y: number) {
    this.size = size;
    this.x = x;
    this.y = y;
    this.color = 'orange';
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
}

class Tetromino {
  shape: TetroShape;
  blocks: Block[];
  isLanded: boolean;
  constructor() {
    this.shape = 'L';
    const tetro = TETROMINOES[this.shape];
    const startPos = FIELD_START;
    this.blocks = tetro.map(
      ([x, y]) => new Block(FIELD_TILE_SIZE, startPos[0] + x, startPos[1] + y)
    );
    this.isLanded = false;
  }

  landed(y: number) {
    if (y >= FIELD_ROWS) {
      this.isLanded = true;
    }
    return this.isLanded;
  }

  isCollide(dir: [number, number]) {
    const newBlockPos = this.blocks.map((b) => [b.x + dir[0], b.y + dir[1]]);
    return newBlockPos.some((p) => {
      const xCollide = p[0] < 0 || p[0] >= FIELD_COLS;
      return this.landed(p[1]) || xCollide;
    });
  }

  move(dir: Direction) {
    let vDir = DIRECTIONS[dir];
    const canmove = !this.isCollide(vDir as [number, number]);
    if (canmove) {
      this.blocks.forEach((b) => {
        b.x += vDir[0];
        b.y += vDir[1];
      });
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
  canvas.width = FIELD_WIDTH;
  canvas.height = FIELD_HEIGHT;
  canvas.style.height = `${FIELD_HEIGHT}px`;
  canvas.style.backgroundColor = FIELD_BG;

  canvas.style.maxHeight = '100%';
  canvas.style.maxWidth = '100%';
  canvas.style.imageRendering = 'crisp-edges';
  return canvas;
}

let lastTime = 0;

function debug(
  ctx: CanvasRenderingContext2D,
  msg: string,
  x: number,
  y: number
) {
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px Play';
  ctx.fillText(msg, x, y);
}

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  currentTetromino: Tetromino;
  dropTick: number;
  dropInterval: number;
  keys: string[];
  waitTicks: Map<string, { delay: number; tick: number }>;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.ctx.imageSmoothingEnabled = false;
    this.currentTetromino = new Tetromino();
    this.dropTick = 0;
    this.dropInterval = 500;
    this.keys = [];
    this.setupControls();
    this.waitTicks = new Map();
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
    const done = this.wait('control', 100, dt);
    if (!done) {
      return;
    }
    const k = this.getKey();
    if (k === 'ArrowLeft') {
      this.currentTetromino.move('left');
    } else if (k === 'ArrowRight') {
      this.currentTetromino.move('right');
    }
  }

  getKey() {
    return this.keys[this.keys.length - 1];
  }

  drawGrid() {
    this.ctx.fillStyle = 'black';
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

  render(dt: number) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // update
    this.control(dt);
    this.dropTick += dt;
    if (this.dropTick >= this.dropInterval) {
      this.currentTetromino.update(dt);
      this.dropTick = 0;
    }

    // draw
    this.drawGrid();
    this.currentTetromino.render(this.ctx);
    debug(this.ctx, `${this.dropTick.toFixed(0)}`, 20, 20);
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
