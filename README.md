# Emberfall — Keeper of the Last Lantern

An original 2D arena survival game for the make.fun `best-game-01`
competition. The night is hungry: drift through the dark as the keeper of
the last lantern, gather falling embers, chain them into combos, dodge the
void wisps — and keep your light burning until dawn (level 10).

## How to play

Serve the folder, then open http://localhost:8080 in a desktop browser:

```sh
node serve.ts
```

No build step, no network request, no library: plain static files under
`game/`.

| Key | Action |
| --- | --- |
| WASD / Arrow keys | Drift |
| Space / Click | Dash (brief invulnerability, 1.1 s cooldown) |
| P | Pause / resume |
| R | Restart (from pause, game over or victory) |
| M | Mute / unmute |
| Enter | Start / restart |

## The rules

- **Embers** fall from the sky. Collect one for 10 points; chaining them
  without taking a hit raises the combo multiplier up to **x5**.
- **20 embers** clear a level. Reach **level 10** and dawn breaks — you win.
- **Void wisps** hunt you: drifters chase, weavers cut across in sine
  arcs, and darters telegraph a lunge (flashing, with a dashed aim line).
  One touch costs a lantern. You have **3**; lose them all and the light
  goes out.
- **Power-ups** drift in: **S** shield (absorbs one hit), **M** magnet
  (pulls embers for 6 s), **T** slow time (3.5 s), **♥** an extra lantern
  (max 5).
- A dash shatters nothing but buys a blink of safety — and a wisp that
  touches you shatters itself, so it cannot camp you.
- Best score is kept in `localStorage`.

## Feedback on every action

Particles, screen shake, hit flash, floating score text, a level banner,
and fully synthesised WebAudio sound (pickup pitch climbs with your combo,
dash whoosh, level-up chime, game-over descent, victory fanfare, ambient
pad) — no audio files.

## Files

```
main.ts            hand-in program: copies game/ + screenshots/ to /output
                   and writes /output/dossier.json
serve.ts           local static server (node serve.ts)
game/
  index.html       the page
  src/
    config.js      all tuning numbers and colours
    random.js      seeded RNG (mulberry32) for repeatable scenes
    input.js       keyboard + mouse state
    audio.js       WebAudio synth: SFX + ambient pad
    world.js       simulation: entities, spawning, collisions, scoring
    render.js      all canvas drawing: field, HUD, menus
    shots.js       deterministic screenshot scenes (?shot=…&seed=…)
    main.js        bootstrap, fixed 60 Hz step, state machine
vendor/
  makefun-game.ts  the kit's dossier library, unchanged
screenshots/      1-start, 2-play, 3-end, 4-win (real renders of the game)
shots.json         the four screenshot scenes
```

Screenshots are real renders of the game's own code: open
`http://localhost:8080/game/index.html?shot=<scene>&seed=1` at 1280×720
and capture once `window.__shotReady` is set.

## License

MIT — see `LICENSE`.
