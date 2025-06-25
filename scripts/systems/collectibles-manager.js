// collectibles-manager.js - Manages all collectibles and power-ups

class CollectiblesManager {
    constructor() {
        // All active collectibles in the level
        this.collectibles = [];
        
        // Animation timers
        this.animationTimer = 0;
        
        // Collection tracking
        this.levelTithesTotal = 0;
        this.levelTithesCollected = 0;
        this.levelRelicsTotal = 0;
        this.levelRelicsCollected = 0;
        
        // Power-up tracking
        this.activePowerUps = {
            leaves: { active: false, timer: 0, duration: 600 }, // 10 seconds at 60fps
            breastplate: { active: false, timer: 0, duration: 600 }
        };
        
        // Load sprite sheet
        this.spriteSheet = new Image();
        this.spriteSheet.src = 'assets/images/tiles/collectibles-and-enemies.png';
        this.spriteSheet.onload = () => {
            console.log('Collectibles sprite sheet loaded');
        };
        
        // Sprite positions on the sheet (based on your image)
        // Each sprite is 32x32 pixels
        this.sprites = {
            leaf: { x: 0, y: 0, width: 32, height: 32 },      // Green leaf
            coin: { x: 32, y: 0, width: 32, height: 32 },     // Gold coin
            health: { x: 64, y: 0, width: 32, height: 32 },   // Heart/health
            relic: { x: 96, y: 0, width: 32, height: 32 }     // Brown relic
        };
        
        // Collectible types configuration
        this.collectibleTypes = {
            tithe: {
                width: 32,
                height: 32,
                value: 1,
                sprite: 'coin',
                animation: 'floatAndRotate',
                sound: 'coin',
                particleColor: '#FFD700'
            },
            beer: {
                width: 32,
                height: 32,
                value: 25, // 25% health
                sprite: 'health',
                animation: 'float',
                sound: 'gulp',
                particleColor: '#FF0000'
            },
            leaves: {
                width: 32,
                height: 32,
                value: 10, // Duration in seconds
                sprite: 'leaf',
                animation: 'sway',
                sound: 'powerup',
                particleColor: '#00FF00'
            },
            breastplate: {
                width: 28,
                height: 24,
                sprite: null, // Still uses drawn graphic
                animation: 'pulse',
                sound: 'armor',
                particleColor: '#FFFFFF'
            },
            relic: {
                width: 32,
                height: 32,
                value: 1,
                sprite: 'relic',
                animation: 'floatAndGlow',
                sound: 'holy',
                particleColor: '#FFD700'
            },
            popeBlood: {
                width: 16,
                height: 20,
                value: 1,
                sprite: null, // Still uses drawn graphic
                animation: 'pulse',
                sound: 'holy',
                particleColor: '#FF0000'
            },
            keysOfPeter: {
                width: 20,
                height: 32,
                value: 1,
                sprite: null, // Still uses drawn graphic
                animation: 'floatAndRotate',
                sound: 'key',
                particleColor: '#FFFF00'
            }
        };
        
        // Collection effects queue
        this.collectionEffects = [];
        
        // Sound pitch for escalation
        this.coinPitch = 1.0;
        this.lastCoinTime = 0;
    }
    
    /**
     * Initialize collectibles for a level
     */
    init(levelData) {
        this.collectibles = [];
        this.collectionEffects = [];
        this.animationTimer = 0;
        
        // Reset counters
        this.levelTithesTotal = 0;
        this.levelTithesCollected = 0;
        this.levelRelicsTotal = 0;
        this.levelRelicsCollected = 0;
        
        // Reset power-ups
        Object.keys(this.activePowerUps).forEach(key => {
            this.activePowerUps[key].active = false;
            this.activePowerUps[key].timer = 0;
        });
        
        // Spawn collectibles from level data
        if (levelData.collectibles) {
            levelData.collectibles.forEach(item => {
                this.spawnCollectible(item.type, item.x, item.y, item.properties);
                
                // Track totals
                if (item.type === 'tithe') this.levelTithesTotal++;
                if (item.type === 'relic') this.levelRelicsTotal++;
            });
        }
        
        console.log(`Collectibles initialized: ${this.levelTithesTotal} tithes, ${this.levelRelicsTotal} relics`);
    }
    
