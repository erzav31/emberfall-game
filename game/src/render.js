// Everything the player sees: the night field, the lantern-keeper, the embers,
// the void wisps, the HUD and every menu screen. Drawing only — no rules here.

import { FIELD, PLAYER, PALETTE, FONT, EMBER } from './config.js';

let stars = null;
function getStars(random) {
  if (stars) return stars;
  stars = [];
  for (let i = 0; i < 130; i++) {
    stars.push({
      x: random() * FIELD.width,
      y: random() * FIELD.height,
      r: 0.6 + random() * 1.6,
      tw: random() * Math.PI * 2,
    });
  }
  return stars;
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  circle(ctx, x, y, r);
  ctx.globalAlpha = 1;
}

function drawBackground(ctx, world, t) {
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  for (const s of getStars(world.random)) {
    ctx.globalAlpha = 0.25 + 0.55 * Math.abs(Math.sin(t * 0.7 + s.tw));
    ctx.fillStyle = '#cdd7ff';
    circle(ctx, s.x, s.y, s.r);
  }
  ctx.globalAlpha = 1;
  // Distant hills, two soft ridges.
  ctx.fillStyle = '#101830';
  ctx.beginPath();
  ctx.moveTo(0, FIELD.height);
  for (let x = 0; x <= FIELD.width; x += 40) {
    ctx.lineTo(x, FIELD.height - 90 - Math.sin(x * 0.004 + 1.2) * 34 - Math.sin(x * 0.011) * 14);
  }
  ctx.lineTo(FIELD.width, FIELD.height);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0c1226';
  ctx.beginPath();
  ctx.moveTo(0, FIELD.height);
  for (let x = 0; x <= FIELD.width; x += 40) {
    ctx.lineTo(x, FIELD.height - 34 - Math.sin(x * 0.006 + 4.0) * 18);
  }
  ctx.lineTo(FIELD.width, FIELD.height);
  ctx.closePath();
  ctx.fill();
  // Moon.
  glow(ctx, FIELD.width - 130, 96, 90, '#e8ecff', 0.5);
  ctx.fillStyle = '#f2f4ff';
  circle(ctx, FIELD.width - 130, 96, 34);
  ctx.fillStyle = '#d9def5';
  circle(ctx, FIELD.width - 142, 88, 7);
  circle(ctx, FIELD.width - 118, 106, 5);
}

function drawEmber(ctx, e, t) {
  const tw = 0.75 + 0.25 * Math.sin(e.twinkle);
  glow(ctx, e.x, e.y, 26 * tw, PALETTE.emberGlow, 0.55);
  ctx.fillStyle = PALETTE.emberCore;
  circle(ctx, e.x, e.y, e.radius * tw);
  ctx.fillStyle = '#fff8e0';
  circle(ctx, e.x - 2, e.y - 2, e.radius * 0.45 * tw);
}

