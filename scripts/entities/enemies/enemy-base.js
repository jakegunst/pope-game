// enemy-base.js - Base class for all enemies with shared functionality

class EnemyBase {
    constructor(x, y, config = {}) {
        // Position and dimensions
        this.x = x;
        this.y = y;
        this.width = config.width || 32;
        this.height = config.height || 32;
        
        // Movement
        this.speedX = 0;
        this.speedY = 0;
        this.baseSpeed = config.speed || 2;
        
        // Health system
        this.maxHealth = config.health || 1;
        this.health = this.maxHealth;
        this.showHealthBar = this.maxHealth > 1;
        
        // Combat properties
        this.damage = config.damage || 10;  // Damage dealt to player
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        this.maxInvulnerabilityTime = 30;  // 0.5 seconds at 60fps
        
        // Vulnerability system
        this.vulnerabilities = config.vulnerabilities || ['projectile', 'stomp'];
        // Options: 'projectile', 'stomp', 'special', 'none'
        
        // Loot system
        this.drops = config.drops || [];
        // Example: [{ type: 'coin', chance: 0.5 }, { type: 'health', chance: 0.1 }]
        
        // Visual properties
        this.color = config.color || '#8B0000';  // Dark red default
        this.variant = config.variant || 'normal';  // For color variants
        this.facingRight = true;
        
        // State machine
        this.state = 'idle';
        this.stateTimer = 0;
        
        // Physics flags
        this.isGrounded = false;
        this.affectedByGravity = config.affectedByGravity !== false;
        this.collideWithPlatforms = config.collideWithPlatforms !== false;
        
        // AI properties
        this.aiType = config.aiType || 'pattern';  // 'pattern', 'chase', 'smart'
        this.detectionRange = config.detectionRange || 200;
        this.attackRange = config.attackRange || 50;
        
        // Death animation
        this.isDead = false;
        this.deathTimer = 0;
        this.deathDuration = 30;
        
        // Flashing when hit
        this.flashTimer = 0;
        this.flashDuration = 10;
    }
    
    /**
     * Base update - called every frame
     */
    update() {
        // Update invulnerability
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime--;
            this.invulnerable = this.invulnerabilityTime > 0;
        }
        
        // Update flash timer
        if (this.flashTimer > 0) {
            this.flashTimer--;
        }
        
        // Update death animation
        if (this.isDead) {
            this.deathTimer++;
            if (this.deathTimer >= this.deathDuration) {
                this.shouldRemove = true;
            }
            return; // Don't update AI when dead
        }
        
        // Apply gravity if needed (BEFORE movement)
        if (this.affectedByGravity && !this.isGrounded) {
            window.physics.applyGravity(this);
        }
        
        // Update state timer
        this.stateTimer++;
        
        // Let subclasses handle their specific AI
        this.updateAI();
        
        // Apply movement
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Update facing direction
        if (this.speedX !== 0) {
            this.facingRight = this.speedX > 0;
        }
    }
    
    /**
     * AI update - override in subclasses
     */
    updateAI() {
        // To be implemented by subclasses
    }
    
    /**
     * Take damage from a source
     * @param {number} amount - Damage amount
     * @param {string} type - Damage type ('projectile', 'stomp', etc)
     * @returns {boolean} - Whether damage was dealt
     */
    takeDamage(amount, type) {
        // Check if vulnerable to this damage type
        if (!this.vulnerabilities.includes(type)) {
            return false;
        }
        
        // Check if invulnerable
        if (this.invulnerable || this.isDead) {
            return false;
        }
        
        // Apply damage
        this.health -= amount;
        this.flashTimer = this.flashDuration;
        
        if (this.health <= 0) {
            this.die();
        } else {
            // Become temporarily invulnerable
            this.invulnerable = true;
            this.invulnerabilityTime = this.maxInvulnerabilityTime;
            
            // Knockback or other effects could go here
            this.onHit(type);
        }
        
        return true;
    }
    
    /**
     * Called when hit but not killed
     */
    onHit(damageType) {
        // Override in subclasses for special hit reactions
    }
    
    /**
     * Handle death
     */
    die() {
        this.isDead = true;
        this.deathTimer = 0;
        this.speedX = 0;
        this.speedY = 0;
        
        // Drop loot
        this.dropLoot();
        
        // Could trigger death sound/particles here
    }
    
    /**
     * Drop loot on death
     */
    dropLoot() {
        const droppedItems = [];
        
        this.drops.forEach(drop => {
            if (Math.random() < drop.chance) {
                droppedItems.push({
                    type: drop.type,
                    x: this.x + this.width / 2,
                    y: this.y
                });
            }
        });
        
        // Return items to be spawned by enemy manager
        return droppedItems;
    }
    
    /**
     * Check if player is in detection range
     */
    canSeePlayer(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= this.detectionRange;
    }
    
    /**
     * Get direction to player
     */
    getDirectionToPlayer(player) {
        return {
            x: player.x - this.x,
            y: player.y - this.y
        };
    }
    
    /**
     * Basic collision response
     */
    onCollisionWithPlatform(platform, collision) {
        if (collision.fromTop && this.speedY >= 0) {
            console.log(`Enemy collision with platform at y:${platform.y}, setting enemy y to ${platform.y - this.height}`);
            this.y = platform.y - this.height;
            this.speedY = 0;
            this.isGrounded = true;
        }
    }
    
    /**
     * Draw the enemy
     */
    draw(ctx) {
        // Flash white when hit
        if (this.flashTimer > 0 && this.flashTimer % 4 < 2) {
            ctx.fillStyle = 'white';
        } else if (this.isDead) {
            // Fade out when dying
            ctx.globalAlpha = 1 - (this.deathTimer / this.deathDuration);
            ctx.fillStyle = this.color;
        } else {
            // Normal color based on variant
            switch(this.variant) {
                case 'strong':
                    ctx.fillStyle = '#FF0000';  // Bright red
                    break;
                case 'fast':
                    ctx.fillStyle = '#FF6600';  // Orange
                    break;
                case 'armored':
                    ctx.fillStyle = '#4B0082';  // Indigo
                    break;
                default:
                    ctx.fillStyle = this.color;
            }
        }
        
        // Draw body
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw health bar if needed
        if (this.showHealthBar && this.health < this.maxHealth && !this.isDead) {
            this.drawHealthBar(ctx);
        }
        
        // Reset alpha
        if (this.isDead) {
            ctx.globalAlpha = 1;
        }
        
        // Draw facing indicator (temporary)
        ctx.fillStyle = 'white';
        const eyeX = this.facingRight ? 
            this.x + this.width - 8 : 
            this.x + 4;
        ctx.fillRect(eyeX, this.y + 8, 4, 4);
    }
    
    /**
     * Draw health bar above enemy
     */
    drawHealthBar(ctx) {
        const barWidth = this.width;
        const barHeight = 4;
        const barY = this.y - 10;
        
        // Background
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? 'green' : 
                        healthPercent > 0.25 ? 'yellow' : 'red';
        ctx.fillRect(this.x, barY, barWidth * healthPercent, barHeight);
    }
    
    /**
     * Set grounded state (called from collision detection)
     */
    setGrounded(grounded) {
        this.isGrounded = grounded;
    }
}

// Export the EnemyBase class
window.EnemyBase = EnemyBase;
