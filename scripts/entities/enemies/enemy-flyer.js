// enemy-flyer.js - Flying enemy with various movement patterns

class EnemyFlyer extends EnemyBase {
    constructor(x, y, config = {}) {
        // Set flyer defaults
        const flyerConfig = {
            width: 32,
            height: 24,
            speed: 2.5,  // Faster than walkers!
            health: 1,
            damage: 10,
            color: '#9370DB',  // Medium purple
            affectedByGravity: false,  // Flyers ignore gravity
            collideWithPlatforms: false,  // Can fly through platforms
            vulnerabilities: ['projectile', 'stomp'],  // CAN be stomped at low points!
            drops: [
                { type: 'coin', chance: 0.3 },
                { type: 'powerup', chance: 0.05 }
            ],
            ...config
        };
        
        super(x, y, flyerConfig);
        
        // Set enemy type for drop system
        this.type = 'flyer';
        
        // Flying patterns
        this.flyPattern = config.flyPattern || 'sine';  // 'sine', 'circle', 'hover', 'dive'
        this.baseY = y;  // Remember starting Y position
        this.baseX = x;  // For circular pattern
        
        // Direction for movement
        this.direction = config.direction || 1;  // 1 = right, -1 = left
        
        // Pattern parameters - BIGGER WAVES AND FASTER!
        this.amplitude = config.amplitude || 120;  // Much bigger wave height
        this.frequency = config.frequency || 0.04;  // Faster sine wave
        this.patternTimer = 0;
        
        // Dive attack properties
        this.diveSpeed = 10;  // Fast diving!
        this.isDiving = false;
        this.diveRecoveryTime = 60;
        this.diveTimer = 0;
        this.diveTarget = { x: 0, y: 0 };
        
        // Hover properties
        this.hoverRange = config.hoverRange || 150;
        this.hoverHeight = config.hoverHeight || 100;
    }
    
    /**
     * Update AI behavior
     */
    updateAI() {
        this.patternTimer++;
        
        switch(this.flyPattern) {
            case 'sine':
                this.sineWavePattern();
                break;
            case 'circle':
                this.circularPattern();
                break;
            case 'hover':
                this.hoverPattern();
                break;
            case 'dive':
                this.divePattern();
                break;
            default:
                this.sineWavePattern();
        }
    }
    
    /**
     * Sine wave movement pattern - IMPROVED!
     */
    sineWavePattern() {
        // Horizontal movement - ALWAYS MOVING!
        this.x += this.baseSpeed * this.direction;
        
        // Vertical sine wave - now goes low enough to be stomped!
        const waveOffset = Math.sin(this.patternTimer * this.frequency) * this.amplitude;
        this.y = this.baseY + waveOffset;
        
        // Make sure flyer comes down low enough to be reachable
        // At the bottom of the wave, should be about jump height above ground
        const lowestPoint = this.baseY + this.amplitude;
        const groundLevel = 576; // Approximate ground level
        
        // If configured to be stompable, ensure it comes within reach
        if (this.vulnerabilities.includes('stomp')) {
            // Ensure the lowest point is reachable (about 100 pixels above ground)
            const desiredLowestPoint = groundLevel - 100;
            if (lowestPoint < desiredLowestPoint) {
                // Adjust base Y to make it reachable
                this.baseY = desiredLowestPoint - this.amplitude;
            }
        }
        
        // Turn around at screen edges or patrol distance
        if (this.patrolDistance > 0) {
            const distanceFromStart = Math.abs(this.x - this.baseX);
            if (distanceFromStart >= this.patrolDistance) {
                this.direction *= -1;
                this.baseX = this.x; // Reset base to prevent getting stuck
            }
        } else {
            // If no patrol distance, turn at screen edges
            if (this.x <= 0 || this.x >= 1600) {
                this.direction *= -1;
            }
        }
    }
    
    /**
     * Circular movement pattern
     */
    circularPattern() {
        const radius = this.amplitude;
        const angle = this.patternTimer * this.frequency;
        
        // Calculate position on circle
        this.x = this.baseX + Math.cos(angle) * radius;
        this.y = this.baseY + Math.sin(angle) * radius;
        
        // No speed needed, we're setting position directly
        this.speedX = 0;
        this.speedY = 0;
    }
    
