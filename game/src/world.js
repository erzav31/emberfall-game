// The simulation: the lantern-keeper, falling embers, void wisps, power-ups,
// particles, floating score text, combos, levels and the win/lose rules.
// Pure logic — no drawing here, no DOM here.

import {
  FIELD, PLAYER, LIVES, MAX_LIVES, EMBER, COMBO, ENEMY, POWERUP,
} from './config.js';
import { createRandom, range, pickWeighted } from './random.js';

export function createWorld(seed) {
  const random = createRandom(seed);
  return {
    random,
    time: 0,
    level: 1,
    score: 0,
    best: 0,
    lives: LIVES,
    embersCollected: 0,
    embersThisLevel: 0,
    combo: 0,
    bestCombo: 0,
    multiplier: 1,
    kills: 0,
    dashes: 0,
    powerupsTaken: 0,
    player: {
      x: FIELD.width / 2,
      y: FIELD.height * 0.62,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      dashTime: 0,
      dashCooldown: 0,
      dashDir: { x: 0, y: -1 },
      invulnerable: 0,
      shield: false,
    },
    embers: [],
    enemies: [],
    powerups: [],
    particles: [],
    floats: [],
    emberTimer: 0.6,
    enemyTimer: 2.0,
    powerupTimer: 8,
    levelBanner: 0,
    shake: 0,
    flash: 0,
    slowTimer: 0,
    magnetTimer: 0,
    over: false,
    won: false,
    stats: null,
  };
}

/** Combo multiplier: +1 every COMBO.step chained embers, capped. */
export function comboMultiplier(combo) {
  return Math.min(1 + Math.floor(combo / COMBO.step), COMBO.maxMultiplier);
}

function spawnEmber(world) {
  const { random } = world;
  world.embers.push({
    x: range(random, 30, FIELD.width - 30),
    y: -20,
    vy: EMBER.fallSpeed + (world.level - 1) * EMBER.fallSpeedPerLevel + range(random, -15, 25),
    swayPhase: random() * Math.PI * 2,
    swaySpeed: range(random, 0.8, 1.6),
    baseX: 0,
    radius: EMBER.radius,
    twinkle: random() * Math.PI * 2,
  });
  const e = world.embers[world.embers.length - 1];
  e.baseX = e.x;
}

function spawnEnemy(world) {
  const { random } = world;
  const unlocked = ENEMY.kinds.filter((k) => world.level >= k.fromLevel);
  const spec = pickWeighted(random, unlocked);
  const edge = Math.floor(random() * 4);
  let x;
  let y;
  if (edge === 0) { x = range(random, 40, FIELD.width - 40); y = -30; }
  else if (edge === 1) { x = range(random, 40, FIELD.width - 40); y = FIELD.height + 30; }
  else if (edge === 2) { x = -30; y = range(random, 40, FIELD.height - 40); }
  else { x = FIELD.width + 30; y = range(random, 40, FIELD.height - 40); }
  world.enemies.push({
    kind: spec.kind,
    x, y,
    vx: 0, vy: 0,
    radius: spec.radius,
    speed: spec.speed + (world.level - 1) * 6 + range(random, -12, 12),
    phase: random() * Math.PI * 2,
    state: 'chase',
    stateTime: 0,
    tx: 0, ty: 0,
    wobble: range(random, 0.6, 1.4),
  });
}

function spawnPowerup(world) {
  const { random } = world;
  const kind = POWERUP.kinds[Math.floor(random() * POWERUP.kinds.length)];
  world.powerups.push({
    kind,
    x: range(random, 60, FIELD.width - 60),
    y: range(random, 80, FIELD.height - 120),
    radius: POWERUP.radius,
    born: world.time,
  });
}

function burst(world, x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const a = world.random() * Math.PI * 2;
    const s = speed * (0.3 + world.random() * 0.7);
    world.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.45 + world.random() * 0.35,
      age: 0,
      size: 2 + world.random() * 3.5,
      color,
    });
  }
}

function floatText(world, x, y, text, color) {
  world.floats.push({ x, y, text, color, age: 0, life: 0.9 });
}

function collectEmber(world, ember, audio) {
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.multiplier = comboMultiplier(world.combo);
  const gained = EMBER.points * world.multiplier;
  world.score += gained;
  world.embersCollected += 1;
  world.embersThisLevel += 1;
  burst(world, ember.x, ember.y, '#ffd166', 8, 160);
  floatText(world, ember.x, ember.y - 14, `+${gained}`, world.multiplier > 1 ? '#ffd166' : '#f4f1e6');
  audio.pickup(world.combo);
  if (world.embersThisLevel >= EMBER.perLevel) {
    if (world.level >= EMBER.winLevel) {
      world.won = true;
      world.over = true;
      world.stats = endStats(world);
      audio.victory();
    } else {
      world.level += 1;
      world.embersThisLevel = 0;
      world.levelBanner = 2.2;
      burst(world, world.player.x, world.player.y, '#7ef0c1', 26, 260);
      audio.levelUp();
    }
  }
}