    /**
     * Spawn a collectible
     */
    spawnCollectible(type, x, y, properties = {}) {
        const config = this.collectibleTypes[type];
        if (!config) {
            console.error(`Unknown collectible type: ${type}`);
            return;
        }
        
        const collectible = {
            type: type,
            x: x,
            y: y,
            baseY: y, // For floating animation
            width: config.width,
            height: config.height,
            value: config.value,
            collected: false,
            animationOffset: Math.random() * Math.PI * 2, // Random start phase
            ...properties
        };
        
        this.collectibles.push(collectible);
        return collectible;
    }
    
    /**
     * Update all collectibles and power-ups
     */
    update() {
        this.animationTimer++;
        
        // Update collectible animations
        this.collectibles.forEach(item => {
            if (!item.collected) {
                this.updateAnimation(item);
            }
        });
        
        // Update active power-ups
        this.updatePowerUps();
        
        // Update collection effects
        this.updateEffects();
        
        // Check collisions with player
        this.checkPlayerCollection();
    }
    
    /**
     * Update collectible animation
     */
    updateAnimation(item) {
        const config = this.collectibleTypes[item.type];
        const time = this.animationTimer + item.animationOffset;
        
        switch (config.animation) {
            case 'floatAndRotate':
                // Gentle floating up and down
                item.y = item.baseY + Math.sin(time * 0.05) * 5;
                // Store rotation for rendering
                item.rotation = time * 0.02;
                break;
                
            case 'float':
                // Just float up and down
                item.y = item.baseY + Math.sin(time * 0.04) * 4;
                break;
                
            case 'sway':
                // Sway side to side like leaves
                item.x = item.x + Math.sin(time * 0.03) * 2;
                item.y = item.baseY + Math.sin(time * 0.06) * 3;
                break;
                
            case 'pulse':
                // Pulsing size effect (store scale for rendering)
                item.scale = 1 + Math.sin(time * 0.1) * 0.1;
                break;
                
            case 'floatAndGlow':
                // Float with glow effect
                item.y = item.baseY + Math.sin(time * 0.05) * 5;
                item.glow = 0.5 + Math.sin(time * 0.08) * 0.5;
                break;
        }
    }
    
    /**
     * Check if player collected any items
     */
    checkPlayerCollection() {
        const player = window.player;
        if (!player) return;
        
        this.collectibles.forEach(item => {
            if (item.collected) return;
            
            // Check collision with player
            if (player.x < item.x + item.width &&
                player.x + player.width > item.x &&
                player.y < item.y + item.height &&
                player.y + player.height > item.y) {
                
                this.collectItem(item);
            }
        });
    }
    
    /**
     * Handle item collection
     */
    collectItem(item) {
        item.collected = true;
        const config = this.collectibleTypes[item.type];
        
        // Handle different collectible types
        switch (item.type) {
            case 'tithe':
                this.levelTithesCollected++;
                if (window.gameEngine) {
                    window.gameEngine.playerStats.coins += item.value;
                    window.gameEngine.playerStats.score += item.value * 10;
                }
                // Sound pitch escalation
                this.updateCoinPitch();
                break;
                
            case 'beer':
                if (window.gameEngine) {
                    const stats = window.gameEngine.playerStats;
                    stats.health = Math.min(stats.maxHealth, stats.health + item.value);
                }
                break;
                
            case 'leaves':
                this.activatePowerUp('leaves');
                break;
                
            case 'breastplate':
                this.activatePowerUp('breastplate');
                break;
                
            case 'relic':
                this.levelRelicsCollected++;
                // Show toast notification
                this.showToast(`Relic Found! ${this.levelRelicsCollected}/${this.levelRelicsTotal}`);
                break;
                
            case 'popeBlood':
                if (window.gameEngine) {
                    window.gameEngine.playerStats.popeBlood++;
                }
                break;
                
            case 'keysOfPeter':
                // Will unlock bonus area
                this.showToast("Keys of Peter obtained!");
                break;
        }
        
        // Create collection effect
        this.createCollectionEffect(item.x + item.width/2, item.y + item.height/2, config.particleColor);
        
        // Play sound (placeholder for sound system)
        console.log(`Play sound: ${config.sound} at pitch ${this.coinPitch}`);
    }
    
