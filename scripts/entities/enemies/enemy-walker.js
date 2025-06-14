// enemy-walker.js - Basic walking enemy that patrols back and forth

class EnemyWalker extends EnemyBase {
    constructor(x, y, config = {}) {
        // Set walker defaults - FASTER for red enemies!
        const walkerConfig = {
            width: 32,
            height: 32,
            speed: config.variant === 'fast' ? 3 : 2.5, // Much faster!
            health: config.variant === 'strong' ? 3 : 1,
            damage: 10,
            color: config.variant === 'strong' ? '#FF0000' : '#8B4513',  // Red for strong variant
            vulnerabilities: ['projectile', 'stomp'],
            drops: [
                { type: 'coin', chance: 0.5 },
                { type: 'health', chance: 0.1 }
            ],
            ...config  // Override with any passed config
        };
        
        super(x, y, walkerConfig);
        
        console.log(`Walker spawned at ${x}, ${y}`);
        
        // Walker-specific properties
        this.walkSpeed = this.baseSpeed;
        this.direction = config.startDirection || 1;  // 1 = right, -1 = left
        this.turnAtEdges = config.turnAtEdges !== false;  // Turn at platform edges
        this.turnAtWalls = config.turnAtWalls !== false;  // Turn when hitting walls
        
        // Patrol settings
        this.patrolDistance = config.patrolDistance || 0;  // 0 = unlimited
        this.startX = x;
        
        // Chase behavior (if AI type is 'chase')
        this.chaseSpeed = this.walkSpeed * 1.5;
        this.isChasing = false;
        
        // Jump properties - MUCH HIGHER for better gameplay!
        this.jumpPower = config.variant === 'strong' ? -15 : -12; // Higher jumps!
        this.jumpCooldown = 0;
        this.maxJumpCooldown = 30; // Can jump every 0.5 seconds
        
        // Initialize movement
        this.speedX = this.walkSpeed * this.direction;
    }
    
    /**
     * Update AI behavior
     */
    updateAI() {
        // Update jump cooldown
        if (this.jumpCooldown > 0) {
            this.jumpCooldown--;
        }
        
        switch(this.aiType) {
            case 'pattern':
                this.patrolPattern();
                break;
            case 'chase':
                this.chasePattern();
                break;
            default:
                this.patrolPattern();
        }
    }
    
    /**
     * Basic patrol pattern
     */
    patrolPattern() {
        // Check if we need to turn around
        let shouldTurn = false;
        
        // Turn at patrol distance limits
        if (this.patrolDistance > 0) {
            const distanceFromStart = Math.abs(this.x - this.startX);
            if (distanceFromStart >= this.patrolDistance) {
                shouldTurn = true;
            }
        }
        
        // Check for edge detection (would fall off platform)
        if (this.turnAtEdges && this.isGrounded) {
            // Check if there's ground ahead
            const checkX = this.x + (this.direction > 0 ? this.width : -5);
            const checkY = this.y + this.height + 5;
            
            // This would need platform checking from enemy manager
            // For now, we'll set a flag that enemy manager can check
            this.needsEdgeCheck = {
                x: checkX,
                y: checkY
            };
        }
        
        // Random jump while patrolling (makes them more dynamic)
        if (this.isGrounded && this.jumpCooldown <= 0 && Math.random() < 0.01) {
            this.jump();
        }
        
        // Simple movement
        if (shouldTurn) {
            this.turn();
        }
        
        // Update speed
        this.speedX = this.walkSpeed * this.direction;
    }
    
    /**
     * Chase the player
     */
    chasePattern() {
        const player = window.player;  // Access global player
        
        if (!player) {
            this.patrolPattern();
            return;
        }
        
        // Check if player is in range
        if (this.canSeePlayer(player)) {
            this.isChasing = true;
            
            // Get direction to player
            const dirToPlayer = this.getDirectionToPlayer(player);
            
            // Chase horizontally
            if (Math.abs(dirToPlayer.x) > 10) {  // Dead zone to prevent jittering
                this.direction = dirToPlayer.x > 0 ? 1 : -1;
                this.speedX = this.chaseSpeed * this.direction;
            } else {
                this.speedX = 0;  // Stop when close
            }
            
            // Jump if player is above and we're grounded
            if (dirToPlayer.y < -32 && this.isGrounded && Math.abs(dirToPlayer.x) < 100) {
                this.jump();
            }
            
            // Also jump if there's an obstacle ahead
            if (this.isGrounded && this.jumpCooldown <= 0 && Math.abs(this.speedX) < 0.1) {
                this.jump(); // Jump when stuck
            }
        } else {
            // Lost player, return to patrol
            if (this.isChasing) {
                this.isChasing = false;
                this.speedX = this.walkSpeed * this.direction;
            }
            this.patrolPattern();
        }
    }
    
    /**
     * Make the enemy jump - HIGHER JUMPS!
     */
    jump() {
        if (this.isGrounded && this.jumpCooldown <= 0) {
            this.speedY = this.jumpPower;  // Use the higher jump power
            this.isGrounded = false;
            this.jumpCooldown = this.maxJumpCooldown;
        }
    }
    
    /**
     * Turn around
     */
    turn() {
        this.direction *= -1;
        this.speedX = this.walkSpeed * this.direction;
    }
    
    /**
     * Handle collision with walls
     */
    onCollisionWithPlatform(platform, collision) {
        super.onCollisionWithPlatform(platform, collision);
        
        // Turn around if we hit a wall
        if (this.turnAtWalls && !collision.fromTop) {
            this.turn();
        }
    }
    
    /**
     * Called when at platform edge (by enemy manager)
     */
    onPlatformEdge() {
        if (this.turnAtEdges) {
            this.turn();
        }
    }
    
    /**
     * Override draw to show chase state
     */
    draw(ctx) {
        super.draw(ctx);
        
        // Show exclamation mark when chasing
        if (this.isChasing && !this.isDead) {
            ctx.fillStyle = 'red';
            ctx.font = '16px Arial';
            ctx.fillText('!', this.x + this.width/2 - 4, this.y - 5);
        }
    }
}

// Export the EnemyWalker class
window.EnemyWalker = EnemyWalker;
