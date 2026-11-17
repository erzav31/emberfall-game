// Emberfall — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
  speed: 340,
  accel: 2600,
  friction: 0.86,
  dashSpeed: 980,
  dashTime: 0.18,
  dashCooldown: 1.1,
  invulnerable: 1.6,
};

export const LIVES = 3;
export const MAX_LIVES = 5;

/** Embers are the score: collect them, chain them into a combo, never get hit. */
export const EMBER = {
  radius: 9,
  fallSpeed: 95,
  fallSpeedPerLevel: 9,
  sway: 42,
  interval: 0.85,
  intervalScale: 0.93,
  minInterval: 0.32,
  points: 10,
  /** Embers needed to clear a level. */
  perLevel: 20,
  /** The last level: reaching it wins the game. */
  winLevel: 10,
};

/** Combo multiplier grows every 8 chained embers, capped at x5. */
export const COMBO = { step: 8, maxMultiplier: 5 };

export const ENEMY = {
  interval: 2.4,
  intervalScale: 0.9,
  minInterval: 0.7,
  /** Kinds unlock as the level rises: drifter from 1, weaver from 3, darter from 5. */
  kinds: [
    { kind: 'drifter', fromLevel: 1, weight: 10, radius: 17, speed: 105, hp: 1 },
    { kind: 'weaver', fromLevel: 3, weight: 6, radius: 14, speed: 150, hp: 1 },
    { kind: 'darter', fromLevel: 5, weight: 5, radius: 13, speed: 130, hp: 1 },
  ],
  maxAlive: 26,
};

export const POWERUP = {
  interval: 9,
  intervalJitter: 4,
  radius: 13,
  magnetSeconds: 6,
  slowSeconds: 3.5,
  kinds: ['shield', 'magnet', 'slow', 'heart'],
};

export const PALETTE = {
  backdrop: '#0a0d1a',
  vignette: '#05060f',
  emberCore: '#ffd166',
  emberGlow: '#ff9f1c',
  playerCore: '#fff3c4',
  playerGlow: '#ffb703',
  playerRing: '#ffe8a3',
  drifter: '#b388ff',
  weaver: '#4dd0e1',
  darter: '#ff5d8f',
  shield: '#7ef0c1',
  magnet: '#ff8fa3',
  slow: '#8ecae6',
  heart: '#ff6b81',
  panel: 'rgba(13, 18, 38, 0.88)',
  panelEdge: '#2c3a67',
  text: '#f4f1e6',
  muted: '#9aa3c0',
  gold: '#ffd166',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberfall.best';