    /**
     * Update coin pitch for escalation effect
     */
    updateCoinPitch() {
        const now = Date.now();
        if (now - this.lastCoinTime < 500) { // Within 500ms
            this.coinPitch = Math.min(2.0, this.coinPitch + 0.1);
        } else {
            this.coinPitch = 1.0;
        }
        this.lastCoinTime = now;
    }
    
    /**
     * Activate a power-up
     */
    activatePowerUp(type) {
        const powerUp = this.activePowerUps[type];
        if (!powerUp) return;
        
        powerUp.active = true;
        powerUp.timer = powerUp.duration;
        
        // Apply effects
        switch (type) {
            case 'leaves':
                // Increase speed and jump
                if (window.player) {
                    window.player.maxSpeed *= 1.5;
                    window.player.jumpPower *= 1.3;
                }
                this.showToast("Speed and Jump Boost!");
                break;
                
            case 'breastplate':
                // Make player invulnerable
                if (window.player) {
                    window.player.invulnerable = true;
                }
                this.showToast("Breastplate of Righteousness!");
                break;
        }
    }
    
    /**
     * Update active power-ups
     */
    updatePowerUps() {
        Object.keys(this.activePowerUps).forEach(key => {
            const powerUp = this.activePowerUps[key];
            
            if (powerUp.active) {
                powerUp.timer--;
                
                // Warning flash in last 3 seconds
                if (powerUp.timer <= 180 && powerUp.timer % 30 < 15) {
                    // This will be used for visual flashing
                    powerUp.flashing = true;
                } else {
                    powerUp.flashing = false;
                }
                
                // Deactivate when timer runs out
                if (powerUp.timer <= 0) {
                    this.deactivatePowerUp(key);
                }
            }
        });
    }
    
    /**
     * Deactivate a power-up
     */
    deactivatePowerUp(type) {
        const powerUp = this.activePowerUps[type];
        powerUp.active = false;
        powerUp.timer = 0;
        
        // Remove effects
        switch (type) {
            case 'leaves':
                // Reset speed and jump
                if (window.player) {
                    window.player.maxSpeed /= 1.5;
                    window.player.jumpPower /= 1.3;
                }
                break;
                
            case 'breastplate':
                // Remove invulnerability
                if (window.player) {
                    window.player.invulnerable = false;
                }
                break;
        }
    }
    
