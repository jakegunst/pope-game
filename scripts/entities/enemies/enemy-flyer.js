// enemy-flyer.js - Flying enemy that hovers and swoops

class EnemyFlyer extends EnemyBase {
    constructor(x, y, config = {}) {
        // Set flyer-specific defaults
        const flyerConfig = {
            ...config,
            speed: config.speed || 1.5,
            health: config.health || 1,
            damage: config.damage || 25,  // Default 25% damage for flyers
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
        
        // Flyers have faster animation
        this.animationSpeed = 0.2;  // Faster wing flapping
    }
    
    /**
     * Get sprite row for flyers
     * Row 3: Condor/flyer sprites
     */
    getSpriteRow() {
        return 3;  // Always use the bottom row for flyers
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
}

// Export
window.EnemyFlyer = EnemyFlyer;
