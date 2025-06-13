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
        
        // Dropped items
        this.droppedItems = [];
    }
    
    /**
     * Initialize enemy manager with level data
     */
    init(levelData) {
        this.enemies = [];
        this.enemyProjectiles = [];
        this.droppedItems = [];
        
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
            
            // Remove if marked for removal
            if (enemy.shouldRemove) {
                // Spawn dropped items
                if (enemy.drops && enemy.drops.length > 0) {
                    const items = enemy.dropLoot();
                    this.droppedItems.push(...items);
                }
                
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
     * Check all collisions
     */
    checkCollisions() {
        const player = window.player;
        const collisionDetection = window.collisionDetection;
        
        if (!player || !collisionDetection) return;
        
        // In the checkCollisions() method, add this debug code right after getting platforms:

        // Get platforms from game engine
        const platforms = window.gameEngine?.currentLevel?.platforms || [];
        
        // Debug: Log platform count once
        if (!this.platformsLogged) {
            console.log('=== ENEMY COLLISION DEBUG ===');
            console.log('Number of platforms available:', platforms.length);
            console.log('Number of enemies:', this.enemies.length);
            console.log('First platform:', platforms[0]);
            console.log('First enemy:', this.enemies[0]);
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
     */
    handleEnemyPlayerCollision(enemy, player, collision) {
        // Check if player is stomping (falling onto enemy from above)
        if (collision.fromTop && player.speedY > 0 && enemy.vulnerabilities.includes('stomp')) {
            // Player stomps enemy
            enemy.takeDamage(1, 'stomp');
            
            // Bounce player up
            player.speedY = -10;
            
            // Add score
            if (window.gameEngine) {
                window.gameEngine.playerStats.score += 100;
            }
        } else if (!player.invulnerable) {
            // Enemy hurts player
            this.damagePlayer(enemy.damage);
            
            // Knockback player
            const knockbackX = collision.fromLeft ? -5 : 5;
            player.speedX = knockbackX;
            player.speedY = -5;
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
     */
    checkGroundAhead(x, y) {
        const platforms = window.gameEngine?.currentLevel?.platforms || [];
        
        // Check if any platform is below this point
        for (let platform of platforms) {
            if (x >= platform.x && x <= platform.x + platform.width &&
                y >= platform.y && y <= platform.y + 10) {  // Small buffer
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
        if (!player) return;
        
        // Check enemy projectiles hitting player
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const proj = this.enemyProjectiles[i];
            
            const collision = window.collisionDetection.checkRectCollision(proj, player);
            if (collision && !player.invulnerable) {
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
        
        // Draw dropped items (temporary visualization)
        this.droppedItems.forEach(item => {
            ctx.fillStyle = item.type === 'coin' ? 'gold' : 'lime';
            ctx.fillRect(item.x - 8, item.y - 8, 16, 16);
        });
    }
    
    /**
     * Clear all enemies (for level transitions)
     */
    clear() {
        this.enemies = [];
        this.enemyProjectiles = [];
        this.droppedItems = [];
    }
}

// Export the EnemyManager class
window.EnemyManager = EnemyManager;
