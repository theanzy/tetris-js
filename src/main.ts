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

  isCollide() {
    const newBlockPos = this.blocks.map((b) => [b.x, b.y + 1]);
    return newBlockPos.some((p) => this.landed(p[1]));
  }
  update(dt: number) {
    let dir: Direction = 'down';
    let vDir = DIRECTIONS[dir];
    if (!this.isCollide()) {
      this.blocks.forEach((b) => {
        b.x += vDir[0];
        b.y += vDir[1];
      });
    }
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

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.ctx.imageSmoothingEnabled = false;
    this.currentTetromino = new Tetromino();
    this.dropTick = 0;
    this.dropInterval = 500;
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
  render(dt: number) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.dropTick += dt;
    if (this.dropTick >= this.dropInterval) {
      this.currentTetromino.update(dt);
      this.dropTick = 0;
    }

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
