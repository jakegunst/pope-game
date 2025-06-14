// collision-detection.js - Handles all collision detection and response

class CollisionDetection {
    constructor() {
        // Debug visualization
        this.showDebug = true;  // Always show collision boxes
        
        // Corner correction
        this.cornerThreshold = 2;  // Auto-climb if 2 pixels or less
        this.edgeGrabDistance = 4;  // Generous edge grabbing
        
        // Platform types that need special handling
        this.platformTypes = {
            // Standard platforms
            solid: { passThrough: false },
            oneway: { passThrough: true, oneWay: true },
            
            // Moving platforms (defined by naming convention)
            platform_r_slow: { speed: 1, dirX: 1, dirY: 0 },
            platform_r_fast: { speed: 3, dirX: 1, dirY: 0 },
            platform_l_slow: { speed: 1, dirX: -1, dirY: 0 },
            platform_l_fast: { speed: 3, dirX: -1, dirY: 0 },
            platform_u_slow: { speed: 1, dirX: 0, dirY: -1 },
            platform_u_fast: { speed: 3, dirX: 0, dirY: -1 },
            platform_d_slow: { speed: 1, dirX: 0, dirY: 1 },
            platform_d_fast: { speed: 3, dirX: 0, dirY: 1 },
            
            // Diagonal platforms
            platform_ur_slow: { speed: 1, dirX: 0.707, dirY: -0.707 },
            platform_ur_fast: { speed: 3, dirX: 0.707, dirY: -0.707 },
            platform_dr_slow: { speed: 1, dirX: 0.707, dirY: 0.707 },
            platform_dr_fast: { speed: 3, dirX: 0.707, dirY: 0.707 },
            platform_ul_slow: { speed: 1, dirX: -0.707, dirY: -0.707 },
            platform_ul_fast: { speed: 3, dirX: -0.707, dirY: -0.707 },
            platform_dl_slow: { speed: 1, dirX: -0.707, dirY: 0.707 },
            platform_dl_fast: { speed: 3, dirX: -0.707, dirY: 0.707 },
            
            // Special platforms
            platform_cw_circle: { circular: true, clockwise: true, speed: 1 },
            platform_ccw_circle: { circular: true, clockwise: false, speed: 1 },
            four_platform_cw_circle: { circularGroup: true, clockwise: true, count: 4 },
            four_platform_ccw_circle: { circularGroup: true, clockwise: false, count: 4 },
            
            platform_falling_timed: { falling: true, fallDelay: 30, resetDelay: 180 },
            platform_spin_clockwise: { spinning: true, spinSpeed: 0.02 },
            platform_spin_counterclockwise: { spinning: true, spinSpeed: -0.02 },
            
            // Balance platforms
            platform_balance: { balance: true, tiltSpeed: 0.02, maxTilt: 30 },
            platform_balance_little: { balance: true, tiltSpeed: 0.03, maxTilt: 45, width: 64 },
            platform_balance_big: { balance: true, tiltSpeed: 0.01, maxTilt: 20, width: 192 },
            
            // Bouncy platforms (MUCH BOUNCIER!)
            bouncy_platform: { bouncy: true, bouncePower: 1.5 },
            super_bouncy_platform: { bouncy: true, bouncePower: 2.0 },
            bouncy_platform_little: { bouncy: true, bouncePower: 1.5, width: 48 },
            super_bouncy_platform_little: { bouncy: true, bouncePower: 2.0, width: 48 },
            bouncy_platform_big: { bouncy: true, bouncePower: 1.5, width: 128 },
            super_bouncy_platform_big: { bouncy: true, bouncePower: 2.0, width: 128 }
        };
        
        // Collision layers
        this.layers = {
            player: 'all',  // Collides with everything
            enemy_flying: ['ground', 'player'],  // Ignores platforms
            enemy_ghost: ['ground', 'player'],  // Only ground and player
            powerup_floating: ['player'],  // Only player collision
            powerup_grounded: ['all']  // Normal collision
        };
        
        // Spatial partitioning for performance
        this.gridSize = 128;  // Divide world into 128x128 pixel chunks
        this.spatialGrid = new Map();
    }
    
    /**
     * Check if two rectangles are colliding
     * @returns {Object|null} Collision info or null
     */
    checkRectCollision(rect1, rect2) {
        // Basic AABB collision
        if (rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y) {
            
            // Calculate overlap for collision response
            const overlapX = Math.min(rect1.x + rect1.width - rect2.x, rect2.x + rect2.width - rect1.x);
            const overlapY = Math.min(rect1.y + rect1.height - rect2.y, rect2.y + rect2.height - rect1.y);
            
            return {
                hit: true,
                overlapX: overlapX,
                overlapY: overlapY,
                fromLeft: rect1.x < rect2.x,
                fromTop: rect1.y < rect2.y
            };
        }
        return null;
    }
    
