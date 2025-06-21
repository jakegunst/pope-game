// enemy-manager.js - Manages all enemies, spawning, collisions, and removal

class EnemyManager {
    constructor() {
        // All active enemies
        this.enemies = [];
        
        // Enemy types registry
        this.enemyTypes = {
            'walker': EnemyWalker,
            'flyer': EnemyFlyer,
            // More types will be added here
        };
        
        // Performance optimization
        this.maxEnemies = 50;  // Limit for performance
        
        // Combat tracking
        this.totalEnemiesSpawned = 0;
        this.totalEnemiesDefeated = 0;
        
        // Projectile system (for enemies that shoot)
        this.enemyProjectiles = [];
    }
    
    /**
     * Spawn collectibles when enemy dies
     */
    spawnEnemyDrops(enemy) {
        // Skip if no collectibles manager
        if (!window.gameEngine || !window.gameEngine.collectiblesManager) return;
        
        // 75% chance for coins, 25% for health
        const dropRoll = Math.random();
        
        if (dropRoll < 0.75) {
            // Drop coins
            const coinCount = (enemy.type === 'walker' || enemy.type === 'flyer') ? 1 : 2;
            
            for (let i = 0; i < coinCount; i++) {
                // Spread coins out a bit if dropping multiple
                const offsetX = coinCount > 1 ? (i - 0.5) * 20 : 0;
                
                window.gameEngine.collectiblesManager.spawnCollectible(
                    'tithe',
                    enemy.x + enemy.width/2 + offsetX - 8,
                    enemy.y + enemy.height/2 - 8
                );
            }
        } else {
            // Drop health (beer)
            window.gameEngine.collectiblesManager.spawnCollectible(
                'beer',
                enemy.x + enemy.width/2 - 10,
                enemy.y + enemy.height/2 - 12
            );
        }
    }
    
    /**
     * Initialize enemy manager with level data
     */
    init(levelData) {
        this.enemies = [];
        this.enemyProjectiles = [];
        
        console.log('Enemy manager init with level:', levelData);
        console.log('Level has platforms:', levelData?.platforms?.length || 0);
        
        // Spawn enemies from level data
        if (levelData.enemies) {
            levelData.enemies.forEach(enemyData => {
                this.spawnEnemy(
                    enemyData.type,
                    enemyData.x,
                    enemyData.y,
                    enemyData.config || {}
                );
            });
            console.log('Spawned enemies:', this.enemies.length);
        }
    }
    
    /**
     * Spawn a new enemy
     */
    spawnEnemy(type, x, y, config = {}) {
        if (this.enemies.length >= this.maxEnemies) {
            console.warn('Max enemies reached!');
            return null;
        }
        
        const EnemyClass = this.enemyTypes[type];
        if (!EnemyClass) {
            console.error(`Unknown enemy type: ${type}`);
            return null;
        }
        
        const enemy = new EnemyClass(x, y, config);
        this.enemies.push(enemy);
        this.totalEnemiesSpawned++;
        
        return enemy;
    }
    
    /**
     * Update all enemies
     */
    update() {
        // Update all enemies FIRST
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Update enemy (physics and AI)
            enemy.update();
            
            // Remove enemies that fall off the bottom
            if (window.gameEngine && window.gameEngine.currentLevel) {
                if (enemy.y > window.gameEngine.currentLevel.pixelHeight + 100) {
                    enemy.shouldRemove = true;
                }
            }
            
            // Check edge detection for walkers
            if (enemy.needsEdgeCheck) {
                const hasGround = this.checkGroundAhead(
                    enemy.needsEdgeCheck.x,
                    enemy.needsEdgeCheck.y
                );
                
                if (!hasGround) {
                    enemy.onPlatformEdge();
                }
                enemy.needsEdgeCheck = null;
            }
            
            // Mark dead enemies for removal
            if (!enemy.isAlive) {
                enemy.shouldRemove = true;
            }
            
            // Remove if marked for removal
            if (enemy.shouldRemove) {
                // Spawn collectibles when enemy dies
                this.spawnEnemyDrops(enemy);
                
                this.enemies.splice(i, 1);
                this.totalEnemiesDefeated++;
            }
        }
        
