// enemy-base.js - Base class for all enemies with sprite support

class EnemyBase {
    constructor(x, y, config = {}) {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        
        // Movement
        this.speedX = 0;
        this.speedY = 0;
        this.baseSpeed = config.speed || 1;
        this.direction = config.startDirection || 1; // 1 = right, -1 = left
        
        // State
        this.state = 'idle';
        this.health = config.health || 1;
        this.maxHealth = this.health;
        this.isAlive = true;
        this.isGrounded = false;
        
        // AI Configuration
        this.aiType = config.aiType || 'patrol';
        this.detectionRange = config.detectionRange || 150;
        this.patrolDistance = config.patrolDistance || 100;
        this.startX = x;
        this.variant = config.variant || 'normal';
        
        // Combat
        this.damage = config.damage || 1;
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        this.knockbackPower = config.knockbackPower || 5;
        
        // Physics
        this.useGravity = config.useGravity !== false;
        this.turnAtEdges = config.turnAtEdges !== false;
        this.turnCooldown = 0;
        
        // Visual
        this.color = this.getColorForVariant();
        
        // Collision settings
        this.collideWithPlatforms = true;
        this.affectedByGravity = this.useGravity;
        this.vulnerabilities = ['stomp', 'projectile'];  // What can hurt this enemy
        
        // Sprite setup
        this.spriteSheet = null;
        this.spriteLoaded = false;
        this.currentFrame = 0;
        this.animationTimer = 0;
        this.animationSpeed = 0.1;
        this.frameCount = 3; // 3 frames per enemy type in the sprite sheet
        this.spriteSize = 32; // Each sprite is 32x32 in the sheet
        
        // Load the shared sprite sheet
        this.loadSpriteSheet();
    }
    
    /**
     * Load the shared enemy sprite sheet
     */
    loadSpriteSheet() {
        if (!window.enemySpriteSheet) {
            window.enemySpriteSheet = new Image();
            window.enemySpriteSheet.src = 'assets/images/enemies/enemies.png';
            window.enemySpriteSheet.onload = () => {
                console.log('Enemy sprite sheet loaded');
            };
        }
        this.spriteSheet = window.enemySpriteSheet;
        
        // Check if already loaded
        if (this.spriteSheet.complete && this.spriteSheet.naturalHeight !== 0) {
            this.spriteLoaded = true;
        } else {
            this.spriteSheet.addEventListener('load', () => {
                this.spriteLoaded = true;
            });
        }
    }
    
    /**
     * Get sprite sheet row based on enemy type and variant
     * Override this in subclasses
     */
    getSpriteRow() {
        return 0; // Default to first row
    }
    
    /**
     * Get color based on variant (fallback for when sprites aren't loaded)
     */
    getColorForVariant() {
        switch(this.variant) {
            case 'strong': return '#FF0000';   // Red
            case 'fast': return '#0000FF';     // Blue
            default: return '#00FF00';         // Green
        }
    }
    
    /**
     * Update enemy logic
     */
    update() {
        if (!this.isAlive) return;
        
        // Update invulnerability
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime--;
            this.invulnerable = this.invulnerabilityTime > 0;
        }
        
        // Apply gravity if needed
        if (this.useGravity) {
            this.speedY += window.physics.gravity;
            if (this.speedY > window.physics.maxFallSpeed) {
                this.speedY = window.physics.maxFallSpeed;
            }
        }
        
        // Update AI
        this.updateAI();
        
        // Update position
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Update animation
        this.updateAnimation();
        
        // Check if fell off the world
        if (this.y > 1000) {
            this.isAlive = false;
        }
        