    /**
     * Handle player-platform collision with all special types
     */
    handlePlatformCollision(player, platform, collision) {
        const platType = this.platformTypes[platform.type] || this.platformTypes.solid;
        
        // One-way platform - only collide from above
        if (platType.oneWay && player.speedY <= 0) {
            return false;
        }
        
        // Bouncy platform - SUPER BOUNCE!
        if (platType.bouncy && collision.fromTop && player.speedY > 0) {
            // Make it really bouncy - multiply current fall speed
            player.speedY = -Math.abs(player.speedY) * platType.bouncePower;
            // Cap the bounce to prevent going too high
            if (player.speedY < -35) player.speedY = -35;
            
            console.log('BOUNCE! Power:', platType.bouncePower, 'New speedY:', player.speedY);
            this.triggerCallback('bounce', { power: platType.bouncePower });
            return true;
        }
        
        // Standard collision resolution
        if (collision.overlapX < collision.overlapY) {
            // Horizontal collision
            if (collision.fromLeft) {
                player.x = platform.x - player.width;
            } else {
                player.x = platform.x + platform.width;
            }
            player.speedX = 0;
            
            // Wall slide check
            if (!player.isGrounded) {
                window.physics.applyWallSlide(player, true);
            }
        } else {
            // Vertical collision
            if (collision.fromTop) {
                player.y = platform.y - player.height;
                player.setGrounded(true);
                
                // Moving platform - inherit momentum
                if (platType.dirX !== undefined) {
                    player.x += platType.dirX * platType.speed;
                }
                
                // Trigger landing effects
                if (Math.abs(player.speedY) > 10) {
                    this.triggerCallback('hardLanding', { impact: player.speedY });
                } else {
                    this.triggerCallback('softLanding', {});
                }
            } else {
                player.y = platform.y + platform.height;
                player.speedY = 0;
            }
        }
        
        return true;
    }
    
    /**
     * Check for edge grab opportunities
     */
    checkEdgeGrab(player, platform) {
        // Player must be falling and near platform top
        if (player.speedY <= 0) return false;
        
        const playerBottom = player.y + player.height;
        const platformTop = platform.y;
        
        // Check if player is at edge grab height
        if (Math.abs(playerBottom - platformTop) > this.edgeGrabDistance) return false;
        
        // Check horizontal alignment for edge
        const playerCenter = player.x + player.width / 2;
        const platformLeft = platform.x;
        const platformRight = platform.x + platform.width;
        
        // Left edge grab
        if (Math.abs(player.x + player.width - platformLeft) < this.edgeGrabDistance) {
            return { edge: 'left', x: platformLeft - player.width };
        }
        
        // Right edge grab
        if (Math.abs(player.x - platformRight) < this.edgeGrabDistance) {
            return { edge: 'right', x: platformRight };
        }
        
        return false;
    }
    
    /**
     * Update spatial grid for performance
     */
    updateSpatialGrid(objects) {
        this.spatialGrid.clear();
        
        objects.forEach(obj => {
            const startX = Math.floor(obj.x / this.gridSize);
            const endX = Math.floor((obj.x + obj.width) / this.gridSize);
            const startY = Math.floor(obj.y / this.gridSize);
            const endY = Math.floor((obj.y + obj.height) / this.gridSize);
            
            for (let x = startX; x <= endX; x++) {
                for (let y = startY; y <= endY; y++) {
                    const key = `${x},${y}`;
                    if (!this.spatialGrid.has(key)) {
                        this.spatialGrid.set(key, []);
                    }
                    this.spatialGrid.get(key).push(obj);
                }
            }
        });
    }
    
    /**
     * Get nearby objects for collision checking
     */
    getNearbyObjects(obj) {
        const nearby = new Set();
        const startX = Math.floor((obj.x - this.gridSize) / this.gridSize);
        const endX = Math.floor((obj.x + obj.width + this.gridSize) / this.gridSize);
        const startY = Math.floor((obj.y - this.gridSize) / this.gridSize);
        const endY = Math.floor((obj.y + obj.height + this.gridSize) / this.gridSize);
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x},${y}`;
                const objects = this.spatialGrid.get(key) || [];
                objects.forEach(o => nearby.add(o));
            }
        }
        
        return Array.from(nearby);
    }
    
    /**
     * Handle slope collision
     */
    checkSlopeCollision(player, slope) {
        // Calculate if player is on slope
        const relativeX = player.x + player.width / 2 - slope.x;
        const slopeProgress = relativeX / slope.width;
        
        if (slopeProgress < 0 || slopeProgress > 1) return null;
        
        // Calculate Y position on slope
        const slopeY = slope.y + (slope.height * slopeProgress * Math.tan(slope.angle * Math.PI / 180));
        const playerBottom = player.y + player.height;
        
        if (Math.abs(playerBottom - slopeY) < 5) {
            return {
                onSlope: true,
                angle: slope.angle,
                slopeY: slopeY
            };
        }
        
        return null;
    }
    
    /**
     * Trigger collision callbacks
     */
    triggerCallback(type, data) {
        // This will be connected to sound/particle systems
        // For now, just log
        if (type === 'hardLanding') {
            console.log('Hard landing!', data.impact);
        } else if (type === 'bounce') {
            console.log('Bounce!', data.power);
        }
    }
    
    /**
     * Draw debug collision boxes
     */
    drawDebug(ctx, objects) {
        if (!this.showDebug) return;
        
        ctx.strokeStyle = 'lime';
        ctx.lineWidth = 1;
        
        objects.forEach(obj => {
            ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
            
            // Draw type label
            if (obj.type) {
                ctx.fillStyle = 'lime';
                ctx.font = '10px Arial';
                ctx.fillText(obj.type, obj.x + 2, obj.y - 2);
            }
        });
    }
}

// Export the CollisionDetection class
window.CollisionDetection = CollisionDetection;