        // THEN check collisions (after physics have moved enemies)
        this.checkCollisions();
        
        // Update enemy projectiles
        this.updateProjectiles();
    }

    /**
     * Get platforms from the correct location
     * FIXED: Platforms are in levelLoader.currentLevel, not gameEngine.currentLevel
     */
    getPlatforms() {
        // Try multiple locations where platforms might be stored
        if (window.gameEngine?.levelLoader?.currentLevel?.platforms) {
            return window.gameEngine.levelLoader.currentLevel.platforms;
        }
        
        if (window.gameEngine?.currentLevel?.platforms) {
            return window.gameEngine.currentLevel.platforms;
        }
        
        // Fallback to empty array
        console.warn('Could not find platforms!');
        return [];
    }

    /**
     * Check all collisions
     */
    checkCollisions() {
        const player = window.player;
        const collisionDetection = window.collisionDetection;
        
        if (!player || !collisionDetection) return;
        
        // Safety check - wait for game engine
        if (!window.gameEngine) {
            console.log('Waiting for gameEngine to be available...');
            return;
        }
        
        // FIXED: Get platforms from the correct location
        const platforms = this.getPlatforms();
        
        // Debug: Log platform count once
        if (!this.platformsLogged && platforms.length > 0) {
            console.log('=== ENEMY COLLISION FIX ===');
            console.log('Found', platforms.length, 'platforms for enemy collision');
            console.log('First platform:', platforms[0]);
            this.platformsLogged = true;
        }
        
        this.enemies.forEach(enemy => {
            // Skip dead enemies
            if (enemy.isDead) return;
            
            // Enemy-platform collisions
            if (enemy.collideWithPlatforms) {
                // Reset grounded state for gravity-affected enemies
                if (enemy.affectedByGravity) {
                    enemy.isGrounded = false;
                }
                
                platforms.forEach(platform => {
                    const collision = collisionDetection.checkRectCollision(enemy, platform);
                    if (collision) {
                        enemy.onCollisionWithPlatform(platform, collision);
                    }
                });
            }
            
            // Enemy-player collision
            const playerCollision = collisionDetection.checkRectCollision(enemy, player);
            if (playerCollision) {
                this.handleEnemyPlayerCollision(enemy, player, playerCollision);
            }
        });
        
        // Check projectile collisions
        this.checkProjectileCollisions();
    }
    
    /**
     * Handle collision between enemy and player
     * FIXED: More generous stomping detection
     */
    handleEnemyPlayerCollision(enemy, player, collision) {
        // Get collision bounds
        const playerBottom = player.y + player.height;
        const enemyTop = enemy.y;
        const playerCenterX = player.x + player.width / 2;
        const enemyCenterX = enemy.x + enemy.width / 2;
        
        // FIXED: Even more generous stomping detection
        // Check if player is stomping (falling onto enemy from above)
        const isAboveEnemy = playerBottom <= enemyTop + 30; // Very generous vertical check
        const isAligned = Math.abs(playerCenterX - enemyCenterX) < (enemy.width + 10); // Width + 10px tolerance
        const isFalling = player.speedY >= -2; // Can stomp even if slightly moving up
        const canBeStopped = enemy.vulnerabilities && enemy.vulnerabilities.includes('stomp');
        
        if (isFalling && isAboveEnemy && isAligned && canBeStopped) {
            console.log('STOMP SUCCESS! Player speedY:', player.speedY);
            
            // Player stomps enemy
            enemy.takeDamage(1, 'stomp');
            
            // Bounce player up (much higher bounce for better game feel)
            player.speedY = -18;
            
            // Add score
            if (window.gameEngine) {
                window.gameEngine.playerStats.score += 100;
            }
            
            // Add a small invulnerability window to prevent double-hits
            player.invulnerable = true;
            player.invulnerabilityTime = 10; // Brief invulnerability
            
        } else if (!player.invulnerable) {
            console.log('Enemy damages player! Not a stomp because:');
            console.log('- isFalling:', isFalling, 'isAboveEnemy:', isAboveEnemy, 'isAligned:', isAligned);
            
            // Enemy hurts player
            this.damagePlayer(enemy.damage);
            
            // Knockback player away from enemy
            const knockbackDirection = playerCenterX < enemyCenterX ? -1 : 1;
            player.speedX = knockbackDirection * 7; // Stronger knockback
            player.speedY = -8; // Pop player up
        }
    }
    
    /**
     * Damage the player
     */
    damagePlayer(damage) {
        if (!window.gameEngine) return;
        
        const stats = window.gameEngine.playerStats;
        stats.health -= damage;
        
        // Make player invulnerable briefly
        window.player.invulnerable = true;
        window.player.invulnerabilityTime = 60;  // 1 second
        
        if (stats.health <= 0) {
            window.gameEngine.playerDeath();
        }
    }
    
    /**
     * Check if there's ground at a position
     * FIXED: Use the correct platform source
     */
    checkGroundAhead(x, y) {
        const platforms = this.getPlatforms();
        
        // Check if any platform is below this point
        for (let platform of platforms) {
            // Check if the point is above the platform and within its horizontal bounds
            if (x >= platform.x && 
                x <= platform.x + platform.width &&
                y <= platform.y && 
                y >= platform.y - 50) {  // Check up to 50 pixels below
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Handle player shooting at enemies
     */
    checkPlayerProjectile(projectile) {
        for (let enemy of this.enemies) {
            if (enemy.isDead) continue;
            
            const collision = window.collisionDetection.checkRectCollision(projectile, enemy);
            if (collision) {
                const damaged = enemy.takeDamage(1, 'projectile');
                if (damaged) {
                    // Add score
                    if (window.gameEngine) {
                        window.gameEngine.playerStats.score += 50;
                    }
                    return true;  // Projectile hit
                }
            }
        }
        
        return false;  // No hit
    }
    
    /**
     * Update enemy projectiles
     */
    updateProjectiles() {
        // Update and remove projectiles that go off screen
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const proj = this.enemyProjectiles[i];
            
            proj.x += proj.speedX;
            proj.y += proj.speedY;
            
            // Remove if off screen
            if (proj.x < -100 || proj.x > 2000 || proj.y < -100 || proj.y > 1000) {
                this.enemyProjectiles.splice(i, 1);
            }
        }
    }
    
    /**
     * Check projectile collisions
     */
    checkProjectileCollisions() {
        const player = window.player;
        if (!player || player.invulnerable) return;
        
        // Check enemy projectiles hitting player
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const proj = this.enemyProjectiles[i];
            
            const collision = window.collisionDetection.checkRectCollision(proj, player);
            if (collision) {
                this.damagePlayer(proj.damage || 10);
                this.enemyProjectiles.splice(i, 1);
            }
        }
    }
    
    /**
     * Add enemy projectile
     */
    addProjectile(x, y, speedX, speedY, damage = 10) {
        this.enemyProjectiles.push({
            x: x,
            y: y,
            width: 8,
            height: 8,
            speedX: speedX,
            speedY: speedY,
            damage: damage
        });
    }
    
    /**
     * Get all active enemies (for rendering)
     */
    getActiveEnemies() {
        return this.enemies;
    }
    
    /**
     * Get enemies in a specific area (for optimization)
     */
    getEnemiesInArea(x, y, width, height) {
        return this.enemies.filter(enemy => {
            return enemy.x < x + width &&
                   enemy.x + enemy.width > x &&
                   enemy.y < y + height &&
                   enemy.y + enemy.height > y;
        });
    }
    
    /**
     * Draw all enemies
     */
    draw(ctx) {
        // Draw enemies
        this.enemies.forEach(enemy => {
            enemy.draw(ctx);
        });
        
        // Draw enemy projectiles
        ctx.fillStyle = 'red';
        this.enemyProjectiles.forEach(proj => {
            ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
        });
    }
    
    /**
     * Clear all enemies (for level transitions)
     */
    clear() {
        this.enemies = [];
        this.enemyProjectiles = [];
    }
}

// Export the EnemyManager class
window.EnemyManager = EnemyManager;
