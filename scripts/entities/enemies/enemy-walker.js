// enemy-walker.js - Walking enemy that patrols platforms

class EnemyWalker extends EnemyBase {
    constructor(x, y, config = {}) {
        // Set defaults for walker
        config.useGravity = true;
        config.health = config.variant === 'strong' ? 2 : 1;
        config.speed = config.variant === 'fast' ? 2 : 1;
        
        super(x, y, config);
        
        // Walker specific properties
        this.jumpPower = -8;
        this.canJump = true;
        this.edgeDetectionDistance = 10;
        this.lastGroundY = y;
        this.platformCheckDistance = 5;
        this.vulnerabilities = ['stomp'];  // Walkers can be stomped
    }
    
    /**
     * Load the walker sprite based on variant
     */
    loadSprite() {
        this.sprite = new Image();
        
        // Choose sprite based on variant
        let spritePath = 'assets/images/enemies/';
        switch(this.variant) {
            case 'strong':
                spritePath += 'walker-strong.png';
                break;
            case 'fast':
                spritePath += 'walker-fast.png';
                break;
            default:
                spritePath += 'walker-normal.png';
                break;
        }
        
        this.sprite.src = spritePath;
        this.sprite.onload = () => {
            this.spriteLoaded = true;
            console.log(`Walker sprite loaded: ${this.variant}`);
        };
        
        // Walker sprites are 32x32 with 2 frames
        this.frameWidth = 32;
        this.frameHeight = 32;
        this.frameCount = 2;
    }
    
    /**
     * Update walker-specific behavior
     */
    update() {
        // Call parent update first
        super.update();
        
        if (!this.isAlive) return;
        
        // Check platform collisions
        this.checkPlatformCollisions();
        
        // Check for edges if grounded
        if (this.isGrounded && this.turnAtEdges) {
            this.checkForEdge();
        }
        
        // Check for walls
        this.checkForWall();
        
        // Update last ground position
        if (this.isGrounded) {
            this.lastGroundY = this.y;
        }
        
        // Check if fell too far
        if (this.y - this.lastGroundY > 300) {
            this.takeDamage(1, this.x);
        }
    }
    
    /**
     * Check collisions with all platforms
     */
    checkPlatformCollisions() {
        if (!window.gameEngine || !window.gameEngine.currentLevel) return;
        
        this.isGrounded = false;
        const platforms = window.gameEngine.currentLevel.platforms;
        
        for (const platform of platforms) {
            const collision = window.collisionDetection.checkRectCollision(this, platform);
            if (collision) {
                this.handlePlatformCollision(platform, collision);
            }
        }
    }
    
    /**
     * Handle collision with a platform
     */
    handlePlatformCollision(platform, collision) {
        const platType = window.collisionDetection.platformTypes[platform.type] || 
                        window.collisionDetection.platformTypes.solid;
        
        // One-way platforms - only collide from above
        if (platType.oneWay && this.speedY <= 0) {
            return;
        }
        
        // Determine collision side
        const fromTop = collision.overlapY < collision.overlapX && this.speedY > 0;
        const fromBottom = collision.overlapY < collision.overlapX && this.speedY < 0;
        const fromLeft = collision.overlapX < collision.overlapY && this.speedX > 0;
        const fromRight = collision.overlapX < collision.overlapY && this.speedX < 0;
        
        if (fromTop) {
            // Land on platform
            this.y = platform.y - this.height;
            this.speedY = 0;
            this.isGrounded = true;
            
            // Inherit platform movement
            if (platType.dirX !== undefined) {
                this.x += platType.dirX * platType.speed;
            }
        } else if (fromBottom) {
            // Hit ceiling
            this.y = platform.y + platform.height;
            this.speedY = 0;
        } else if (fromLeft || fromRight) {
            // Hit wall - turn around
            if (fromLeft) {
                this.x = platform.x - this.width;
            } else {
                this.x = platform.x + platform.width;
            }
            this.speedX = 0;
            
            // Turn around if hit a wall
            if (this.turnCooldown === 0) {
                this.turn();
            }
        }
    }
    
    /**
     * Check if approaching an edge
     */
    checkForEdge() {
        if (!window.gameEngine || !window.gameEngine.currentLevel) return;
        
        // Look ahead in movement direction
        const checkX = this.x + (this.direction > 0 ? 
            this.width + this.edgeDetectionDistance : 
            -this.edgeDetectionDistance);
        const checkY = this.y + this.height + 5;
        
        // Check if there's ground ahead
        let groundAhead = false;
        const platforms = window.gameEngine.currentLevel.platforms;
        
        for (const platform of platforms) {
            // Create a point to check
            if (checkX >= platform.x && 
                checkX <= platform.x + platform.width &&
                checkY >= platform.y && 
                checkY <= platform.y + platform.height) {
                groundAhead = true;
                break;
            }
        }
        
        // Turn around if no ground ahead
        if (!groundAhead && this.turnCooldown === 0) {
            this.turn();
        }
    }
    
    /**
     * Check for wall collision ahead
     */
    checkForWall() {
        if (!window.gameEngine || !window.gameEngine.currentLevel) return;
        
        const platforms = window.gameEngine.currentLevel.platforms;
        
        // Create a probe rectangle ahead of the walker
        const probe = {
            x: this.x + (this.direction > 0 ? this.width : -this.platformCheckDistance),
            y: this.y + this.height/4, // Check middle of body
            width: this.platformCheckDistance,
            height: this.height/2
        };
        
        for (const platform of platforms) {
            // Skip one-way platforms
            if (platform.type === 'oneway') continue;
            
            const collision = window.collisionDetection.checkRectCollision(probe, platform);
            
            if (collision) {
                // Hit a wall, turn around
                if (this.turnCooldown === 0) {
                    this.turn();
                }
                break;
            }
        }
    }
    
    /**
     * Override chase AI for walkers
     */
    chaseAI() {
        super.chaseAI();
        
        // Jump if player is above and we can jump
        if (this.state === 'chasing' && window.player) {
            const playerAbove = window.player.y < this.y - 50;
            const playerNear = Math.abs(window.player.x - this.x) < 100;
            
            if (playerAbove && playerNear && this.isGrounded && this.canJump) {
                this.jump();
            }
        }
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
        }, 1000);
    }
    
    /**
     * Override take damage to handle being stomped
     */
    takeDamage(amount, fromX) {
        super.takeDamage(amount, fromX);
        
        // Extra effects for being stomped
        if (this.health <= 0 && window.player && 
            Math.abs(window.player.x - this.x) < this.width) {
            // Add score for stomping
            if (window.gameEngine) {
                window.gameEngine.playerStats.score += 100;
            }
        }
    }
}

// Export
window.EnemyWalker = EnemyWalker;
