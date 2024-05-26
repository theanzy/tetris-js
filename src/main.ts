import './style.css';

const FIELD_TILE_SIZE = 32;
const FIELD_COLS = 10;
const FIELD_ROWS = 20;
const FIELD_WIDTH = FIELD_COLS * FIELD_TILE_SIZE;
const FIELD_HEIGHT = FIELD_ROWS * FIELD_TILE_SIZE;

const FIELD_BG = 'hsl(252, 4%, 25%)';

function setupCanvas() {
  const canvas = document.querySelector('#myCanvas') as HTMLCanvasElement;
  canvas.width = FIELD_WIDTH;
  canvas.height = FIELD_HEIGHT;
  canvas.style.height = `${FIELD_HEIGHT}px`;
  canvas.style.backgroundColor = FIELD_BG;

  canvas.style.maxHeight = '100%';
  canvas.style.maxWidth = '100%';
  return canvas;
}

let lastTime = 0;

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  }
  render(dt: number) {
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
}
function run() {
  const canvas = setupCanvas();
  const game = new Game(canvas);
  function render(ts: number) {
    requestAnimationFrame(render);
    const dt = ts - lastTime;
    game.render(dt);
  }
  requestAnimationFrame(render);
}

document.addEventListener('DOMContentLoaded', run);
