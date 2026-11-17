// Deterministic screenshot scenes: ?shot=start|play|end|win&seed=<n> draws a
// fixed scene (a seeded generator, fixed simulated time, no wall clock) and
// sets window.__shotReady once the frame is on the canvas.

import { FIELD } from './config.js';
import { createWorld, updateWorld, comboMultiplier } from './world.js';
import { renderTitle, renderPlaying, renderGameOver, renderVictory } from './render.js';

function seedWorld(seed, seconds, moves) {
  const world = createWorld(seed);
  const noop = { pickup() {}, dash() {}, hit() {}, powerup() {}, levelUp() {}, gameOver() {}, victory() {} };
  for (let step = 0; step < Math.round(seconds * 60); step++) {
    const mv = moves ? moves(step / 60) : { x: 0, y: 0 };
    updateWorld(world, 1 / 60, mv, false, noop);
    if (world.over) break;
  }
  return world;
}

function wander(t) {
  // A gentle deterministic drift, so the play shot always shows the keeper moving.
  return { x: Math.sin(t * 0.9) * 0.8, y: Math.cos(t * 0.6) * 0.5 };
}

export function drawShot(ctx, scene, seed) {
  let world;
  if (scene === 'start') {
    world = createWorld(seed);
    world.best = 1240;
    // A few embers drifting behind the title.
    for (let i = 0; i < 9; i++) {
      world.embers.push({
        x: 120 + i * 130 + world.random() * 40,
        y: 90 + world.random() * 480,
        vy: 60,
        swayPhase: world.random() * 6,
        swaySpeed: 1,
        baseX: 0,
        radius: 9,
        twinkle: world.random() * 6,
      });
      world.embers[i].baseX = world.embers[i].x;
    }
    world.time = 3.2;
    renderTitle(ctx, world, world.time);
  } else if (scene === 'play') {
    world = seedWorld(seed, 26, wander);
    world.score = 1840;
    world.best = 1840;
    world.level = 4;
    world.embersThisLevel = 11;
    world.combo = 17;
    world.multiplier = comboMultiplier(17);
    world.lives = 3;
    world.time = 26;
    // Compose the frame: the keeper mid-field, no hit flash or shake, the
    // wisps spread out instead of piled on the player, embers in view.
    world.flash = 0;
    world.shake = 0;
    world.player.x = 560;
    world.player.y = 400;
    world.player.vx = 90;
    world.player.vy = -50;
    world.player.angle = Math.atan2(-50, 90);
    world.player.invulnerable = 0;
    const spread = [
      [880, 240], [1010, 470], [300, 180], [760, 560], [180, 520], [1120, 300], [420, 620],
    ];
    world.enemies.forEach((en, i) => {
      const spot = spread[i % spread.length];
      en.x = spot[0] + (i % 3) * 24;
      en.y = spot[1] + (i % 2) * 30;
      en.state = 'chase';
      en.stateTime = 0;
    });
    const emberSpots = [[420, 300], [700, 180], [980, 380], [240, 360], [860, 620], [620, 520]];
    emberSpots.forEach(([x, y], i) => {
      if (!world.embers[i]) return;
      world.embers[i].x = x;
      world.embers[i].baseX = x;
      world.embers[i].y = y;
    });
    renderPlaying(ctx, world);
  } else if (scene === 'end') {
    world = seedWorld(seed, 31, wander);
    world.over = true;
    world.stats = {
      score: 2310, level: 5, embers: 87, bestCombo: 21, dashes: 14, powerups: 4,
    };
    world.best = 2310;
    world.time = 31;
    renderGameOver(ctx, world);
  } else if (scene === 'win') {
    world = seedWorld(seed, 12, wander);
    world.over = true;
    world.won = true;
    world.stats = {
      score: 7420, level: 10, embers: 200, bestCombo: 34, dashes: 41, powerups: 11,
    };
    world.best = 7420;
    world.time = 12;
    renderVictory(ctx, world);
  } else {
    return false;
  }
  window.__shotReady = true;
  return true;
}

export const SHOT_SCENES = ['start', 'play', 'end', 'win'];
export { FIELD };