function drawEnemy(ctx, en, t) {
  const color = { drifter: PALETTE.drifter, weaver: PALETTE.weaver, darter: PALETTE.darter }[en.kind];
  const windup = en.kind === 'darter' && en.state === 'windup';
  const flash = windup ? (Math.sin(t * 30) > 0 ? 1 : 0.45) : 1;
  ctx.globalAlpha = flash;
  glow(ctx, en.x, en.y, en.radius * 2.6, color, 0.5);
  ctx.fillStyle = color;
  if (en.kind === 'drifter') {
    // A wobbling wisp with two eyes.
    circle(ctx, en.x, en.y, en.radius * (1 + 0.08 * Math.sin(en.phase * 3)));
    ctx.fillStyle = '#1a1030';
    circle(ctx, en.x - 6, en.y - 3, 3.4);
    circle(ctx, en.x + 6, en.y - 3, 3.4);
    ctx.fillStyle = '#ffffff';
    circle(ctx, en.x - 5, en.y - 4, 1.4);
    circle(ctx, en.x + 7, en.y - 4, 1.4);
  } else if (en.kind === 'weaver') {
    // A spinning shard.
    ctx.save();
    ctx.translate(en.x, en.y);
    ctx.rotate(en.phase * 2);
    ctx.beginPath();
    ctx.moveTo(0, -en.radius - 4);
    ctx.lineTo(en.radius, 0);
    ctx.lineTo(0, en.radius + 4);
    ctx.lineTo(-en.radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#08222b';
    circle(ctx, en.x, en.y, 4);
  } else {
    // A darting thorn, pointed along its velocity.
    const ang = Math.atan2(en.vy, en.vx);
    ctx.save();
    ctx.translate(en.x, en.y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(en.radius + 8, 0);
    ctx.lineTo(-en.radius, -en.radius * 0.8);
    ctx.lineTo(-en.radius * 0.4, 0);
    ctx.lineTo(-en.radius, en.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (windup) {
      ctx.strokeStyle = '#ff5d8f';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(en.x, en.y);
      ctx.lineTo(en.x + en.tx * 90, en.y + en.ty * 90);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.globalAlpha = 1;
}

function drawPowerup(ctx, pu, t) {
  const bob = Math.sin(t * 3 + pu.x) * 4;
  const y = pu.y + bob;
  const color = {
    shield: PALETTE.shield, magnet: PALETTE.magnet, slow: PALETTE.slow, heart: PALETTE.heart,
  }[pu.kind];
  const blink = (12 - (t - pu.born)) < 3 ? (Math.sin(t * 12) > 0 ? 1 : 0.35) : 1;
  ctx.globalAlpha = blink;
  glow(ctx, pu.x, y, 34, color, 0.6);
  ctx.fillStyle = 'rgba(10, 14, 30, 0.9)';
  circle(ctx, pu.x, y, pu.radius + 3);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(pu.x, y, pu.radius + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `bold 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyph = { shield: 'S', magnet: 'M', slow: 'T', heart: '♥' }[pu.kind];
  ctx.fillText(glyph, pu.x, y + 1);
  ctx.globalAlpha = 1;
}

function drawPlayer(ctx, world, t) {
  const p = world.player;
  const blink = p.invulnerable > 0 && p.dashTime <= 0 ? (Math.sin(t * 24) > 0 ? 0.35 : 1) : 1;
  ctx.globalAlpha = blink;
  // Lantern light: a wide warm pool around the keeper.
  glow(ctx, p.x, p.y, 120, PALETTE.playerGlow, 0.5);
  glow(ctx, p.x, p.y, 46, PALETTE.playerGlow, 0.65);
  // Direction ring.
  ctx.strokeStyle = PALETTE.playerRing;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER.radius + 9, 0, Math.PI * 2);
  ctx.stroke();
  // Little flame.
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - PLAYER.radius - 2);
  ctx.quadraticCurveTo(p.x + 9, p.y - 2, p.x, p.y + 8);
  ctx.quadraticCurveTo(p.x - 9, p.y - 2, p.x, p.y - PLAYER.radius - 2);
  ctx.fill();
  ctx.fillStyle = '#1a1030';
  circle(ctx, p.x - 4.5, p.y - 1, 2.2);
  circle(ctx, p.x + 4.5, p.y - 1, 2.2);
  ctx.globalAlpha = 1;
  if (p.shield) {
    ctx.strokeStyle = PALETTE.shield;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius + 17 + Math.sin(t * 5) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (p.dashCooldown > 0 && p.dashTime <= 0) {
    const frac = 1 - p.dashCooldown / 1.1;
    ctx.strokeStyle = 'rgba(255, 232, 163, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius + 9, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
  }
}

function drawParticles(ctx, world) {
  for (const pt of world.particles) {
    ctx.globalAlpha = 1 - pt.age / pt.life;
    ctx.fillStyle = pt.color;
    circle(ctx, pt.x, pt.y, pt.size * (1 - pt.age / pt.life * 0.5));
  }
  ctx.globalAlpha = 1;
}

function drawFloats(ctx, world) {
  ctx.font = `bold 19px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of world.floats) {
    ctx.globalAlpha = 1 - f.age / f.life;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function lanternIcon(ctx, x, y, lit) {
  ctx.fillStyle = lit ? PALETTE.playerGlow : 'rgba(154, 163, 192, 0.35)';
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.quadraticCurveTo(x + 6, y - 1, x, y + 6);
  ctx.quadraticCurveTo(x - 6, y - 1, x, y - 8);
  ctx.fill();
}

function drawHud(ctx, world) {
  const pad = 22;
  ctx.textBaseline = 'alphabetic';
  // Score, top left.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 34px ${FONT}`;
  ctx.fillText(String(world.score).padStart(6, '0'), pad, 48);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `15px ${FONT}`;
  ctx.fillText(`BEST ${Math.max(world.best, world.score)}`, pad, 72);
  // Combo, under the score when it is live.
  if (world.combo >= 2) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(`COMBO x${world.multiplier}  ·  ${world.combo} chained`, pad, 100);
  }
  // Level progress, top centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText(`LEVEL ${world.level} / ${EMBER.winLevel}`, FIELD.width / 2, 40);
  const barW = 260;
  const frac = world.embersThisLevel / EMBER.perLevel;
  ctx.fillStyle = 'rgba(154, 163, 192, 0.35)';
  ctx.fillRect(FIELD.width / 2 - barW / 2, 50, barW, 8);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(FIELD.width / 2 - barW / 2, 50, barW * frac, 8);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `13px ${FONT}`;
  ctx.fillText(`${world.embersThisLevel} / ${EMBER.perLevel} embers to dawn`, FIELD.width / 2, 76);
  // Lives, top right.
  ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) {
    lanternIcon(ctx, FIELD.width - pad - i * 26, 34, i < world.lives);
  }
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `13px ${FONT}`;
  ctx.fillText('M mute · P pause', FIELD.width - pad, 64);
  // Active effects, bottom left.
  let ey = FIELD.height - 24;
  ctx.textAlign = 'left';
  ctx.font = `bold 15px ${FONT}`;
  if (world.player.shield) {
    ctx.fillStyle = PALETTE.shield;
    ctx.fillText('SHIELD READY', pad, ey);
    ey -= 22;
  }
  if (world.magnetTimer > 0) {
    ctx.fillStyle = PALETTE.magnet;
    ctx.fillText(`MAGNET ${world.magnetTimer.toFixed(1)}s`, pad, ey);
    ey -= 22;
  }
  if (world.slowTimer > 0) {
    ctx.fillStyle = PALETTE.slow;
    ctx.fillText(`SLOW TIME ${world.slowTimer.toFixed(1)}s`, pad, ey);
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function titleText(ctx, text, y, size, color) {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, FIELD.width / 2, y);
}

function bodyText(ctx, text, y, size, color) {
  ctx.fillStyle = color;
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, FIELD.width / 2, y);
}

function statRows(ctx, stats, y0) {
  const rows = [
    ['Score', String(stats.score)],
    ['Level reached', `${stats.level} / ${EMBER.winLevel}`],
    ['Embers gathered', String(stats.embers)],
    ['Best combo', `${stats.bestCombo} chained`],
    ['Dashes', String(stats.dashes)],
    ['Power-ups taken', String(stats.powerups)],
  ];
  ctx.font = `18px ${FONT}`;
  rows.forEach(([label, value], i) => {
    const y = y0 + i * 30;
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(label, FIELD.width / 2 - 12, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(value, FIELD.width / 2 + 12, y);
  });
}

export function renderTitle(ctx, world, t) {
  drawBackground(ctx, world, t);
  // A few drifting embers behind the title, for life.
  for (const e of world.embers) drawEmber(ctx, e, t);
  ctx.fillStyle = 'rgba(5, 6, 15, 0.45)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  glow(ctx, FIELD.width / 2, 200, 260, PALETTE.playerGlow, 0.35);
  titleText(ctx, 'EMBERFALL', 168, 84, PALETTE.gold);
  bodyText(ctx, 'Keeper of the Last Lantern', 232, 26, PALETTE.text);
  bodyText(ctx, 'The night is hungry. Gather embers, dodge the void wisps,', 300, 19, PALETTE.muted);
  bodyText(ctx, 'and keep your lantern burning until dawn — level 10.', 328, 19, PALETTE.muted);
  panel(ctx, FIELD.width / 2 - 330, 372, 660, 132);
  bodyText(ctx, 'WASD / Arrows — drift    ·    SPACE / Click — dash', 404, 19, PALETTE.text);
  bodyText(ctx, 'Chain embers for a combo up to x5    ·    S, M, T, ♥ help you', 434, 19, PALETTE.text);
  bodyText(ctx, 'P pause    ·    M mute    ·    3 lanterns stand between you and the dark', 464, 19, PALETTE.muted);
  const pulse = 0.6 + 0.4 * Math.sin(t * 4);
  ctx.globalAlpha = pulse;
  titleText(ctx, 'PRESS ENTER OR CLICK TO BEGIN', 556, 24, PALETTE.text);
  ctx.globalAlpha = 1;
  if (world.best > 0) {
    bodyText(ctx, `Best score: ${world.best}`, 606, 18, PALETTE.gold);
  }
  bodyText(ctx, 'An original game — every light, sound and name its own.', 664, 15, PALETTE.muted);
}

export function renderPaused(ctx, world) {
  drawBackground(ctx, world, world.time);
  drawGameField(ctx, world);
  ctx.fillStyle = 'rgba(5, 6, 15, 0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, FIELD.width / 2 - 260, 250, 520, 200);
  titleText(ctx, 'PAUSED', 310, 44, PALETTE.text);
  bodyText(ctx, 'P or Enter — keep playing', 368, 19, PALETTE.muted);
  bodyText(ctx, 'R — start over', 398, 19, PALETTE.muted);
}

export function renderGameOver(ctx, world) {
  drawBackground(ctx, world, world.time);
  ctx.fillStyle = 'rgba(5, 6, 15, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  titleText(ctx, 'THE LANTERN GOES OUT', 130, 52, PALETTE.darter);
  bodyText(ctx, 'The dark takes the field — but embers always return.', 178, 19, PALETTE.muted);
  panel(ctx, FIELD.width / 2 - 250, 216, 500, 220);
  statRows(ctx, world.stats, 252);
  const pulse = 0.6 + 0.4 * Math.sin(world.time * 4);
  ctx.globalAlpha = pulse;
  titleText(ctx, 'PRESS ENTER TO LIGHT IT AGAIN', 492, 22, PALETTE.text);
  ctx.globalAlpha = 1;
  bodyText(ctx, `Best score: ${Math.max(world.best, world.score)}`, 540, 18, PALETTE.gold);
}

export function renderVictory(ctx, world) {
  drawBackground(ctx, world, world.time);
  glow(ctx, FIELD.width / 2, 200, 320, PALETTE.emberGlow, 0.5);
  titleText(ctx, 'DAWN BREAKS', 130, 64, PALETTE.gold);
  bodyText(ctx, 'Ten levels of night, and your lantern never went out.', 186, 19, PALETTE.text);
  panel(ctx, FIELD.width / 2 - 250, 224, 500, 220);
  statRows(ctx, world.stats, 260);
  const pulse = 0.6 + 0.4 * Math.sin(world.time * 4);
  ctx.globalAlpha = pulse;
  titleText(ctx, 'PRESS ENTER TO PLAY AGAIN', 500, 22, PALETTE.text);
  ctx.globalAlpha = 1;
  bodyText(ctx, `Best score: ${Math.max(world.best, world.score)}`, 548, 18, PALETTE.gold);
}

export function drawGameField(ctx, world) {
  for (const e of world.embers) drawEmber(ctx, e, world.time);
  for (const pu of world.powerups) drawPowerup(ctx, pu, world.time);
  for (const en of world.enemies) drawEnemy(ctx, en, world.time);
  drawPlayer(ctx, world, world.time);
  drawParticles(ctx, world);
  drawFloats(ctx, world);
  drawHud(ctx, world);
  if (world.levelBanner > 0) {
    ctx.globalAlpha = Math.min(1, world.levelBanner);
    titleText(ctx, `LEVEL ${world.level}`, 320, 56, PALETTE.gold);
    bodyText(ctx, 'The night grows hungrier…', 368, 20, PALETTE.text);
    ctx.globalAlpha = 1;
  }
}

export function renderPlaying(ctx, world) {
  const shakeX = world.shake > 0 ? (Math.random() - 0.5) * world.shake : 0;
  const shakeY = world.shake > 0 ? (Math.random() - 0.5) * world.shake : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawBackground(ctx, world, world.time);
  drawGameField(ctx, world);
  ctx.restore();
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255, 93, 143, ${world.flash * 0.5})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
  // Vignette.
  const vg = ctx.createRadialGradient(
    FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.45,
    FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.85,
  );
  vg.addColorStop(0, 'rgba(5,6,15,0)');
  vg.addColorStop(1, 'rgba(5,6,15,0.5)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}