function hurtPlayer(world, audio) {
  const p = world.player;
  if (p.invulnerable > 0 || p.dashTime > 0) return;
  if (p.shield) {
    p.shield = false;
    p.invulnerable = 1.2;
    burst(world, p.x, p.y, '#7ef0c1', 18, 220);
    floatText(world, p.x, p.y - 30, 'SHIELD!', '#7ef0c1');
    audio.powerup();
    return;
  }
  world.lives -= 1;
  world.combo = 0;
  world.multiplier = 1;
  p.invulnerable = PLAYER.invulnerable;
  world.shake = 14;
  world.flash = 0.35;
  burst(world, p.x, p.y, '#ff5d8f', 26, 300);
  audio.hit();
  if (world.lives <= 0) {
    world.over = true;
    world.stats = endStats(world);
    audio.gameOver();
  }
}

function endStats(world) {
  return {
    score: world.score,
    level: world.level,
    embers: world.embersCollected,
    bestCombo: world.bestCombo,
    dashes: world.dashes,
    powerups: world.powerupsTaken,
  };
}

function takePowerup(world, pu, audio) {
  const p = world.player;
  if (pu.kind === 'shield') p.shield = true;
  if (pu.kind === 'magnet') world.magnetTimer = POWERUP.magnetSeconds;
  if (pu.kind === 'slow') world.slowTimer = POWERUP.slowSeconds;
  if (pu.kind === 'heart' && world.lives < MAX_LIVES) world.lives += 1;
  world.powerupsTaken += 1;
  burst(world, pu.x, pu.y, '#ffffff', 14, 200);
  const label = { shield: 'SHIELD!', magnet: 'MAGNET!', slow: 'SLOW TIME!', heart: '+1 LANTERN' }[pu.kind];
  floatText(world, pu.x, pu.y - 20, label, '#ffffff');
  audio.powerup();
}