        // Update turn cooldown
        if (this.turnCooldown > 0) {
            this.turnCooldown--;
        }
    }
    
    /**
     * Update sprite animation
     */
    updateAnimation() {
        if (!this.spriteLoaded || this.frameCount <= 1) return;
        
        this.animationTimer += this.animationSpeed;
        if (this.animationTimer >= 1) {
            this.currentFrame = (this.currentFrame + 1) % this.frameCount;
            this.animationTimer = 0;
        }
    }
    
    /**
     * Update AI behavior
     */
    updateAI() {
        switch(this.aiType) {
            case 'patrol':
                this.patrolAI();
                break;
            case 'chase':
                this.chaseAI();
                break;
            case 'idle':
                this.speedX = 0;
                break;
        }
    }
    
    /**
     * Basic patrol AI
     */
    patrolAI() {
        // Move in current direction
        this.speedX = this.baseSpeed * this.direction;
        
        // Turn around at patrol boundaries
        if (this.patrolDistance > 0) {
            const distanceFromStart = Math.abs(this.x - this.startX);
            if (distanceFromStart > this.patrolDistance && this.turnCooldown === 0) {
                this.turn();
            }
        }
    }
    
    /**
     * Chase player AI
     */
    chaseAI() {
        if (!window.player) {
            this.patrolAI();
            return;
        }
        
        const dx = window.player.x - this.x;
        const dy = window.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.detectionRange) {
            // Chase player
            this.direction = dx > 0 ? 1 : -1;
            this.speedX = this.baseSpeed * this.direction * 1.5; // Move faster when chasing
            this.state = 'chasing';
        } else {
            // Return to patrol
            this.patrolAI();
            this.state = 'patrolling';
        }
    }
    
    /**
     * Turn around
     */
    turn() {
        if (this.turnCooldown > 0) return;
        this.direction *= -1;
        this.turnCooldown = 30; // Half second cooldown
    }
    
    /**
     * Take damage
     */
    takeDamage(amount, fromX) {
        if (this.invulnerable || !this.isAlive) return;
        
        this.health -= amount;
        this.invulnerable = true;
        this.invulnerabilityTime = 30;
        
        // Knockback
        const knockbackDir = this.x < fromX ? -1 : 1;
        this.speedX = knockbackDir * this.knockbackPower;
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    /**
     * Die and drop loot
     */
    die() {
        this.isAlive = false;
        
        // Drop loot
        const drop = Math.random();
        let dropType = null;
        
        if (drop < 0.75) {
            dropType = 'tithe'; // 75% chance
        } else {
            dropType = 'beer';  // 25% chance
        }
        
        if (dropType && window.gameEngine) {
            window.gameEngine.collectiblesManager.spawnCollectible(
                dropType, 
                this.x + this.width/2, 
                this.y
            );
        }
    }
    
    /**
     * Check collision with player
     */
    checkPlayerCollision() {
        if (!window.player || !this.isAlive) return;
        
        const collision = window.collisionDetection.checkRectCollision(this, window.player);
        if (collision) {
            // Check if player is stomping
            if (window.player.speedY > 0 && window.player.y < this.y) {
                this.takeDamage(1, window.player.x);
                window.player.speedY = -10; // Bounce player up
                return;
            }
            
            // Otherwise damage player
            if (!window.player.invulnerable) {
                window.gameEngine.playerStats.health -= this.damage;
                window.player.invulnerable = true;
                window.player.invulnerabilityTime = 60;
                
                // Knockback player
                const knockbackDir = window.player.x < this.x ? -1 : 1;
                window.player.speedX = knockbackDir * 8;
                window.player.speedY = -5;
                
                // Check if player died
                if (window.gameEngine.playerStats.health <= 0) {
                    window.gameEngine.playerDeath();
                }
            }
        }
    }
    
    /**
     * Draw the enemy
     */
    draw(ctx) {
        if (!this.isAlive) return;
        
        ctx.save();
        
        // Flash when invulnerable
        if (this.invulnerable && this.invulnerabilityTime % 4 < 2) {
            ctx.globalAlpha = 0.5;
        }
        
        if (this.spriteLoaded && this.spriteSheet) {
            // Get sprite position from sheet
            const row = this.getSpriteRow();
            const sourceX = this.currentFrame * this.spriteSize;
            const sourceY = row * this.spriteSize;
            
            // Flip sprite based on direction
            if (this.direction < 0) {
                ctx.scale(-1, 1);
                ctx.drawImage(
                    this.spriteSheet,
                    sourceX, sourceY,
                    this.spriteSize, this.spriteSize,
                    -this.x - this.width, this.y,
                    this.width, this.height
                );
            } else {
                ctx.drawImage(
                    this.spriteSheet,
                    sourceX, sourceY,
                    this.spriteSize, this.spriteSize,
                    this.x, this.y,
                    this.width, this.height
                );
            }
        } else {
            // Fallback colored rectangle
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Draw eyes to show direction
            ctx.fillStyle = 'white';
            const eyeY = this.y + 5;
            if (this.direction > 0) {
                ctx.fillRect(this.x + 18, eyeY, 4, 4);
                ctx.fillRect(this.x + 24, eyeY, 4, 4);
            } else {
                ctx.fillRect(this.x + 4, eyeY, 4, 4);
                ctx.fillRect(this.x + 10, eyeY, 4, 4);
            }
        }
        
        ctx.restore();
        
        // Draw health bar if damaged
        if (this.health < this.maxHealth) {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y - 8, this.width, 4);
            ctx.fillStyle = 'green';
            ctx.fillRect(this.x, this.y - 8, this.width * (this.health / this.maxHealth), 4);
        }
    }
    
    /**
     * Set grounded state
     */
    setGrounded(grounded) {
        this.isGrounded = grounded;
        if (grounded) {
            this.speedY = 0;
        }
    }
    
    /**
     * Handle collision with platform
     */
    onCollisionWithPlatform(platform, collision) {
        // Use the same collision resolution as the player
        if (!window.collisionDetection) return;
        
        window.collisionDetection.handlePlatformCollision(this, platform, collision);
    }
    
    /**
     * Called when enemy reaches platform edge
     */
    onPlatformEdge() {
        // Turn around by default
        this.turn();
    }
}

// Export
window.EnemyBase = EnemyBase;
