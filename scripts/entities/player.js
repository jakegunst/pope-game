// player.js - Handles all player movement, input, and state

class Player {
    constructor(x, y) {
        // Position and dimensions
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 64;
        
        // Movement properties
        this.speedX = 0;  // Current horizontal velocity
        this.speedY = 0;  // Current vertical velocity
        
        // State machine
        this.state = 'idle';  // Current state
        this.facingRight = true;  // Which direction we're facing
        this.idleTimer = 0;  // For tracking long idle state
        
        // Jump mechanics
        this.isGrounded = false;
        this.coyoteTime = 0;  // Frames since leaving ground
        this.coyoteTimeMax = 6;  // Allow jump for 6 frames after leaving platform
        this.hasReleasedJump = true;  // Prevent jump key holding
        
        // Projectile system (holy water)
        this.projectiles = [];
        this.maxProjectiles = 3;  // Limit active projectiles
        this.chargeTime = 0;
        this.maxChargeTime = 60;  // 1 second full charge
        this.isCharging = false;
        this.lastShotTime = 0;
        this.shotCooldown = 15;  // Quarter second between shots
        
        // Invulnerability (from enemy damage)
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        
        // Visual properties
        this.color = '#D2B48C';  // Tan color
        
        // Input states
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            space: false
        };
    }
    
    /**
     * Handle keyboard input
     * Called from main.js event listeners
     */
    handleKeyDown(key) {
        switch(key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.keys.left = true;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.keys.right = true;
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.keys.up = true;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.keys.down = true;
                break;
            case ' ':  // Spacebar
                this.keys.space = true;
                this.isCharging = true;  // Start charging
                break;
        }
    }
    
    handleKeyUp(key) {
        switch(key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.keys.left = false;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.keys.right = false;
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.keys.up = false;
                this.hasReleasedJump = true;  // Can jump again
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.keys.down = false;
                break;
            case ' ':  // Spacebar
                this.keys.space = false;
                if (this.isCharging && this.chargeTime > 0) {
                    this.shoot();  // Release the charged shot
                }
                this.isCharging = false;
                this.chargeTime = 0;
                break;
        }
    }
    
    /**
     * Update player physics and state
     * Called every frame from main.js
     */
    update() {
        // Get input direction
        let inputDirection = 0;
        if (this.keys.left) inputDirection = -1;
        if (this.keys.right) inputDirection = 1;
        
        // Update facing direction
        if (inputDirection !== 0) {
            this.facingRight = inputDirection > 0;
        }
        
        // Use physics system for movement
        window.physics.applyMovement(this, inputDirection);
        
        // Apply gravity - THIS WAS MISSING!
        window.physics.applyGravity(this);
        
        // Handle jumping
        if (this.keys.up && this.hasReleasedJump) {
            // Can jump if grounded OR within coyote time
            if (this.isGrounded || this.coyoteTime < this.coyoteTimeMax) {
                this.jump();
                this.hasReleasedJump = false;
            }
        }
        
        // Update coyote time
        if (!this.isGrounded) {
            this.coyoteTime++;
        } else {
            this.coyoteTime = 0;
        }
        
        // Apply movement
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Keep player within level bounds
        if (window.gameEngine && window.gameEngine.currentLevel) {
            const level = window.gameEngine.currentLevel;
            this.x = Math.max(0, Math.min(level.pixelWidth - this.width, this.x));
            
            // Prevent going above level top
            if (this.y < 0) {
                this.y = 0;
                this.speedY = Math.max(0, this.speedY);
            }
        }
        
        // Update projectile charging
        if (this.isCharging && this.lastShotTime <= 0) {
            this.chargeTime = Math.min(this.chargeTime + 1, this.maxChargeTime);
        }
        
        // Update shot cooldown
        if (this.lastShotTime > 0) {
            this.lastShotTime--;
        }
        
        // Update projectiles
        this.updateProjectiles();
        
        // Update invulnerability
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime--;
            this.invulnerable = this.invulnerabilityTime > 0;
        }
        
        // Update state machine
        this.updateState();
        
        // Handle idle timer
        if (this.state === 'idle') {
            this.idleTimer++;
        } else {
            this.idleTimer = 0;
        }
    }
    
    /**
     * Make the player jump
     */
    jump() {
        this.speedY = window.physics.playerJumpPower;
        this.isGrounded = false;
    }
    
    /**
     * Update the player's state based on current conditions
     */
    updateState() {
        // Determine current state
        if (this.speedY < -0.5) {  // Add threshold for jumping
            this.state = 'jumping';
        } else if (this.speedY > 0.5 && !this.isGrounded) {  // Add threshold for falling
            this.state = 'falling';
        } else if (Math.abs(this.speedX) > 0.5) {  // Already has threshold
            this.state = 'walking';
        } else if (this.idleTimer > 300) {  // 5 seconds at 60fps
            this.state = 'longIdle';
        } else if (this.isGrounded) {  // Make sure we're grounded for idle
            this.state = 'idle';
        } else {
            // Default to falling if not grounded and not moving much
            this.state = Math.abs(this.speedY) < 0.5 ? 'idle' : 'falling';
        }
    }
    
    /**
     * Shoot holy water projectile
     */
    shoot() {
        if (this.projectiles.length >= this.maxProjectiles || this.lastShotTime > 0) {
            return;  // Can't shoot
        }
        
        // Calculate projectile power based on charge
        const chargePower = this.chargeTime / this.maxChargeTime;
        const minSpeed = 5;
        const maxSpeed = 15;
        const speed = minSpeed + (maxSpeed - minSpeed) * chargePower;
        
        // Create projectile
        const projectile = {
            x: this.x + (this.facingRight ? this.width : -8),
            y: this.y + this.height / 3,
            width: 8 + chargePower * 8,  // Bigger when charged
            height: 6,
            speedX: this.facingRight ? speed : -speed,
            speedY: -2,  // Slight arc
            power: Math.ceil(chargePower * 3) || 1,  // 1-3 damage
            lifetime: 60 + chargePower * 60  // Lasts longer when charged
        };
        
        this.projectiles.push(projectile);
        this.lastShotTime = this.shotCooldown;
    }
    
    /**
     * Update all projectiles
     */
    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // Update position
            proj.x += proj.speedX;
            proj.y += proj.speedY;
            proj.speedY += 0.3;  // Gravity effect
            
            // Update lifetime
            proj.lifetime--;
            
            // Check if hit enemy
            if (window.enemyManager) {
                const hit = window.enemyManager.checkPlayerProjectile(proj);
                if (hit) {
                    this.projectiles.splice(i, 1);
                    continue;
                }
            }
            
            // Remove if expired or off screen
            if (proj.lifetime <= 0 || 
                proj.x < -100 || proj.x > 2000 || 
                proj.y > 1000) {
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    /**
     * Draw the player
     * Called every frame from main.js
     */
    draw(ctx) {
        // Flash when invulnerable
        if (this.invulnerable && this.invulnerabilityTime % 8 < 4) {
            ctx.globalAlpha = 0.5;
        }
        
        // Draw main body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw eye to show facing direction
        ctx.fillStyle = 'black';
        let eyeX = this.facingRight ? 
            this.x + this.width - 8 : 
            this.x + 4;
        let eyeY = this.y + 15;
        ctx.fillRect(eyeX, eyeY, 4, 4);
        
        // Draw charge indicator when charging
        if (this.isCharging && this.chargeTime > 0) {
            const chargePercent = this.chargeTime / this.maxChargeTime;
            ctx.fillStyle = `rgba(0, 162, 255, ${0.3 + chargePercent * 0.7})`;
            ctx.fillRect(
                this.x - 5, 
                this.y - 10, 
                (this.width + 10) * chargePercent, 
                4
            );
        }
        
        // Reset alpha
        if (this.invulnerable) {
            ctx.globalAlpha = 1;
        }
        
        // Draw state indicator (temporary - for debugging)
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.fillText(this.state, this.x - 10, this.y - 5);
        
        // Draw projectiles
        this.projectiles.forEach(proj => {
            // Holy water is blue
            const alpha = proj.lifetime / 120;  // Fade as it expires
            ctx.fillStyle = `rgba(0, 162, 255, ${alpha})`;
            ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
            
            // Add droplet effect
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
            ctx.fillRect(proj.x + 2, proj.y + 1, 2, 2);
        });
    }
    
    /**
     * Set grounded state (called from collision detection)
     */
    setGrounded(grounded) {
        this.isGrounded = grounded;
        if (grounded) {
            this.speedY = 0;
        }
    }
}

// Export the Player class so main.js can use it
// In a browser environment, we'll attach it to window
window.Player = Player;
