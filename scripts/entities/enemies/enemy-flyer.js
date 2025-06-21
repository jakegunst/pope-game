// enemy-flyer.js - Flying enemy with various patterns

class EnemyFlyer extends EnemyBase {
    constructor(x, y, config = {}) {
        // Set defaults for flyer
        config.useGravity = false;
        config.health = 2;
        config.speed = config.speed || 1.5;
        
        super(x, y, config);
        
        // Flyer specific properties
        this.width = 40;
        this.height = 30;
        this.baseY = y;
        this.flyPattern = config.flyPattern || 'sine';
        this.amplitude = config.amplitude || 100;
        this.frequency = 0.02;
        this.patternTimer = 0;
        this.diveSpeed = 5;
        this.isStomppable = false; // Can't stomp flying enemies
        
        // Override frame settings for condor
        this.frameWidth = 40;
        this.frameHeight = 30;
        this.frameCount = 1; // Condor only has 1 frame
    }
    
    /**
     * Load the flyer sprite (condor)
     */
    loadSprite() {
        this.sprite = new Image();
        this.sprite.src = 'assets/images/enemies/flyer-normal.png';
        this.sprite.onload = () => {
            this.spriteLoaded = true;
            console.log('Flyer (condor) sprite loaded');
        };
    }
    
    /**
     * Get color for flyer variant (fallback)
     */
    getColorForVariant() {
        return '#8B4513'; // Brown for bird
    }
    
    /**
     * Update flyer-specific behavior
     */
    update() {
        if (!this.isAlive) return;
        
        // Update invulnerability
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime--;
            this.invulnerable = this.invulnerabilityTime > 0;
        }
        
        // Update pattern timer
        this.patternTimer += this.frequency;
        
        // Update AI (flying patterns)
        this.updateAI();
        
        // Update position
        this.x += this.speedX;
        this.y += this.speedY;
        
        // No animation update needed (single frame)
        
        // Check if out of bounds
        if (this.y > 1000 || this.y < -200) {
            this.isAlive = false;
        }
    }
    
    /**
     * Override AI for flying patterns
     */
    updateAI() {
        switch(this.flyPattern) {
            case 'sine':
                this.sinePattern();
                break;
            case 'dive':
                this.divePattern();
                break;
            case 'hover':
                this.hoverPattern();
                break;
            case 'circle':
                this.circlePattern();
                break;
            default:
                this.sinePattern();
        }
    }
    
    /**
     * Sine wave pattern
     */
    sinePattern() {
        // Horizontal movement
        this.speedX = this.baseSpeed * this.direction;
        
        // Vertical sine wave
        this.y = this.baseY + Math.sin(this.patternTimer) * this.amplitude;
        
        // Turn around at patrol boundaries
        if (this.patrolDistance > 0) {
            const distanceFromStart = Math.abs(this.x - this.startX);
            if (distanceFromStart > this.patrolDistance) {
                this.direction *= -1;
            }
        }
    }
    
    /**
     * Dive attack pattern
     */
    divePattern() {
        if (!window.player) {
            this.hoverPattern();
            return;
        }
        
        const dx = window.player.x - this.x;
        const dy = window.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (this.state === 'diving') {
            // Continue dive
            this.speedY = this.diveSpeed;
            
            // Pull up when close to ground
            if (this.y > this.baseY + this.amplitude || dy < -50) {
                this.state = 'recovering';
                this.speedY = -this.diveSpeed / 2;
            }
        } else if (this.state === 'recovering') {
            // Return to base height
            if (this.y < this.baseY) {
                this.y = this.baseY;
                this.speedY = 0;
                this.state = 'hovering';
            }
        } else {
            // Hover and watch for player
            this.hoverPattern();
            
            // Start dive if player is below and in range
            if (distance < this.detectionRange && dy > 50 && Math.abs(dx) < 100) {
                this.state = 'diving';
                this.direction = dx > 0 ? 1 : -1;
            }
        }
    }
    
    /**
     * Hover in place pattern
     */
    hoverPattern() {
        // Small circular motion
        this.x = this.startX + Math.cos(this.patternTimer * 2) * 20;
        this.y = this.baseY + Math.sin(this.patternTimer * 2) * 10;
        
        // Face player if nearby
        if (window.player) {
            const dx = window.player.x - this.x;
            if (Math.abs(dx) < this.detectionRange) {
                this.direction = dx > 0 ? 1 : -1;
            }
        }
    }
    
    /**
     * Circular pattern
     */
    circlePattern() {
        const radius = this.amplitude;
        this.x = this.startX + Math.cos(this.patternTimer) * radius;
        this.y = this.baseY + Math.sin(this.patternTimer) * radius;
        
        // Face direction of movement
        this.direction = Math.cos(this.patternTimer + Math.PI/2) > 0 ? 1 : -1;
    }
    
    /**
     * Override collision to prevent stomping
     */
    checkPlayerCollision() {
        if (!window.player || !this.isAlive) return;
        
        const collision = window.collisionDetection.checkRectCollision(this, window.player);
        if (collision) {
            // Always damage player (can't stomp flyers)
            if (!window.player.invulnerable) {
                window.gameEngine.playerStats.health -= this.damage * 10;
                window.player.invulnerable = true;
                window.player.invulnerabilityTime = 60;
                
                // Knockback player
                const knockbackDir = window.player.x < this.x ? -1 : 1;
                window.player.speedX = knockbackDir * 8;
                window.player.speedY = -5;
            }
        }
    }
}

// Export
window.EnemyFlyer = EnemyFlyer;
