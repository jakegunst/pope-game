// enemy-walker.js - Ground-based enemy that walks and patrols

class EnemyWalker extends EnemyBase {
    constructor(x, y, config = {}) {
        // Set walker-specific defaults
        const walkerConfig = {
            ...config,
            speed: config.speed || 1,
            health: config.health || 1,
            damage: config.damage || 25,  // CHANGED: Default 25% damage for normal walkers
            useGravity: true,
            turnAtEdges: config.turnAtEdges !== false
        };
        
        // Variant-specific adjustments
        if (config.variant === 'strong') {
            walkerConfig.health = 3;
            walkerConfig.damage = 50;  // CHANGED: 50% damage for strong walkers
            walkerConfig.speed = 0.5;  // Slower but tankier
        } else if (config.variant === 'fast') {
            walkerConfig.speed = 2;
            walkerConfig.damage = 50;  // CHANGED: 50% damage for fast walkers
            walkerConfig.health = 1;
        }
        
        super(x, y, walkerConfig);
        
        // Walker-specific properties
        this.jumpPower = -8;
        this.canJump = true;
        this.edgeDetectionDistance = 16;
    }
    
    /**
     * Load walker sprite based on variant
     */
    loadSprite() {
        this.sprite = new Image();
        
        switch(this.variant) {
            case 'strong':
                this.sprite.src = 'assets/images/enemies/walker-strong.png';
                break;
            case 'fast':
                this.sprite.src = 'assets/images/enemies/walker-fast.png';
                break;
            default:
                this.sprite.src = 'assets/images/enemies/walker-normal.png';
        }
        
        this.sprite.onload = () => {
            this.spriteLoaded = true;
            console.log(`Walker sprite loaded: ${this.variant}`);
        };
    }
    
    /**
     * Update walker-specific behavior
     */
    update() {
        super.update();
        
        if (!this.isAlive) return;
        
        // Check for edges if enabled
        if (this.turnAtEdges && this.isGrounded && this.turnCooldown === 0) {
            if (this.checkForEdge()) {
                this.turn();
            }
        }
        
        // Check for walls
        if (this.checkForWall()) {
            this.turn();
        }
        
        // Random jump chance when chasing
        if (this.state === 'chasing' && this.isGrounded && Math.random() < 0.01) {
            this.jump();
        }
    }
    
    /**
     * Check if there's an edge ahead
     */
    checkForEdge() {
        if (!window.collisionDetection || !window.gameEngine) return false;
        
        // Check point ahead of walker
        const checkX = this.x + (this.direction > 0 ? 
            this.width + this.edgeDetectionDistance : 
            -this.edgeDetectionDistance);
        const checkY = this.y + this.height + 10;
        
        // See if there's ground below the check point
        const hasGround = window.collisionDetection.checkPoint(
            checkX, 
            checkY, 
            window.gameEngine.currentLevel.platforms
        );
        
        return !hasGround;
    }
    
    /**
     * Check if there's a wall ahead
     */
    checkForWall() {
        if (!window.collisionDetection || !window.gameEngine) return false;
        
        // Create a probe rectangle ahead of the walker
        const probe = {
            x: this.x + (this.direction > 0 ? this.width : -5),
            y: this.y + this.height/2,
            width: 5,
            height: 5
        };
        
        // Check collision with platforms
        const platforms = window.gameEngine.currentLevel.platforms;
        for (let platform of platforms) {
            if (window.collisionDetection.checkRectCollision(probe, platform)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Make the walker jump
     */
    jump() {
        if (!this.isGrounded || !this.canJump) return;
        
        this.speedY = this.jumpPower;
        this.isGrounded = false;
        this.canJump = false;
        
        // Reset jump ability after a delay
        setTimeout(() => {
            this.canJump = true;
        }, 500);
    }
}

// Export
window.EnemyWalker = EnemyWalker;