    /**
     * Create collection effect
     */
    createCollectionEffect(x, y, color) {
        this.collectionEffects.push({
            x: x,
            y: y,
            color: color,
            timer: 30,
            particles: []
        });
        
        // Create particles
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            this.collectionEffects[this.collectionEffects.length - 1].particles.push({
                x: 0,
                y: 0,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3
            });
        }
    }
    
    /**
     * Update collection effects
     */
    updateEffects() {
        for (let i = this.collectionEffects.length - 1; i >= 0; i--) {
            const effect = this.collectionEffects[i];
            effect.timer--;
            
            // Update particles
            effect.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.95;
                p.vy *= 0.95;
            });
            
            if (effect.timer <= 0) {
                this.collectionEffects.splice(i, 1);
            }
        }
    }
    
    /**
     * Show toast notification
     */
    showToast(message) {
        // This will be rendered by the game engine
        console.log(`TOAST: ${message}`);
        // Store for rendering
        this.lastToast = {
            message: message,
            timer: 180 // 3 seconds
        };
    }
    
    /**
     * Draw all collectibles
     */
    draw(ctx) {
        // Draw collectibles
        this.collectibles.forEach(item => {
            if (item.collected) return;
            
            const config = this.collectibleTypes[item.type];
            
            ctx.save();
            
            // Apply transformations
            if (item.rotation !== undefined) {
                ctx.translate(item.x + item.width/2, item.y + item.height/2);
                ctx.rotate(item.rotation);
                ctx.translate(-item.width/2, -item.height/2);
            } else {
                ctx.translate(item.x, item.y);
            }
            
            if (item.scale !== undefined) {
                ctx.scale(item.scale, item.scale);
            }
            
            // Draw the collectible
            this.drawCollectible(ctx, item.type, 0, 0, item.width, item.height);
            
            // Draw glow effect
            if (item.glow !== undefined) {
                ctx.globalAlpha = item.glow * 0.5;
                ctx.fillStyle = config.particleColor;
                ctx.fillRect(-2, -2, item.width + 4, item.height + 4);
                ctx.globalAlpha = 1;
            }
            
            ctx.restore();
        });
        
        // Draw collection effects
        this.collectionEffects.forEach(effect => {
            ctx.fillStyle = effect.color;
            ctx.globalAlpha = effect.timer / 30;
            
            effect.particles.forEach(p => {
                ctx.fillRect(
                    effect.x + p.x - 2,
                    effect.y + p.y - 2,
                    4, 4
                );
            });
            
            ctx.globalAlpha = 1;
        });
    }
    
    /**
     * Draw specific collectible type
     */
    drawCollectible(ctx, type, x, y, width, height) {
        const config = this.collectibleTypes[type];
        
        // Use sprite if available and sprite sheet is loaded
        if (config.sprite && this.spriteSheet.complete) {
            const sprite = this.sprites[config.sprite];
            ctx.drawImage(
                this.spriteSheet,
                sprite.x, sprite.y, sprite.width, sprite.height,  // Source
                x, y, width, height  // Destination
            );
            return;
        }
        
        // Fallback to drawn graphics for items without sprites
        switch (type) {
            case 'breastplate':
                // Draw simple armor shape
                ctx.fillStyle = '#C0C0C0';
                ctx.fillRect(x + 2, y, width - 4, height);
                // Decorative cross
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(x + width/2 - 1, y + 4, 2, height - 8);
                ctx.fillRect(x + 6, y + height/3, width - 12, 2);
                break;
                
            case 'popeBlood':
                // Draw droplet
                ctx.fillStyle = '#8B0000';
                ctx.beginPath();
                ctx.arc(x + width/2, y + height * 0.7, width/2, 0, Math.PI * 2);
                ctx.moveTo(x + width/2, y);
                ctx.lineTo(x + width * 0.3, y + height * 0.5);
                ctx.lineTo(x + width * 0.7, y + height * 0.5);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'keysOfPeter':
                // Draw key shape
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(x + width/2 - 2, y + height/3, 4, height * 2/3);
                ctx.fillRect(x + width/2 - 4, y + height - 4, 8, 4);
                ctx.fillRect(x + width/2 - 3, y + height - 8, 6, 2);
                // Key head
                ctx.beginPath();
                ctx.arc(x + width/2, y + height/4, width/3, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            default:
                // Default rectangle for unknown types
                ctx.fillStyle = config.color || '#FF00FF';
                ctx.fillRect(x, y, width, height);
        }
    }
    
    /**
     * Get collection statistics
     */
    getCollectionStats() {
        return {
            tithes: `${this.levelTithesCollected}/${this.levelTithesTotal}`,
            relics: `${this.levelRelicsCollected}/${this.levelRelicsTotal}`,
            allTithesCollected: this.levelTithesCollected === this.levelTithesTotal,
            allRelicsCollected: this.levelRelicsCollected === this.levelRelicsTotal
        };
    }
}

// Export the CollectiblesManager class
window.CollectiblesManager = CollectiblesManager;