    /**
     * Hover near player and occasionally dive
     */
    hoverPattern() {
        const player = window.player;
        if (!player) return;
        
        if (this.canSeePlayer(player)) {
            // Hover above player
            const targetX = player.x;
            const targetY = player.y - this.hoverHeight;
            
            // Smooth movement towards hover position
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            
            this.speedX = dx * 0.02;  // Smooth following
            this.speedY = dy * 0.02;
            
            // Limit speed
            const maxHoverSpeed = 2;
            this.speedX = Math.max(-maxHoverSpeed, Math.min(maxHoverSpeed, this.speedX));
            this.speedY = Math.max(-maxHoverSpeed, Math.min(maxHoverSpeed, this.speedY));
            
            // Update position
            this.x += this.speedX;
            this.y += this.speedY;
        } else {
            // Return to base position
            this.speedX *= 0.95;
            this.speedY *= 0.95;
            this.x += this.speedX;
            this.y += this.speedY;
        }
    }
    
    /**
     * Dive bomb attack pattern
     */
    divePattern() {
        const player = window.player;
        if (!player) return;
        
        if (this.isDiving) {
            // Continue dive
            const dx = this.diveTarget.x - this.x;
            const dy = this.diveTarget.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 10) {
                // Keep diving
                this.speedX = (dx / dist) * this.diveSpeed;
                this.speedY = (dy / dist) * this.diveSpeed;
                this.x += this.speedX;
                this.y += this.speedY;
            } else {
                // End dive
                this.isDiving = false;
                this.diveTimer = this.diveRecoveryTime;
            }
        } else {
            // Normal flying
            this.sineWavePattern();
            
            // Check if we should dive
            if (this.diveTimer > 0) {
                this.diveTimer--;
            } else if (this.canSeePlayer(player)) {
                const dirToPlayer = this.getDirectionToPlayer(player);
                
                // Dive if player is below us
                if (dirToPlayer.y > 50 && Math.abs(dirToPlayer.x) < 100) {
                    this.startDive(player);
                }
            }
        }
    }
    
    /**
     * Start a dive attack
     */
    startDive(player) {
        this.isDiving = true;
        this.diveTarget = {
            x: player.x + player.width / 2,
            y: player.y + player.height / 2
        };
        
        // Already vulnerable to stomp during normal flight
    }
    
    /**
     * Override collision handling
     */
    onCollisionWithPlatform(platform, collision) {
        // Most flyers ignore platforms
        if (this.collideWithPlatforms) {
            super.onCollisionWithPlatform(platform, collision);
        }
        
        // But diving flyers stop when hitting ground
        if (this.isDiving && collision.fromTop) {
            this.isDiving = false;
            this.diveTimer = this.diveRecoveryTime;
            this.speedY = -5;  // Bounce up
        }
    }
    
    /**
     * Override draw to show dive state and better wings
     */
    draw(ctx) {
        // Draw wings BEHIND body
        if (!this.isDead) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            
            // Wing animation - flap faster
            const wingOffset = Math.sin(this.patternTimer * 0.3) * 8;
            
            // Left wing
            ctx.beginPath();
            ctx.moveTo(this.x + 5, this.y + this.height/2);
            ctx.lineTo(this.x - 12, this.y + this.height/2 + wingOffset);
            ctx.lineTo(this.x - 8, this.y + this.height/2 + wingOffset + 5);
            ctx.closePath();
            ctx.fillStyle = this.color;
            ctx.fill();
            
            // Right wing
            ctx.beginPath();
            ctx.moveTo(this.x + this.width - 5, this.y + this.height/2);
            ctx.lineTo(this.x + this.width + 12, this.y + this.height/2 - wingOffset);
            ctx.lineTo(this.x + this.width + 8, this.y + this.height/2 - wingOffset + 5);
            ctx.closePath();
            ctx.fill();
        }
        
        // Rotate if diving
        if (this.isDiving) {
            ctx.save();
            const angle = Math.atan2(this.speedY, this.speedX);
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.rotate(angle);
            ctx.translate(-this.width/2, -this.height/2);
            
            // Draw body
            ctx.fillStyle = 'red';  // Red when diving
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
            
            ctx.restore();
        } else {
            // Draw body normally
            super.draw(ctx);
        }
    }
}

// Export the EnemyFlyer class
window.EnemyFlyer = EnemyFlyer;
