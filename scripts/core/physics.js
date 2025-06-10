// physics.js - Handles all physics calculations for the game

class Physics {
    constructor() {
        // Gravity settings
        this.gravity = 0.7;  // Increased from 0.5 for less floaty feeling
        this.terminalVelocity = 15;  // Maximum fall speed
        
        // Movement settings (moved here from player for easy tweaking)
        this.playerMaxSpeed = 7;  // Increased from 5 for faster movement
        this.playerAcceleration = 0.8;  // Increased from 0.5 for snappier control
        this.playerFriction = 0.35;  // Increased from 0.2 for less sliding
        this.playerJumpPower = -15;  // Increased from -10 (50% higher jump)
        
        // Wall physics
        this.wallSlideSpeed = 2;  // Maximum speed when sliding down wall
        this.wallFriction = 0.85;  // Slows vertical movement against walls
        
        // Special physics zones (for future use)
        this.waterGravity = 0.2;  // Slower gravity in water
        this.waterTerminalVelocity = 5;  // Slower max fall in water
        this.lowGravityMultiplier = 0.3;  // For low gravity areas
        
        // Wind/conveyor settings
        this.maxWindForce = 3;  // Maximum wind push strength
        
        // Platform edge detection
        this.edgeBalanceThreshold = 0.7;  // 70% of player width must be on platform
        this.teeterZone = 8;  // Pixels from edge to start teetering
    }
    
    /**
     * Apply gravity to an entity
     * @param {Object} entity - Object with speedY property
     * @param {number} multiplier - Optional gravity multiplier for special zones
     */
    applyGravity(entity, multiplier = 1) {
        // Apply gravity with multiplier
        entity.speedY += this.gravity * multiplier;
        
        // Limit to terminal velocity
        if (entity.speedY > this.terminalVelocity * multiplier) {
            entity.speedY = this.terminalVelocity * multiplier;
        }
    }
    
    /**
     * Check if entity is on platform edge
     * @param {Object} entity - Object with x, width properties
     * @param {Object} platform - Platform object with x, width properties
     * @returns {string} 'stable', 'leftEdge', 'rightEdge', or 'falling'
     */
    checkEdgeBalance(entity, platform) {
        const entityCenter = entity.x + entity.width / 2;
        const platformLeft = platform.x;
        const platformRight = platform.x + platform.width;
        
        // Check if center is over platform
        if (entityCenter < platformLeft || entityCenter > platformRight) {
            return 'falling';
        }
        
        // Check for edge teetering
        if (entity.x < platformLeft + this.teeterZone) {
            return 'leftEdge';
        } else if (entity.x + entity.width > platformRight - this.teeterZone) {
            return 'rightEdge';
        }
        
        return 'stable';
    }
    
    /**
     * Apply wall slide physics
     * @param {Object} entity - Entity touching wall
     * @param {boolean} touchingWall - Is entity against a wall
     */
    applyWallSlide(entity, touchingWall) {
        if (touchingWall && entity.speedY > 0) {  // Only when falling
            entity.speedY *= this.wallFriction;
            
            // Cap wall slide speed
            if (entity.speedY > this.wallSlideSpeed) {
                entity.speedY = this.wallSlideSpeed;
            }
        }
    }
    
    /**
     * Apply movement physics with acceleration and friction
     * @param {Object} entity - Entity to move
     * @param {number} inputDirection - -1 for left, 0 for none, 1 for right
     */
    applyMovement(entity, inputDirection) {
        if (inputDirection !== 0) {
            // Accelerate in input direction
            entity.speedX += inputDirection * this.playerAcceleration;
        } else {
            // Apply friction when not moving
            if (Math.abs(entity.speedX) > 0.1) {
                entity.speedX *= (1 - this.playerFriction);
            } else {
                entity.speedX = 0;
            }
        }
        
        // Limit to max speed
        entity.speedX = Math.max(-this.playerMaxSpeed, Math.min(this.playerMaxSpeed, entity.speedX));
    }
    
    /**
     * Handle slope physics (for future use)
     * @param {Object} entity - Entity on slope
     * @param {number} slopeAngle - Angle of slope in degrees
     * @param {boolean} isIcy - Whether slope is icy
     */
    applySlopePhysics(entity, slopeAngle, isIcy = false) {
        const slopeRadians = slopeAngle * Math.PI / 180;
        const slopeFactor = Math.sin(slopeRadians);
        
        // Apply slope sliding
        if (isIcy) {
            entity.speedX += slopeFactor * 0.5;  // Icy slopes are slippery!
        } else {
            entity.speedX += slopeFactor * 0.2;  // Normal slope sliding
        }
        
        // Slow upward movement on slopes
        if ((entity.speedX > 0 && slopeFactor > 0) || (entity.speedX < 0 && slopeFactor < 0)) {
            entity.speedX *= 0.8;  // 20% slower going uphill
        }
    }
    
    /**
     * Apply environmental forces like wind or conveyors
     * @param {Object} entity - Entity to push
     * @param {number} forceX - Horizontal force
     * @param {number} forceY - Vertical force (updrafts/downdrafts)
     */
    applyEnvironmentalForce(entity, forceX, forceY = 0) {
        entity.speedX += forceX;
        entity.speedY += forceY;
        
        // Still respect terminal velocity
        if (entity.speedY > this.terminalVelocity) {
            entity.speedY = this.terminalVelocity;
        }
    }
}

// Export the Physics class
window.Physics = Physics;
