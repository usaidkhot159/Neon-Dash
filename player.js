/* ============================================
   PLAYER.JS
   Player entity: position, physics, input response,
   collision resolution against axis-aligned rectangles.
============================================ */

class Player {
  constructor(x, y) {
    this.startX = x;
    this.startY = y;
    this.reset();
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.w = 34;
    this.h = 44;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1;          // 1 = right, -1 = left
    this.jumpsUsed = 0;
    this.maxJumps = 2;        // double jump
    this.coyoteTimer = 0;     // small grace window after leaving a ledge
    this.invulnTimer = 0;     // brief invulnerability after taking damage
    this.dead = false;
    this.onIce = false;
    this.standingOn = null;   // reference to moving platform, if any
    this.animTimer = 0;
    this.animFrame = 0;
    this.squash = 1;          // visual squash/stretch factor
  }

  get rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(input, level, dt) {
    const accel = this.onIce ? 0.35 : 0.85;
    const friction = this.onIce ? 0.94 : 0.80;
    const maxSpeed = 5.2;

    // --- Horizontal movement ---
    if (input.left && !input.right) {
      this.vx -= accel;
      this.facing = -1;
    } else if (input.right && !input.left) {
      this.vx += accel;
      this.facing = 1;
    } else {
      this.vx *= friction;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
    }
    this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));

    // --- Coyote time bookkeeping ---
    if (this.onGround) {
      this.coyoteTimer = 8;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer--;
    }

    // --- Jumping (edge-triggered via input.jumpPressed) ---
    const canJump = this.onGround || this.coyoteTimer > 0 || this.jumpsUsed < this.maxJumps;
    if (input.jumpPressed && canJump) {
      if (this.onGround || this.coyoteTimer > 0) {
        this.jumpsUsed = 1;
      } else {
        this.jumpsUsed++;
      }
      this.vy = -12.5;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.squash = 1.25;
    }
    input.jumpPressed = false; // always consume the edge trigger

    // Variable jump height: cut upward velocity if jump released early
    if (!input.jumpHeld && this.vy < -4) {
      this.vy = -4;
    }

    // --- Gravity ---
    this.vy += level.gravity;
    if (this.vy > 16) this.vy = 16;

    // --- Apply movement with collision resolution (axis separated) ---
    this.onIce = false;
    this.standingOn = null;
    const wasOnGround = this.onGround;
    this.onGround = false;

    this._moveAxis('x', this.vx, level);
    this._moveAxis('y', this.vy, level);

    if (!wasOnGround && this.onGround) {
      this.squash = 0.78; // landing squash
    }
    this.squash += (1 - this.squash) * 0.25;

    // --- Bounds: keep inside world horizontally ---
    if (this.x < 0) { this.x = 0; this.vx = 0; }
    if (this.x + this.w > level.width) { this.x = level.width - this.w; this.vx = 0; }

    // --- Invulnerability decay ---
    if (this.invulnTimer > 0) this.invulnTimer--;

    // --- Fell into the void ---
    if (this.y > level.height + 100) {
      this.dead = true;
    }

    // --- Animation ---
    this.animTimer++;
    if (Math.abs(this.vx) > 0.3 && this.onGround) {
      if (this.animTimer % 7 === 0) this.animFrame = (this.animFrame + 1) % 4;
    } else if (this.onGround) {
      this.animFrame = 0;
    }
  }

  _moveAxis(axis, velocity, level) {
    if (axis === 'x') {
      this.x += velocity;
    } else {
      this.y += velocity;
    }

    const solids = level._solidRects; // precomputed each frame by game.js

    for (const solid of solids) {
      if (!this._overlaps(solid)) continue;

      if (axis === 'x') {
        if (velocity > 0) this.x = solid.x - this.w;
        else if (velocity < 0) this.x = solid.x + solid.w;
        this.vx = 0;
      } else {
        if (velocity > 0) {
          // landing on top
          this.y = solid.y - this.h;
          this.vy = 0;
          this.onGround = true;
          this.jumpsUsed = 0;
          if (solid.type === 'ice') this.onIce = true;
          if (solid.isMoving) this.standingOn = solid.ref;
        } else if (velocity < 0) {
          // hitting head on underside
          this.y = solid.y + solid.h;
          this.vy = 0;
        }
      }
    }
  }

  _overlaps(r) {
    return this.x < r.x + r.w &&
           this.x + this.w > r.x &&
           this.y < r.y + r.h &&
           this.y + this.h > r.y;
  }

  takeHit() {
    if (this.invulnTimer > 0) return false;
    this.invulnTimer = 90;
    return true;
  }

  bounceSpring() {
    this.vy = -16.5;
    this.jumpsUsed = 0;
    this.squash = 1.4;
  }

  bounceOffEnemy() {
    this.vy = -9.5;
    this.jumpsUsed = Math.min(this.jumpsUsed, 1);
  }
}
