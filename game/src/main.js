// Emberfall — bootstrap, fixed-step loop and the state machine
// (title -> playing -> paused -> game over / victory -> restart).
// The rules live in world.js; the pictures live in render.js.

import { FIELD, STEP, BEST_KEY } from './config.js';
import { createWorld, updateWorld } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  renderTitle, renderPlaying, renderPaused, renderGameOver, renderVictory,
} from './render.js';
import { drawShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = createInput(canvas);
const audio = createAudio();

const params = new URLSearchParams(location.search);
const shotScene = params.get('shot');
const shotSeed = Number.parseInt(params.get('seed') || '1', 10) || 1;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(FIELD.width * dpr);
  canvas.height = Math.round(FIELD.height * dpr);
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function loadBest() {
  try {
    return Number.parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}
function saveBest(score) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch { /* private mode: the best score just does not persist */ }
}

let state = 'title';
let world = createWorld((Math.random() * 1e9) | 0);
world.best = loadBest();
let accumulator = 0;
let last = performance.now();

function startGame() {
  world = createWorld((Math.random() * 1e9) | 0);
  world.best = loadBest();
  state = 'playing';
  audio.unlock();
  setStatus('Playing. Gather embers, dodge the wisps.');
}

function setStatus(text) {
  statusEl.textContent = text;
}

function frame(now) {
  const elapsed = Math.min((now - last) / 1000, 0.25);
  last = now;

  if (state === 'playing') {
    accumulator += elapsed;
    let guard = 0;
    while (accumulator >= STEP && guard < 8) {
      updateWorld(world, STEP, input.move(), input.dashPressed(), audio);
      accumulator -= STEP;
      guard += 1;
      if (world.over) break;
    }
    if (world.over) {
      if (world.score > world.best) {
        world.best = world.score;
        saveBest(world.score);
      }
      state = world.won ? 'victory' : 'gameover';
      setStatus(world.won
        ? `Dawn breaks! You won with ${world.score} points.`
        : `Game over. Score ${world.score}. Press Enter to play again.`);
    }
  }

  if (input.wasPressed('Enter') || input.wasPressed(' ')) {
    audio.unlock();
    if (state === 'title' || state === 'gameover' || state === 'victory') startGame();
    else if (state === 'paused') state = 'playing';
  }
  if (input.mouse.clicked && (state === 'title' || state === 'gameover' || state === 'victory')) {
    audio.unlock();
    startGame();
  }
  if (input.wasPressed('p') || input.wasPressed('P')) {
    if (state === 'playing') {
      state = 'paused';
      setStatus('Paused.');
    } else if (state === 'paused') {
      state = 'playing';
    }
  }
  if (input.wasPressed('r') || input.wasPressed('R')) {
    if (state === 'paused' || state === 'gameover' || state === 'victory') startGame();
  }
  if (input.wasPressed('m') || input.wasPressed('M')) {
    const muted = audio.toggleMute();
    setStatus(muted ? 'Sound muted.' : 'Sound on.');
  }

  if (state === 'title') renderTitle(ctx, world, now / 1000);
  else if (state === 'playing') renderPlaying(ctx, world);
  else if (state === 'paused') renderPaused(ctx, world);
  else if (state === 'gameover') renderGameOver(ctx, world);
  else if (state === 'victory') renderVictory(ctx, world);

  input.endFrame();
  requestAnimationFrame(frame);
}

if (shotScene) {
  // Screenshot mode: one deterministic frame, then stop. The renderer waits
  // for window.__shotReady before taking the picture.
  drawShot(ctx, shotScene, shotSeed);
} else {
  setStatus('Emberfall. Press Enter to begin.');
  requestAnimationFrame(frame);
}