/** One fixed simulation step. `move` is the normalised input vector. */
export function updateWorld(world, dt, move, dash, audio) {
  const p = world.player;
  world.time += dt;
  if (world.levelBanner > 0) world.levelBanner -= dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 30);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt * 1.6);
  if (p.invulnerable > 0) p.invulnerable -= dt;
  if (p.dashCooldown > 0) p.dashCooldown -= dt;
  if (world.slowTimer > 0) world.slowTimer -= dt;
  if (world.magnetTimer > 0) world.magnetTimer -= dt;

  // --- player movement ---
  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.vx = p.dashDir.x * PLAYER.dashSpeed;
    p.vy = p.dashDir.y * PLAYER.dashSpeed;
  } else {
    p.vx += move.x * PLAYER.accel * dt;
    p.vy += move.y * PLAYER.accel * dt;
    p.vx *= Math.pow(PLAYER.friction, dt * 60);
    p.vy *= Math.pow(PLAYER.friction, dt * 60);
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > PLAYER.speed) {
      p.vx = (p.vx / speed) * PLAYER.speed;
      p.vy = (p.vy / speed) * PLAYER.speed;
    }
    if (dash && p.dashCooldown <= 0) {
      const dir = (move.x || move.y)
        ? { x: move.x, y: move.y }
        : { x: Math.cos(p.angle), y: Math.sin(p.angle) };
      p.dashDir = dir;
      p.dashTime = PLAYER.dashTime;
      p.dashCooldown = PLAYER.dashCooldown;
      world.dashes += 1;
      burst(world, p.x, p.y, '#ffe8a3', 10, 180);
      audio.dash();
    }
  }
  p.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, p.x + p.vx * dt));
  p.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, p.y + p.vy * dt));
  if (Math.hypot(p.vx, p.vy) > 30) p.angle = Math.atan2(p.vy, p.vx);

  // --- spawning ---
  world.emberTimer -= dt;
  if (world.emberTimer <= 0) {
    spawnEmber(world);
    const interval = Math.max(
      EMBER.minInterval,
      EMBER.interval * Math.pow(EMBER.intervalScale, world.level - 1),
    );
    world.emberTimer = interval * (0.7 + world.random() * 0.6);
  }
  world.enemyTimer -= dt;
  if (world.enemyTimer <= 0 && world.enemies.length < ENEMY.maxAlive) {
    spawnEnemy(world);
    const interval = Math.max(
      ENEMY.minInterval,
      ENEMY.interval * Math.pow(ENEMY.intervalScale, world.level - 1),
    );
    world.enemyTimer = interval * (0.7 + world.random() * 0.6);
  }
  world.powerupTimer -= dt;
  if (world.powerupTimer <= 0) {
    spawnPowerup(world);
    world.powerupTimer = POWERUP.interval + world.random() * POWERUP.intervalJitter;
  }

  const slow = world.slowTimer > 0 ? 0.45 : 1;

  // --- embers: fall, sway, magnet, collect ---
  for (let i = world.embers.length - 1; i >= 0; i--) {
    const e = world.embers[i];
    e.swayPhase += e.swaySpeed * dt;
    e.y += e.vy * dt;
    e.x = e.baseX + Math.sin(e.swayPhase) * EMBER.sway;
    e.twinkle += dt * 5;
    if (world.magnetTimer > 0) {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d < 260 && d > 1) {
        e.x += (dx / d) * 320 * dt;
        e.y += (dy / d) * 320 * dt;
        e.baseX = e.x - Math.sin(e.swayPhase) * EMBER.sway;
      }
    }
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    if (Math.hypot(dx, dy) < PLAYER.radius + e.radius + 4) {
      collectEmber(world, e, audio);
      world.embers.splice(i, 1);
      if (world.over) return;
    } else if (e.y > FIELD.height + 30) {
      world.embers.splice(i, 1);
    }
  }

  // --- enemies: chase, weave, telegraphed lunges ---
  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const en = world.enemies[i];
    en.phase += dt;
    en.stateTime += dt;
    const dx = p.x - en.x;
    const dy = p.y - en.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    if (en.kind === 'drifter') {
      en.vx = nx * en.speed * slow;
      en.vy = ny * en.speed * slow;
    } else if (en.kind === 'weaver') {
      const px = -ny;
      const py = nx;
      const wob = Math.sin(en.phase * 2.4 * en.wobble) * 0.9;
      en.vx = (nx + px * wob) * en.speed * slow;
      en.vy = (ny + py * wob) * en.speed * slow;
    } else if (en.kind === 'darter') {
      if (en.state === 'chase') {
        en.vx = nx * en.speed * slow;
        en.vy = ny * en.speed * slow;
        if (en.stateTime > 1.1 && dist < 320) {
          en.state = 'windup';
          en.stateTime = 0;
          en.tx = nx;
          en.ty = ny;
        }
      } else if (en.state === 'windup') {
        en.vx = 0;
        en.vy = 0;
        if (en.stateTime > 0.45) {
          en.state = 'lunge';
          en.stateTime = 0;
          en.vx = en.tx * en.speed * 4.2 * slow;
          en.vy = en.ty * en.speed * 4.2 * slow;
        }
      } else if (en.state === 'lunge') {
        if (en.stateTime > 0.5) {
          en.state = 'chase';
          en.stateTime = 0;
        }
      }
    }
    en.x += en.vx * dt;
    en.y += en.vy * dt;

    if (Math.hypot(p.x - en.x, p.y - en.y) < PLAYER.radius + en.radius - 2) {
      hurtPlayer(world, audio);
      // The wisp shatters on impact instead of camping the player.
      burst(world, en.x, en.y, '#b388ff', 12, 200);
      world.enemies.splice(i, 1);
      if (world.over) return;
    } else if (en.x < -60 || en.x > FIELD.width + 60 || en.y < -60 || en.y > FIELD.height + 60) {
      // Drifted off the field: despawn (only when far outside, so lunges survive).
      if (en.state !== 'lunge') world.enemies.splice(i, 1);
    }
  }

  // --- power-ups: bob, expire, collect ---
  for (let i = world.powerups.length - 1; i >= 0; i--) {
    const pu = world.powerups[i];
    if (world.time - pu.born > 12) {
      world.powerups.splice(i, 1);
      continue;
    }
    if (Math.hypot(p.x - pu.x, p.y - pu.y) < PLAYER.radius + pu.radius + 6) {
      takePowerup(world, pu, audio);
      world.powerups.splice(i, 1);
    }
  }

  // --- particles and floating text ---
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const pt = world.particles[i];
    pt.age += dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.96;
    pt.vy *= 0.96;
    if (pt.age >= pt.life) world.particles.splice(i, 1);
  }
  for (let i = world.floats.length - 1; i >= 0; i--) {
    const f = world.floats[i];
    f.age += dt;
    f.y -= 34 * dt;
    if (f.age >= f.life) world.floats.splice(i, 1);
  }
}
