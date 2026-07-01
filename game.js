/* ============================================
   GAME.JS
   Core engine: game state machine, render loop,
   input handling, entity updates, level transitions.

   STATE MACHINE (single source of truth: `state`)
     'menu'  -> 'playing' -> 'paused' (toggle back to 'playing')
                          -> 'levelComplete' -> 'playing' (next level) or 'menu'
                          -> 'gameOver' -> 'playing' (retry) or 'menu'
                          -> 'victory' -> 'menu'

   Level switching ALWAYS goes through loadLevel(index), which is the
   only function allowed to mutate currentLevelIndex / rebuild entities.
   This avoids the classic bug of half-resetting state between levels.
============================================ */

(function () {
  'use strict';

  // ---------- DOM ----------
  const startScreen = document.getElementById('start-screen');
  const gameScreen = document.getElementById('game-screen');
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  const hudLevel = document.getElementById('hud-level');
  const hudLevelName = document.getElementById('hud-level-name');
  const hudScore = document.getElementById('hud-score');
  const hudCoins = document.getElementById('hud-coins');
  const hudLives = document.getElementById('hud-lives');

  const pauseOverlay = document.getElementById('pause-overlay');
  const levelCompleteOverlay = document.getElementById('level-complete-overlay');
  const gameOverOverlay = document.getElementById('game-over-overlay');
  const victoryOverlay = document.getElementById('victory-overlay');

  const lcStats = document.getElementById('lc-stats');
  const lcTitle = document.getElementById('lc-title');
  const goStats = document.getElementById('go-stats');
  const victoryStats = document.getElementById('victory-stats');

  const touchControls = document.getElementById('touch-controls');

  // ---------- Constants ----------
  const TOTAL_LEVELS = LEVELS.length;
  const STARTING_LIVES = 3;
  const CANVAS_W = canvas.width;
  const CANVAS_H = canvas.height;

  // ---------- Global mutable game state ----------
  let state = 'menu';            // see state machine comment above
  let currentLevelIndex = 0;     // 0-based index into LEVELS
  let level = null;              // deep-cloned working copy of LEVELS[currentLevelIndex]
  let player = null;
  let camera = { x: 0, y: 0 };
  let score = 0;
  let totalCoinsCollected = 0;
  let lives = STARTING_LIVES;
  let particles = [];
  let coinsThisLevel = 0;
  let levelCoinTotal = 0;
  let frameCount = 0;
  let lastTime = 0;
  let rafId = null;
  let highestUnlockedLevel = 0; // index of furthest level the player may select

  const input = {
    left: false,
    right: false,
    jumpHeld: false,
    jumpPressed: false,
  };

  // ============================================================
  // LEVEL LOADING — the single authoritative place that switches levels
  // ============================================================
  function loadLevel(index) {
    if (index < 0 || index >= TOTAL_LEVELS) {
      console.error('loadLevel: invalid index', index);
      return;
    }
    currentLevelIndex = index;

    // Deep clone so repeated plays / restarts never mutate the original data
    const data = LEVELS[index];
    level = JSON.parse(JSON.stringify(data));

    // Runtime-only fields added to the cloned level (not part of static data)
    level.platforms.forEach(p => { p.crumbleTimer = -1; p.gone = false; });
    level.movingPlatforms.forEach(mp => {
      mp.phase = 0;
      mp.baseX = mp.x;
      mp.baseY = mp.y;
    });
    level.coins.forEach(c => { c.collected = false; c.bob = Math.random() * Math.PI * 2; });
    level.enemies.forEach(e => {
      e.dir = -1;
      e.baseX = e.x;
      e.alive = true;
      e.hp = e.hp || 1;
      e.flyPhase = Math.random() * Math.PI * 2;
      e.baseY = e.y;
    });

    levelCoinTotal = level.coins.length;
    coinsThisLevel = 0;

    player = new Player(level.spawn.x, level.spawn.y);
    camera.x = 0;
    camera.y = 0;
    particles = [];

    hudLevel.textContent = String(level.id);
    hudLevelName.textContent = level.name;

    state = 'playing';
    hideAllOverlays();
  }

  function restartCurrentLevel() {
    loadLevel(currentLevelIndex);
  }

  function advanceToNextLevel() {
    const next = currentLevelIndex + 1;
    if (next >= TOTAL_LEVELS) {
      enterVictory();
      return;
    }
    highestUnlockedLevel = Math.max(highestUnlockedLevel, next);
    loadLevel(next);
  }

  // ============================================================
  // STATE TRANSITIONS
  // ============================================================
  function hideAllOverlays() {
    pauseOverlay.classList.add('hidden');
    levelCompleteOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    victoryOverlay.classList.add('hidden');
  }

  function enterPause() {
    if (state !== 'playing') return;
    state = 'paused';
    pauseOverlay.classList.remove('hidden');
  }

  function resumeFromPause() {
    if (state !== 'paused') return;
    state = 'playing';
    pauseOverlay.classList.add('hidden');
    lastTime = performance.now(); // avoid a huge dt jump after pause
  }

  function enterLevelComplete() {
    state = 'levelComplete';
    const isLast = currentLevelIndex === TOTAL_LEVELS - 1;
    lcTitle.textContent = isLast ? 'FINAL LEVEL CLEAR!' : 'LEVEL CLEAR!';
    lcStats.textContent =
      `Coins collected: ${coinsThisLevel} / ${levelCoinTotal}\nScore: ${score}`;
    document.getElementById('btn-next-level').textContent =
      isLast ? 'FINISH ▶' : 'NEXT LEVEL ▶';
    levelCompleteOverlay.classList.remove('hidden');
  }

  function enterGameOver() {
    state = 'gameOver';
    goStats.textContent = `Final Score: ${score}\nLevel reached: ${level.name}`;
    gameOverOverlay.classList.remove('hidden');
  }

  function enterVictory() {
    state = 'victory';
    victoryStats.textContent = `Total Score: ${score}\nTotal Coins: ${totalCoinsCollected}`;
    victoryOverlay.classList.remove('hidden');
  }

  function loseLife() {
    lives--;
    hudLives.textContent = String(Math.max(0, lives));
    if (lives <= 0) {
      enterGameOver();
    } else {
      restartCurrentLevel();
    }
  }

  function goToMenu() {
    state = 'menu';
    hideAllOverlays();
    gameScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    buildLevelButtons();
  }

  function startFromMenu(levelIndex) {
    score = 0;
    totalCoinsCollected = 0;
    lives = STARTING_LIVES;
    hudScore.textContent = '0';
    hudCoins.textContent = '0';
    hudLives.textContent = String(STARTING_LIVES);
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    loadLevel(levelIndex);
    lastTime = performance.now();
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  // ============================================================
  // MENU: level select buttons
  // ============================================================
  function buildLevelButtons() {
    const container = document.getElementById('level-buttons');
    container.innerHTML = '';
    LEVELS.forEach((lvl, i) => {
      const btn = document.createElement('button');
      btn.className = 'level-btn';
      btn.textContent = String(lvl.id);
      btn.title = lvl.name;
      btn.disabled = i > highestUnlockedLevel;
      btn.style.opacity = i > highestUnlockedLevel ? '0.35' : '1';
      btn.style.cursor = i > highestUnlockedLevel ? 'not-allowed' : 'pointer';
      btn.addEventListener('click', () => {
        if (i > highestUnlockedLevel) return;
        startFromMenu(i);
      });
      container.appendChild(btn);
    });
  }

  // ============================================================
  // INPUT
  // ============================================================
  const keyMap = {
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
  };

  window.addEventListener('keydown', (e) => {
    if (keyMap[e.key]) { input[keyMap[e.key]] = true; e.preventDefault(); }
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      if (!input.jumpHeld) input.jumpPressed = true;
      input.jumpHeld = true;
      e.preventDefault();
    }
    if (e.key === 'p' || e.key === 'P') {
      if (state === 'playing') enterPause();
      else if (state === 'paused') resumeFromPause();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (keyMap[e.key]) input[keyMap[e.key]] = false;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      input.jumpHeld = false;
    }
  });

  // Touch controls
  function bindHold(el, onDown, onUp) {
    el.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(); }, { passive: false });
    el.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); }, { passive: false });
    el.addEventListener('mousedown', (e) => { e.preventDefault(); onDown(); });
    el.addEventListener('mouseup', (e) => { e.preventDefault(); onUp(); });
    el.addEventListener('mouseleave', () => onUp());
  }
  bindHold(document.getElementById('t-left'),
    () => input.left = true, () => input.left = false);
  bindHold(document.getElementById('t-right'),
    () => input.right = true, () => input.right = false);
  bindHold(document.getElementById('t-jump'),
    () => { if (!input.jumpHeld) input.jumpPressed = true; input.jumpHeld = true; },
    () => input.jumpHeld = false);

  if ('ontouchstart' in window) {
    touchControls.classList.remove('hidden');
  }

  // ============================================================
  // BUTTON WIRING
  // ============================================================
  document.getElementById('btn-start').addEventListener('click', () => startFromMenu(0));
  document.getElementById('btn-pause').addEventListener('click', () => {
    if (state === 'playing') enterPause(); else if (state === 'paused') resumeFromPause();
  });
  document.getElementById('btn-resume').addEventListener('click', resumeFromPause);
  document.getElementById('btn-restart-level').addEventListener('click', () => {
    hideAllOverlays();
    restartCurrentLevel();
  });
  document.getElementById('btn-quit').addEventListener('click', goToMenu);
  document.getElementById('btn-next-level').addEventListener('click', advanceToNextLevel);
  document.getElementById('btn-replay-level').addEventListener('click', restartCurrentLevel);
  document.getElementById('btn-try-again').addEventListener('click', () => {
    lives = STARTING_LIVES;
    hudLives.textContent = String(lives);
    restartCurrentLevel();
  });
  document.getElementById('btn-go-menu').addEventListener('click', goToMenu);
  document.getElementById('btn-victory-menu').addEventListener('click', goToMenu);

  // ============================================================
  // PHYSICS HELPERS
  // ============================================================
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function updateMovingPlatforms() {
    level.movingPlatforms.forEach(mp => {
      mp.phase += 0.02 * mp.speed;
      const offset = Math.sin(mp.phase) * mp.range;
      if (mp.axis === 'x') mp.x = mp.baseX + offset;
      else mp.y = mp.baseY + offset;
    });
  }

  function updateCrumblePlatforms() {
    level.platforms.forEach(p => {
      if (p.type !== 'crumble' || p.gone) return;
      const standing = rectsOverlap(player.rect, { x: p.x, y: p.y - 4, w: p.w, h: p.h + 4 }) && player.vy >= 0;
      if (standing && p.crumbleTimer < 0) {
        p.crumbleTimer = 45; // frames before it disappears
      }
      if (p.crumbleTimer >= 0) {
        p.crumbleTimer--;
        if (p.crumbleTimer <= 0) {
          p.gone = true;
          spawnParticles(p.x + p.w / 2, p.y + p.h / 2, '#ff6b3d', 10);
        }
      }
    });
  }

  function buildSolidRects() {
    const list = [];
    level.platforms.forEach(p => {
      if (p.gone) return;
      list.push({ x: p.x, y: p.y, w: p.w, h: p.h, type: p.type, isMoving: false });
    });
    level.movingPlatforms.forEach(mp => {
      list.push({ x: mp.x, y: mp.y, w: mp.w, h: mp.h, type: 'moving', isMoving: true, ref: mp });
    });
    level._solidRects = list;
  }

  function carryPlayerOnMovingPlatform() {
    if (!player.standingOn) return;
    const mp = player.standingOn;
    const prevPhase = mp.phase - 0.02 * mp.speed;
    const prevOffset = Math.sin(prevPhase) * mp.range;
    const curOffset = Math.sin(mp.phase) * mp.range;
    if (mp.axis === 'x') {
      player.x += (curOffset - prevOffset);
    } else {
      player.y += (curOffset - prevOffset);
    }
  }

  function updateEnemies() {
    level.enemies.forEach(e => {
      if (!e.alive) return;

      if (e.type === 'walker' || e.type === 'boss') {
        e.x += e.dir * e.speed;
        if (e.x < e.baseX - e.range / 2 || e.x > e.baseX + e.range / 2) {
          e.dir *= -1;
        }
      } else if (e.type === 'flyer') {
        e.flyPhase += 0.03 * e.speed;
        e.y = e.baseY + Math.sin(e.flyPhase) * 40;
        e.x += e.dir * e.speed * 0.6;
        if (e.x < e.baseX - e.range / 2 || e.x > e.baseX + e.range / 2) {
          e.dir *= -1;
        }
      }
    });
  }

  function handleEnemyCollisions() {
    level.enemies.forEach(e => {
      if (!e.alive) return;
      if (!rectsOverlap(player.rect, e)) return;

      const playerBottom = player.y + player.h;
      const fallingOntoEnemy = player.vy > 1 && playerBottom - e.y < 22;

      if (fallingOntoEnemy) {
        // Stomp!
        e.hp -= 1;
        player.bounceOffEnemy();
        spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#ffd23f', 12);
        if (e.hp <= 0) {
          e.alive = false;
          score += e.type === 'boss' ? 500 : 100;
          hudScore.textContent = String(score);
          if (e.type === 'boss') {
            spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#ff2e88', 30);
          }
        }
      } else {
        // Player gets hurt
        if (player.takeHit()) {
          loseLife();
        }
      }
    });
  }

  function handleHazardCollisions() {
    const hazards = [...level.spikes, ...level.lava];
    for (const hz of hazards) {
      if (rectsOverlap(player.rect, hz)) {
        if (player.takeHit()) {
          loseLife();
        }
        return;
      }
    }
  }

  function handleSpringCollisions() {
    level.springs.forEach(sp => {
      if (rectsOverlap(player.rect, sp) && player.vy > 0) {
        player.bounceSpring();
        spawnParticles(sp.x + sp.w / 2, sp.y, '#39ff7a', 14);
      }
    });
  }

  function handleCoinCollisions() {
    level.coins.forEach(c => {
      if (c.collected) return;
      const coinRect = { x: c.x - 10, y: c.y - 10, w: 20, h: 20 };
      if (rectsOverlap(player.rect, coinRect)) {
        c.collected = true;
        coinsThisLevel++;
        totalCoinsCollected++;
        score += 10;
        hudScore.textContent = String(score);
        hudCoins.textContent = String(totalCoinsCollected);
        spawnParticles(c.x, c.y, '#ffd23f', 8);
      }
    });
  }

  function handleGoalCollision() {
    if (rectsOverlap(player.rect, level.goal)) {
      score += 250;
      hudScore.textContent = String(score);
      enterLevelComplete();
    }
  }

  // ============================================================
  // PARTICLES (visual polish, lightweight)
  // ============================================================
  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 1.2) * 6,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  function updateParticles() {
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.life--;
    });
    particles = particles.filter(p => p.life > 0);
  }

  // ============================================================
  // CAMERA
  // ============================================================
  function updateCamera() {
    const targetX = player.x - CANVAS_W / 2 + player.w / 2;
    camera.x += (targetX - camera.x) * 0.14;
    camera.x = Math.max(0, Math.min(level.width - CANVAS_W, camera.x));
    camera.y = 0;
  }

  // ============================================================
  // MAIN UPDATE
  // ============================================================
  function update() {
    if (state !== 'playing') return;

    buildSolidRects();
    updateMovingPlatforms();
    buildSolidRects(); // rebuild after moving platforms shift this frame

    player.update(input, level, 1);
    carryPlayerOnMovingPlatform();

    updateCrumblePlatforms();
    updateEnemies();

    handleCoinCollisions();
    handleEnemyCollisions();
    handleHazardCollisions();
    handleSpringCollisions();
    handleGoalCollision();

    updateParticles();
    updateCamera();

    if (player.dead) {
      loseLife();
    }

    frameCount++;
  }

  // ============================================================
  // RENDERING
  // ============================================================
  const THEME_COLORS = {
    grassland: { ground: '#2e7d32', groundTop: '#4caf50', accent: '#a5d6a7' },
    cave:      { ground: '#3a2960', groundTop: '#6b4ea8', accent: '#b39ddb' },
    sky:       { ground: '#37474f', groundTop: '#607d8b', accent: '#cfd8dc' },
    lava:      { ground: '#3e1a0f', groundTop: '#6d2e16', accent: '#ff8a50' },
    castle:    { ground: '#2a1a45', groundTop: '#4a2d75', accent: '#d8b4ff' },
  };

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, level.bg.top);
    grad.addColorStop(1, level.bg.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Parallax decoration per theme
    ctx.save();
    ctx.globalAlpha = 0.5;
    const parX = -camera.x * 0.3;
    if (level.theme === 'grassland' || level.theme === 'sky') {
      for (let i = 0; i < 8; i++) {
        const cx = ((i * 320) + parX) % (level.width + 300) - 150;
        drawCloud(cx, 70 + (i % 3) * 40, 1 + (i % 2) * 0.3);
      }
    } else if (level.theme === 'cave') {
      for (let i = 0; i < 10; i++) {
        const cx = ((i * 260) + parX) % (level.width + 260);
        ctx.fillStyle = '#7c4dff';
        ctx.shadowColor = '#b388ff';
        ctx.shadowBlur = 20;
        drawDiamond(cx, 90 + (i % 4) * 30, 14);
      }
      ctx.shadowBlur = 0;
    } else if (level.theme === 'lava') {
      for (let i = 0; i < 14; i++) {
        const ex = ((i * 180) + parX * 1.5) % (level.width + 180);
        const ey = 40 + ((i * 53) % 200);
        ctx.fillStyle = '#ff7043';
        ctx.shadowColor = '#ff3d00';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    } else if (level.theme === 'castle') {
      for (let i = 0; i < 6; i++) {
        const tx = ((i * 420) + parX) % (level.width + 420);
        ctx.fillStyle = 'rgba(120,60,180,0.4)';
        ctx.fillRect(tx, 250, 60, 230);
        ctx.fillRect(tx + 15, 220, 30, 30);
      }
    }
    ctx.restore();
  }

  function drawCloud(x, y, scale) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 18 * scale, 0, Math.PI * 2);
    ctx.arc(x + 22 * scale, y - 8 * scale, 16 * scale, 0, Math.PI * 2);
    ctx.arc(x + 42 * scale, y, 18 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDiamond(x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.7, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.7, y);
    ctx.closePath();
    ctx.fill();
  }

  function drawPlatforms() {
    const t = THEME_COLORS[level.theme];
    level.platforms.forEach(p => {
      if (p.gone) return;
      const sx = p.x - camera.x;
      if (sx + p.w < 0 || sx > CANVAS_W) return;

      let topColor = t.groundTop;
      let bodyColor = t.ground;

      if (p.type === 'ice') { topColor = '#bbe7ff'; bodyColor = '#6fc3e8'; }
      if (p.type === 'float') { topColor = t.accent; bodyColor = t.ground; }
      if (p.type === 'crumble') {
        const flashing = p.crumbleTimer >= 0 && Math.floor(p.crumbleTimer / 6) % 2 === 0;
        topColor = flashing ? '#ff6b3d' : '#caa07a';
        bodyColor = flashing ? '#c2410c' : '#8a5a3a';
      }

      ctx.fillStyle = bodyColor;
      ctx.fillRect(sx, p.y, p.w, p.h);
      ctx.fillStyle = topColor;
      ctx.fillRect(sx, p.y, p.w, 8);

      if (p.type === 'float' || p.type === 'ice') {
        ctx.strokeStyle = topColor;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.strokeRect(sx, p.y, p.w, p.h);
        ctx.globalAlpha = 1;
      }
    });

    level.movingPlatforms.forEach(mp => {
      const sx = mp.x - camera.x;
      if (sx + mp.w < 0 || sx > CANVAS_W) return;
      ctx.fillStyle = '#2ee6ff';
      ctx.shadowColor = '#2ee6ff';
      ctx.shadowBlur = 14;
      ctx.fillRect(sx, mp.y, mp.w, mp.h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(sx, mp.y, mp.w, 4);
    });
  }

  function drawHazards() {
    level.spikes.forEach(sp => {
      const sx = sp.x - camera.x;
      if (sx + sp.w < 0 || sx > CANVAS_W) return;
      ctx.fillStyle = '#9aa5b1';
      const spikeCount = Math.max(1, Math.floor(sp.w / 20));
      const spikeW = sp.w / spikeCount;
      for (let i = 0; i < spikeCount; i++) {
        ctx.beginPath();
        ctx.moveTo(sx + i * spikeW, sp.y + sp.h);
        ctx.lineTo(sx + i * spikeW + spikeW / 2, sp.y);
        ctx.lineTo(sx + (i + 1) * spikeW, sp.y + sp.h);
        ctx.closePath();
        ctx.fill();
      }
    });

    level.lava.forEach(lv => {
      const sx = lv.x - camera.x;
      if (sx + lv.w < 0 || sx > CANVAS_W) return;
      const wobble = Math.sin(frameCount * 0.1 + lv.x * 0.05) * 3;
      const grad = ctx.createLinearGradient(sx, lv.y, sx, lv.y + lv.h);
      grad.addColorStop(0, '#ffeb3b');
      grad.addColorStop(0.5, '#ff7043');
      grad.addColorStop(1, '#d32f2f');
      ctx.fillStyle = grad;
      ctx.fillRect(sx, lv.y + wobble, lv.w, lv.h);
      ctx.shadowColor = '#ff5722';
      ctx.shadowBlur = 16;
      ctx.fillRect(sx, lv.y + wobble, lv.w, 6);
      ctx.shadowBlur = 0;
    });

    level.springs.forEach(sp => {
      const sx = sp.x - camera.x;
      if (sx + sp.w < 0 || sx > CANVAS_W) return;
      ctx.fillStyle = '#39ff7a';
      ctx.shadowColor = '#39ff7a';
      ctx.shadowBlur = 10;
      ctx.fillRect(sx, sp.y + sp.h * 0.4, sp.w, sp.h * 0.6);
      ctx.fillRect(sx, sp.y, sp.w, sp.h * 0.35);
      ctx.shadowBlur = 0;
    });
  }

  function drawCoins() {
    level.coins.forEach(c => {
      if (c.collected) return;
      const sx = c.x - camera.x;
      if (sx < -20 || sx > CANVAS_W + 20) return;
      c.bob += 0.08;
      const bobY = c.y + Math.sin(c.bob) * 4;
      ctx.fillStyle = '#ffd23f';
      ctx.shadowColor = '#ffd23f';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(sx, bobY, 9, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.ellipse(sx - 2, bobY - 2, 3, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawEnemies() {
    level.enemies.forEach(e => {
      if (!e.alive) return;
      const sx = e.x - camera.x;
      if (sx + e.w < 0 || sx > CANVAS_W) return;

      if (e.type === 'boss') {
        ctx.fillStyle = '#ff2e88';
        ctx.shadowColor = '#ff2e88';
        ctx.shadowBlur = 18;
        ctx.fillRect(sx, e.y, e.w, e.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 12, e.y + 14, 12, 12);
        ctx.fillRect(sx + e.w - 24, e.y + 14, 12, 12);
        ctx.fillStyle = '#000';
        ctx.fillRect(sx + 16, e.y + 18, 5, 5);
        ctx.fillRect(sx + e.w - 20, e.y + 18, 5, 5);
        for (let i = 0; i < (e.hp || 0); i++) {
          ctx.fillStyle = '#ffd23f';
          ctx.fillRect(sx + e.w / 2 - 18 + i * 14, e.y - 16, 10, 8);
        }
      } else if (e.type === 'flyer') {
        ctx.fillStyle = '#b388ff';
        ctx.shadowColor = '#b388ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(sx + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        const wingFlap = Math.sin(frameCount * 0.3) * 6;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.ellipse(sx + 4, e.y + e.h / 2 - wingFlap, 8, 4, 0.4, 0, Math.PI * 2);
        ctx.ellipse(sx + e.w - 4, e.y + e.h / 2 + wingFlap, 8, 4, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(sx + e.w / 2, e.y + e.h / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ff5252';
        ctx.shadowColor = '#ff5252';
        ctx.shadowBlur = 10;
        ctx.fillRect(sx, e.y, e.w, e.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 6, e.y + 8, 8, 8);
        ctx.fillRect(sx + e.w - 14, e.y + 8, 8, 8);
        ctx.fillStyle = '#000';
        ctx.fillRect(sx + 8, e.y + 11, 4, 4);
        ctx.fillRect(sx + e.w - 12, e.y + 11, 4, 4);
        const legOffset = Math.sin(frameCount * 0.2) * 3;
        ctx.fillStyle = '#ff5252';
        ctx.fillRect(sx + 4, e.y + e.h, 8, 6 + legOffset);
        ctx.fillRect(sx + e.w - 12, e.y + e.h, 8, 6 - legOffset);
      }
    });
  }

  function drawGoal() {
    const g = level.goal;
    const sx = g.x - camera.x;
    if (sx + g.w < -50 || sx > CANVAS_W + 50) return;
    const pulse = 0.7 + Math.sin(frameCount * 0.08) * 0.3;
    ctx.save();
    ctx.globalAlpha = pulse;
    const grad = ctx.createRadialGradient(sx + g.w / 2, g.y + g.h / 2, 5, sx + g.w / 2, g.y + g.h / 2, g.w);
    grad.addColorStop(0, '#39ff7a');
    grad.addColorStop(1, 'rgba(57,255,122,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx - 30, g.y - 30, g.w + 60, g.h + 60);
    ctx.restore();

    ctx.strokeStyle = '#39ff7a';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#39ff7a';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.ellipse(sx + g.w / 2, g.y + g.h / 2, g.w / 2, g.h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GOAL', sx + g.w / 2, g.y - 14);
    ctx.textAlign = 'left';
  }

  function drawPlayer() {
    const sx = player.x - camera.x;
    const blinking = player.invulnTimer > 0 && Math.floor(player.invulnTimer / 5) % 2 === 0;
    if (blinking) return;

    ctx.save();
    const cx = sx + player.w / 2;
    const cy = player.y + player.h;
    ctx.translate(cx, cy);
    ctx.scale(player.facing, 1);
    ctx.scale(1, player.squash);
    ctx.translate(-player.w / 2, -player.h / player.squash);

    // body
    ctx.fillStyle = '#2ee6ff';
    ctx.shadowColor = '#2ee6ff';
    ctx.shadowBlur = 14;
    ctx.fillRect(4, 10, player.w - 8, player.h - 10);
    ctx.shadowBlur = 0;

    // head
    ctx.fillStyle = '#ffe0b2';
    ctx.fillRect(2, 0, player.w - 4, 16);

    // cap
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(0, -4, player.w, 8);
    ctx.fillRect(player.w - 6, -2, 12, 6);

    // eye
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(player.w - 14, 6, 4, 4);

    // legs (simple run animation)
    ctx.fillStyle = '#12172b';
    const legShift = player.onGround && Math.abs(player.vx) > 0.3 ? Math.sin(player.animFrame * 1.5) * 4 : 0;
    ctx.fillRect(6, player.h - 8, 8, 8 + legShift);
    ctx.fillRect(player.w - 14, player.h - 8, 8, 8 - legShift);

    ctx.restore();
  }

  function drawParticles() {
    particles.forEach(p => {
      const sx = p.x - camera.x;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (!level || !player) return;

    drawBackground();
    drawPlatforms();
    drawHazards();
    drawCoins();
    drawEnemies();
    drawGoal();
    drawPlayer();
    drawParticles();
  }

  // ============================================================
  // MAIN LOOP
  // ============================================================
  function loop(now) {
    rafId = requestAnimationFrame(loop);
    update();
    render();
  }

  // ============================================================
  // INIT
  // ============================================================
  buildLevelButtons();

  // ---- Test hook (no-op in normal browser use; lets a headless harness
  // drive the real game logic for verification) ----
  if (typeof globalThis !== 'undefined') {
    globalThis.__GAME_DEBUG__ = {
      getState: () => state,
      getLevel: () => level,
      getPlayer: () => player,
      getLives: () => lives,
      getScore: () => score,
      getCurrentLevelIndex: () => currentLevelIndex,
      getHighestUnlocked: () => highestUnlockedLevel,
      startFromMenu,
      loadLevel,
      restartCurrentLevel,
      advanceToNextLevel,
      update,
      enterLevelComplete,
      enterGameOver,
      enterVictory,
      goToMenu,
      setInput: (partial) => Object.assign(input, partial),
      TOTAL_LEVELS,
    };
  }
})();
