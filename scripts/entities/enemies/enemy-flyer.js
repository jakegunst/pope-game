// enemy-flyer.js - Flying enemy that hovers and swoops

class EnemyFlyer extends EnemyBase {
    constructor(x, y, config = {}) {
        // Set flyer-specific defaults
        const flyerConfig = {
            ...config,
            speed: config.speed || 1.5,
            health: config.health || 1,
            damage: config.damage || 25,  // CHANGED: Default 25% damage for flyers
            useGravity: false,  // Flyers don't fall
            turnAtEdges: false   // Flyers don't need edge detection
        };
        
        super(x, y, flyerConfig);
        
        // Flying-specific properties
        this.baseY = y;  // Remember starting height
        this.hoverAmplitude = 30;  // How much to bob up and down
        this.hoverSpeed = 0.05;
        this.hoverOffset = Math.random() * Math.PI * 2;  // Random starting phase
        this.swoopSpeed = 4;
        this.isSwooping = false;
        this.swoopCooldown = 0;
        this.visionRange = 200;
        
        // Different flight patterns
        this.flightPattern = config.flightPattern || 'hover';  // hover, circle, patrol
        this.circleRadius = 50;
        this.circleAngle = 0;
    }
    
    /**
     * Load flyer sprite
     */
    loadSprite() {
        this.sprite = new Image();
        this.sprite.src = 'assets/images/enemies/flyer-normal.png';
        
        this.sprite.onload = () => {
            this.spriteLoaded = true;
            console.log('Flyer sprite loaded');
        };
    }
    
    /**
     * Update AI behavior specific to flyers
     */
    updateAI() {
        // Update swoop cooldown
        if (this.swoopCooldown > 0) {
            this.swoopCooldown--;
        }
        
        // Check for player to swoop at
        if (window.player && !this.isSwooping && this.swoopCooldown === 0) {
            const dx = window.player.x - this.x;
            const dy = window.player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.visionRange && dy > -50) {  // Player is below or slightly above
                this.startSwoop();
            }
        }
        
        if (this.isSwooping) {
            this.swoopAI();
        } else {
            // Normal flight pattern
            switch (this.flightPattern) {
                case 'circle':
                    this.circleAI();
                    break;
                case 'patrol':
                    this.patrolAI();
                    break;
                default:
                    this.hoverAI();
            }
        }
    }
    
    /**
     * Hovering flight pattern
     */
    hoverAI() {
        // Gentle horizontal movement
        this.speedX = Math.sin(this.hoverOffset) * 0.5;
        
        // Bob up and down
        const targetY = this.baseY + Math.sin(this.hoverOffset) * this.hoverAmplitude;
        this.speedY = (targetY - this.y) * 0.1;
        
        this.hoverOffset += this.hoverSpeed;
    }
    
    /**
     * Circular flight pattern
     */
    circleAI() {
        this.circleAngle += 0.02;
        
        const targetX = this.startX + Math.cos(this.circleAngle) * this.circleRadius;
        const targetY = this.baseY + Math.sin(this.circleAngle) * this.circleRadius;
        
        this.speedX = (targetX - this.x) * 0.1;
        this.speedY = (targetY - this.y) * 0.1;
        
        // Face direction of movement
        this.direction = this.speedX > 0 ? 1 : -1;
    }
    
    /**
     * Start swooping at player
     */
    startSwoop() {
        this.isSwooping = true;
        this.state = 'swooping';
        
        // Calculate swoop direction
        const dx = window.player.x - this.x;
        const dy = window.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.speedX = (dx / distance) * this.swoopSpeed;
        this.speedY = (dy / distance) * this.swoopSpeed;
        
        this.direction = dx > 0 ? 1 : -1;
    }
    
    /**
     * Swooping behavior
     */
    swoopAI() {
        // Continue in swoop direction
        // Gradually return to normal height
        if (this.y > this.baseY + this.hoverAmplitude * 2 || 
            this.y < this.baseY - this.hoverAmplitude * 2) {
            this.endSwoop();
        }
        
        // End swoop if hit platform
        if (this.speedY > 0 && this.y > this.baseY) {
            this.endSwoop();
        }
    }
    
    /**
     * End swoop and return to normal pattern
     */
    endSwoop() {
        this.isSwooping = false;
        this.state = 'idle';
        this.swoopCooldown = 180;  // 3 seconds at 60fps
        
        // Slow down
        this.speedX *= 0.5;
        this.speedY *= 0.5;
    }
    
    /**
     * Override draw to add wing flapping animation
     */
    draw(ctx) {
        if (!this.isAlive) return;
        
        ctx.save();
        
        // Flash when invulnerable
        if (this.invulnerable && this.invulnerabilityTime % 4 < 2) {
            ctx.globalAlpha = 0.5;
        }
        
        if (this.spriteLoaded && this.sprite) {
            // Flyer sprites might have multiple frames for wing positions
            const frameCount = 2;
            const currentFrame = Math.floor(this.animationTimer * 10) % frameCount;
            
            // Draw sprite with animation
            if (this.direction < 0) {
                ctx.scale(-1, 1);
                ctx.drawImage(
                    this.sprite,
                    currentFrame * this.frameWidth, 0,
                    this.frameWidth, this.frameHeight,
                    -this.x - this.width, this.y,
                    this.width, this.height
                );
            } else {
                ctx.drawImage(
                    this.sprite,
                    currentFrame * this.frameWidth, 0,
                    this.frameWidth, this.frameHeight,
                    this.x, this.y,
                    this.width, this.height
                );
            }
            
            this.animationTimer += 0.016;  // Assuming 60fps
        } else {
            // Fallback: Draw as flying creature
            ctx.fillStyle = this.isSwooping ? '#FF0000' : this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Draw wings
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            const wingOffset = Math.sin(this.hoverOffset * 4) * 5;
            ctx.fillRect(this.x - 5, this.y + 5 + wingOffset, 5, 15);
            ctx.fillRect(this.x + this.width, this.y + 5 - wingOffset, 5, 15);
            
            // Draw eyes
            ctx.fillStyle = 'white';
            const eyeY = this.y + 8;
            if (this.direction > 0) {
                ctx.fillRect(this.x + 18, eyeY, 3, 3);
                ctx.fillRect(this.x + 23, eyeY, 3, 3);
            } else {
                ctx.fillRect(this.x + 6, eyeY, 3, 3);
                ctx.fillRect(this.x + 11, eyeY, 3, 3);
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
}

// Export
window.EnemyFlyer = EnemyFlyer;
