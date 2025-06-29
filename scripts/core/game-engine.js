// game-engine.js - Core game engine that manages everything

class GameEngine {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        // Game states
        this.states = {
            START_SCREEN: 'start_screen',
            MENU: 'menu',
            PLAYING: 'playing',
            PAUSED: 'paused',
            RELICS_CACHE: 'relics_cache', // add relics support
            CREDITS: 'credits', // add credits support
            CUTSCENE: 'cutscene',
            BOSS_FIGHT: 'boss_fight',
            GAME_OVER: 'game_over',
            VICTORY: 'victory',
            LEVEL_SELECT: 'level_select',
            SETTINGS: 'settings'  // ADD THIS
        };
        this.currentState = this.states.START_SCREEN;
        this.previousState = null;
        
        // Core systems
        this.levelLoader = new LevelLoader();
        this.collectiblesManager = new CollectiblesManager();
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            smoothing: 0.1,
            bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 }
        };
        
        // Player stats - UPDATED WITH RELICS
        this.playerStats = {
            lives: 3,
            health: 100,
            maxHealth: 100,
            coins: 0,
            score: 0,
            powerUps: [],
            popeBlood: 0,
            holyWater: 100,
            maxHolyWater: 100,
            relicsCollected: []  // NEW: Array of collected relic IDs
        };
        
        // Level state
        this.currentLevel = null;
        this.currentLevelPath = null;  // NEW: Track current level path
        this.levelTime = 0;
        this.showTimer = false;
        this.showPopeBlood = false;
        this.showHolyWater = false;
        
        // Performance optimization
        this.chunks = new Map();
        this.activeChunks = new Set();
        this.chunkSize = 512;
        this.renderDistance = 2;
        
        // Debug features
        this.debug = {
            enabled: false,
            freeCamera: false,
            godMode: false,
            showStats: true,
            showChunks: false
        };
        
        // Death/respawn
        this.deathAnimation = {
            active: false,
            timer: 0,
            duration: 120
        };
        
        // Pause menu
        this.pauseMenu = {
            options: ['Resume', 'Settings', 'Quit to Menu'],
            selected: 0
        };
        
        // Save system
        this.saveSlots = [null, null, null];
        this.currentSlot = 0;
        
        // Menu screens handler
        this.menuScreens = null;
        
        // Exit sprite configuration
        this.exitSprite = new Image();
        this.exitSprite.src = 'assets/images/objects/pequods-exit.png';
        this.exitSpriteLoaded = false;
        this.exitSprite.onload = () => {
            this.exitSpriteLoaded = true;
            console.log('Pequods exit sprite loaded!');
        };

        // Pequods building configuration
        this.exitConfig = {
            width: 256,
            height: 256,
            doorBounds: {
                offsetX: 88,
                offsetY: 216,
                width: 40,
                height: 40
            }
        };
        
        // Input handling
        this.setupInputHandlers();
        
        // Load saved game data if exists
        this.loadGameData();
    }

    /**
     * Initialize the engine and load a level
     */
    async init(levelPath) {
        // Store current level path
        this.currentLevelPath = levelPath;
        
        // Load the level
        this.currentLevel = await this.levelLoader.loadLevel(levelPath);
        if (!this.currentLevel) {
            console.error('Failed to load level!');
            return false;
        }
        
        // Set camera bounds
        this.camera.bounds = {
            minX: 0,
            minY: 0,
            maxX: Math.max(0, this.currentLevel.pixelWidth - this.canvas.width),
            maxY: Math.max(0, this.currentLevel.pixelHeight - this.canvas.height)
        };
        
        // Spawn player at start position
        const spawn = this.levelLoader.getSpawnPosition();
        player.x = spawn.x;
        player.y = spawn.y;
        
        // IMPORTANT: Clear player input state to fix the "stuck key" bug
        player.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            space: false
        };
        player.speedX = 0;
        player.speedY = 0;
        
        // Initialize enemies
        if (window.enemyManager) {
            window.enemyManager.init(this.currentLevel);
        }
        
        // Initialize collectibles with relic filtering
        this.initializeCollectiblesWithRelicCheck();
        
        // Initialize chunks
        this.initializeChunks();
        
        // Set level-specific flags
        this.showTimer = this.currentLevel.timeLimit !== null;
        this.showPopeBlood = this.currentLevel.showPopeBlood !== false;
        this.showHolyWater = this.currentLevel.showHolyWater !== false;
        
        // Start playing
        this.currentState = this.states.PLAYING;
        
        return true;
    }
    
    /**
     * Initialize collectibles and filter out already collected relics
     */
    initializeCollectiblesWithRelicCheck() {
        // Get the level name from path (e.g., "peru1" from "data/levels/peru1.json")
        const levelName = this.currentLevelPath.split('/').pop().replace('.json', '');
        
        // Filter out already collected relics
        if (this.currentLevel.collectibles) {
            const filteredCollectibles = this.currentLevel.collectibles.filter(item => {
                if (item.type === 'relic') {
                    const relicId = `${levelName}-${item.x}-${item.y}`;
                    return !this.playerStats.relicsCollected.includes(relicId);
                }
                return true;
            });
            
            // Create a modified level data for collectibles manager
            const modifiedLevel = {
                ...this.currentLevel,
                collectibles: filteredCollectibles
            };
            
            this.collectiblesManager.init(modifiedLevel);
        } else {
            this.collectiblesManager.init(this.currentLevel);
        }
    }

    /**
     * Main update loop
     */
    update() {
        switch (this.currentState) {
            case this.states.START_SCREEN:
            case this.states.MENU:
                if (this.menuScreens) {
                    this.menuScreens.update(1/60);
                }
                break;
            case this.states.PLAYING:
                this.updatePlaying();
                break;
            case this.states.PAUSED:
                this.updatePaused();
                break;
    //adding settings
            case this.states.SETTINGS:
                if (this.menuScreens) {
                this.menuScreens.update(1/60);
                }
                break;
            case this.states.GAME_OVER:
                this.updateGameOver();
                break;
            case this.states.VICTORY:
                this.updateVictory();
                break;
            case this.states.BOSS_FIGHT:
                this.updateBossFight();
                break;
        }
    }

    /**
     * Update game when playing
     */
    updatePlaying() {
        // Handle death animation first
        if (this.deathAnimation.active) {
            this.updateDeathAnimation();
            return;  // Don't update anything else during death
        }
        
        // Update level time
        this.levelTime += 1/60;  // Assuming 60 FPS
        
        // Check time limit
        if (this.currentLevel.timeLimit && this.levelTime > this.currentLevel.timeLimit) {
            this.playerDeath();
            return;
        }
        
        // Update camera to follow player
        this.updateCamera();
        
        // Update active chunks based on camera
        this.updateActiveChunks();
        
        // Apply level-specific physics
        if (this.currentLevel.gravity !== 1.0) {
            window.physics.gravity *= this.currentLevel.gravity;
        }
        
        // Update all enemies
        if (window.enemyManager) {
            window.enemyManager.update();
        }
        
        // Update collectibles
        this.collectiblesManager.update();
        
        // Check for relic collection - NEW
        this.checkRelicCollection();
        
        // Check if player fell off bottom
        if (player.y > this.currentLevel.pixelHeight + 100) {
            this.playerDeath();
        }
        
        // Update checkpoints
        this.levelLoader.updateCheckpoint(player.x);
        
        // Check level completion
        if (this.checkLevelComplete()) {
            this.currentState = this.states.VICTORY;
        }
        
        // Apply debug features
        if (this.debug.godMode) {
            this.playerStats.health = this.playerStats.maxHealth;
        }
    }
    
    /**
     * Check if any relics were collected and save them
     */
    checkRelicCollection() {
        const levelName = this.currentLevelPath.split('/').pop().replace('.json', '');
        
        this.collectiblesManager.collectibles.forEach(item => {
            if (item.type === 'relic' && item.collected && !item.saved) {
                const relicId = `${levelName}-${item.x}-${item.y}`;
                if (!this.playerStats.relicsCollected.includes(relicId)) {
                    this.playerStats.relicsCollected.push(relicId);
                    item.saved = true;
                    this.saveGameData();
                    console.log(`Relic saved: ${relicId}`);
                }
            }
        });
    }

    /**
     * Update camera with smooth following
     */
    updateCamera() {
        if (this.debug.freeCamera) return;
        
        // Set target to player center
        this.camera.targetX = player.x + player.width/2 - this.canvas.width/2;
        this.camera.targetY = player.y + player.height/2 - this.canvas.height/2;
        
        // Smooth camera movement
        this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.smoothing;
        this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.smoothing;
        
        // Clamp to level bounds
        this.camera.x = Math.max(this.camera.bounds.minX, 
                                Math.min(this.camera.bounds.maxX, this.camera.x));
        this.camera.y = Math.max(this.camera.bounds.minY, 
                                Math.min(this.camera.bounds.maxY, this.camera.y));
    }

    /**
     * Initialize chunks for level
     */
    initializeChunks() {
        const chunksWide = Math.ceil(this.currentLevel.pixelWidth / this.chunkSize);
        const chunksHigh = Math.ceil(this.currentLevel.pixelHeight / this.chunkSize);
        
        for (let cx = 0; cx < chunksWide; cx++) {
            for (let cy = 0; cy < chunksHigh; cy++) {
                const chunk = {
                    x: cx,
                    y: cy,
                    platforms: [],
                    enemies: [],
                    collectibles: []
                };
                
                // Add objects to appropriate chunks
                this.assignObjectsToChunk(chunk);
                
                this.chunks.set(`${cx},${cy}`, chunk);
            }
        }
    }

    /**
     * Update which chunks are active based on camera
     */
    updateActiveChunks() {
        this.activeChunks.clear();
        
        const camChunkX = Math.floor(this.camera.x / this.chunkSize);
        const camChunkY = Math.floor(this.camera.y / this.chunkSize);
        
        // Load chunks around camera
        for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
            for (let dy = -this.renderDistance; dy <= this.renderDistance; dy++) {
                const chunkKey = `${camChunkX + dx},${camChunkY + dy}`;
                if (this.chunks.has(chunkKey)) {
                    this.activeChunks.add(chunkKey);
                }
            }
        }
    }

    /**
     * Assign objects to chunks
     */
    assignObjectsToChunk(chunk) {
        const chunkLeft = chunk.x * this.chunkSize;
        const chunkRight = chunkLeft + this.chunkSize;
        const chunkTop = chunk.y * this.chunkSize;
        const chunkBottom = chunkTop + this.chunkSize;
        
        // Add platforms that overlap this chunk
        this.currentLevel.platforms.forEach(platform => {
            if (platform.x < chunkRight && platform.x + platform.width > chunkLeft &&
                platform.y < chunkBottom && platform.y + platform.height > chunkTop) {
                chunk.platforms.push(platform);
            }
        });
        
        // Similar for enemies and collectibles
    }

    /**
     * Handle player death
     */
    playerDeath() {
        if (this.deathAnimation.active) return;
        
        this.playerStats.lives--;
        this.deathAnimation.active = true;
        this.deathAnimation.timer = 0;
        
        // Start death animation
        player.state = 'dying';
        
        // Clear player input to prevent stuck keys
        player.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            space: false
        };
    }

    /**
     * Update death animation
     */
    updateDeathAnimation() {
        this.deathAnimation.timer++;
        
        // Fade out or fall
        if (this.deathAnimation.timer < 60) {
            player.y += 5;  // Fall
            player.speedX *= 0.9;  // Slow down horizontal movement
        }
        
        // Respawn or game over
        if (this.deathAnimation.timer >= this.deathAnimation.duration) {
            this.deathAnimation.active = false;
            
            if (this.playerStats.lives > 0) {
                // Respawn with full health
                this.playerStats.health = this.playerStats.maxHealth;
                this.respawnPlayer();
            } else {
                // No lives left - game over
                this.currentState = this.states.GAME_OVER;
            }
        }
    }

    /**
     * Respawn player at checkpoint
     */
    respawnPlayer() {
        const spawn = this.levelLoader.getSpawnPosition();
        player.x = spawn.x;
        player.y = spawn.y;
        player.speedX = 0;
        player.speedY = 0;
        player.state = 'idle';
        
        // Clear input state
        player.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            space: false
        };
        
        this.playerStats.health = this.playerStats.maxHealth;
        this.deathAnimation.active = false;
        
        // Smooth camera transition
        this.camera.targetX = spawn.x - this.canvas.width/2;
        this.camera.targetY = spawn.y - this.canvas.height/2;
    }

    /**
     * Check if level is complete
     */
    checkLevelComplete() {
        const goal = this.currentLevel.goal;
        
        if (goal.type === 'reach_exit') {
            // Calculate door position
            const buildingX = goal.position.x - this.exitConfig.width/2;
            const buildingY = goal.position.y - this.exitConfig.height;
            const doorX = buildingX + this.exitConfig.doorBounds.offsetX;
            const doorY = buildingY + this.exitConfig.doorBounds.offsetY;
            
            // Check if player overlaps with door area
            return player.x < doorX + this.exitConfig.doorBounds.width &&
                   player.x + player.width > doorX &&
                   player.y < doorY + this.exitConfig.doorBounds.height &&
                   player.y + player.height > doorY;
        }
        
        return this.levelLoader.checkGoalComplete();
    }

    /**
     * Update when paused
     */
    updatePaused() {
        // Pause menu navigation handled by input
    }

    /**
     * Update game over state
     */
    updateGameOver() {
        // Just wait for input (R or ESC)
    }

    /**
     * Update victory state
     */
    updateVictory() {
        // Just wait for input (R to restart)
    }

   render() {
    // Add this debug line
    console.log('Current state:', this.currentState);
    
    // Clear screen
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render menu screens first (no camera transform needed)
    if ((this.currentState === this.states.START_SCREEN || 
         this.currentState === this.states.MENU ||
         this.currentState === this.states.SETTINGS ||
         this.currentState === this.states.LEVEL_SELECT ||  // <-- Make sure this line exists
         this.currentState === this.states.RELICS_CACHE ||
         this.currentState === this.states.CREDITS) && this.menuScreens) {
        this.menuScreens.render();
        return;
    }
    
    // Save context state
    this.ctx.save();
    
    // Apply camera transform
    this.ctx.translate(-this.camera.x, -this.camera.y);
           
        // Render based on state
        switch (this.currentState) {
            case this.states.PLAYING:
            case this.states.BOSS_FIGHT:
                this.renderGame();
                break;
        }
        
        // Restore context
        this.ctx.restore();
        
        // Render HUD (not affected by camera)
        this.renderHUD();
        
        // Render screens that should be on top
        switch (this.currentState) {
            case this.states.VICTORY:
                this.renderVictory();
                break;
            case this.states.GAME_OVER:
                this.renderGameOver();
                break;
        }
        
        // Render pause menu if paused
        if (this.currentState === this.states.PAUSED) {
            this.renderPauseMenu();
        }
        
        // Debug rendering
        if (this.debug.enabled) {
            this.renderDebug();
        }
    }

    renderGame() {
        // Fill background with sky color
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(this.camera.x, this.camera.y, this.canvas.width, this.canvas.height);
        
        // Render parallax backgrounds
        this.renderParallaxBackground();
        
        // Only render objects in active chunks
        this.activeChunks.forEach(chunkKey => {
            const chunk = this.chunks.get(chunkKey);
            
            // Render platforms
            chunk.platforms.forEach(platform => {
                this.renderPlatform(platform);
            });
            
            // Render collectibles
            chunk.collectibles.forEach(item => {
                this.renderCollectible(item);
            });
        });
        
        // Render collectibles
        this.collectiblesManager.draw(this.ctx);
        
        // Render level goal/exit BEFORE player and enemies
        if (this.currentLevel.goal && this.currentLevel.goal.type === 'reach_exit') {
            const exit = this.currentLevel.goal.position;
            
            // Calculate building position
            const buildingX = exit.x - this.exitConfig.width/2;
            const buildingY = exit.y - this.exitConfig.height + 32;
            
            // Only render if on screen
            if (!(buildingX + this.exitConfig.width < this.camera.x || 
                  buildingX > this.camera.x + this.canvas.width ||
                  buildingY + this.exitConfig.height < this.camera.y || 
                  buildingY > this.camera.y + this.canvas.height)) {
                
                if (this.exitSpriteLoaded) {
                    // Draw the Pequod's Pizza sprite
                    this.ctx.drawImage(
                        this.exitSprite,
                        buildingX,
                        buildingY,
                        this.exitConfig.width,
                        this.exitConfig.height
                    );
                } else {
                    // Fallback rendering
                    this.ctx.fillStyle = '#8B4513';
                    this.ctx.fillRect(buildingX, buildingY, this.exitConfig.width, this.exitConfig.height);
                    
                    this.ctx.fillStyle = '#FFF';
                    this.ctx.font = '16px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText("PEQUOD'S", buildingX + this.exitConfig.width/2, buildingY + 50);
                    this.ctx.fillText("PIZZA", buildingX + this.exitConfig.width/2, buildingY + 70);
                    
                    // Draw door
                    this.ctx.fillStyle = '#654321';
                    this.ctx.fillRect(
                        buildingX + this.exitConfig.doorBounds.offsetX,
                        buildingY + this.exitConfig.doorBounds.offsetY,
                        this.exitConfig.doorBounds.width,
                        this.exitConfig.doorBounds.height
                    );
                }
                
                // Debug: Show door hitbox
                if (this.debug.enabled) {
                    const doorX = buildingX + this.exitConfig.doorBounds.offsetX;
                    const doorY = buildingY + this.exitConfig.doorBounds.offsetY;
                    
                    this.ctx.strokeStyle = 'lime';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(
                        doorX, 
                        doorY, 
                        this.exitConfig.doorBounds.width, 
                        this.exitConfig.doorBounds.height
                    );
                    
                    this.ctx.fillStyle = 'lime';
                    this.ctx.font = '12px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('DOOR', doorX + this.exitConfig.doorBounds.width/2, doorY - 5);
                }
            }
        }
        
        // Render player
        player.draw(this.ctx);
        
        // Render enemies
        if (window.enemyManager) {
            window.enemyManager.draw(this.ctx);
        }
        
        // Render weather effects
        this.renderWeather();
    }

    /**
     * Render platform
     */
    renderPlatform(platform) {
        // Skip if not on screen
        if (!this.isOnScreen(platform)) return;
        
        // Use simple colored rectangles for now
        const colors = {
            'solid': '#654321',
            'bouncy_platform': '#FF69B4',
            'very_bouncy_platform': '#FF1493',  // Darker pink for very bouncy
            'oneway': '#90EE90',
            'platform_r_slow': '#FFD700',
            'falling_platform': '#CD853F'  // Sandy brown for falling platforms
        };
        
        this.ctx.fillStyle = colors[platform.type] || '#808080';
        
        // One-way platforms are semi-transparent
        if (platform.type === 'oneway') {
            this.ctx.globalAlpha = 0.6;
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            // Draw arrows to show it's one-way
            this.ctx.globalAlpha = 1;
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.fillText('↑↑↑', platform.x + platform.width/2 - 10, platform.y + platform.height/2);
        } else {
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        }
        
        // Debug: Draw platform outline
        if (this.debug.enabled) {
            this.ctx.strokeStyle = 'red';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
        }
    }

    /**
     * Check if object is on screen
     */
    isOnScreen(obj) {
        return obj.x + obj.width > this.camera.x &&
               obj.x < this.camera.x + this.canvas.width &&
               obj.y + obj.height > this.camera.y &&
               obj.y < this.camera.y + this.canvas.height;
    }

    /**
     * Render HUD elements
     */
    renderHUD() {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        
        // Top left - Lives, Health, Coins
        this.ctx.fillText(`Lives: ${this.playerStats.lives}`, 10, 30);
        
        // Health bar instead of percentage
        this.ctx.fillText('Health:', 10, 55);
        // Background of health bar
        this.ctx.fillStyle = 'darkred';
        this.ctx.fillRect(80, 40, 100, 20);
        // Health fill
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(80, 40, this.playerStats.health, 20);
        // Health bar border
        this.ctx.strokeStyle = 'white';
        this.ctx.strokeRect(80, 40, 100, 20);
        
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(`Tithe: ${this.playerStats.coins}`, 10, 80);
        
        // Collection progress
        const stats = this.collectiblesManager.getCollectionStats();
        this.ctx.fillText(`Tithes: ${stats.tithes}`, 10, 105);
        if (parseInt(stats.relics.split('/')[1]) > 0) {
            this.ctx.fillText(`Relics: ${stats.relics}`, 10, 130);
        }
        
        // NEW: Show total relics collected across all levels
        this.ctx.fillText(`Total Relics: ${this.playerStats.relicsCollected.length}`, 10, 155);
        
        // Top right - Power-ups
        let rightY = 30;
        
        // Show active power-ups with visual timer
        const powerUps = this.collectiblesManager.activePowerUps;
        if (powerUps.leaves.active) {
            const percent = powerUps.leaves.timer / powerUps.leaves.duration;
            this.ctx.fillStyle = powerUps.leaves.flashing ? 'yellow' : 'white';
            this.ctx.fillText('Speed Boost', this.canvas.width - 150, rightY);
            // Draw timer bar
            this.ctx.fillStyle = 'green';
            this.ctx.fillRect(this.canvas.width - 150, rightY + 5, 100 * percent, 5);
            rightY += 35;
        }
        
        if (powerUps.breastplate.active) {
            const percent = powerUps.breastplate.timer / powerUps.breastplate.duration;
            this.ctx.fillStyle = powerUps.breastplate.flashing ? 'yellow' : 'white';
            this.ctx.fillText('Invulnerable', this.canvas.width - 150, rightY);
            // Draw timer bar
            this.ctx.fillStyle = 'silver';
            this.ctx.fillRect(this.canvas.width - 150, rightY + 5, 100 * percent, 5);
            rightY += 35;
        }
        
        this.ctx.fillStyle = 'white';
        
        if (this.showPopeBlood) {
            this.ctx.fillText(`Pope Blood: ${this.playerStats.popeBlood}`, 
                            this.canvas.width - 150, rightY);
            rightY += 25;
        }
        
        if (this.showHolyWater) {
            this.ctx.fillText(`Holy Water: ${this.playerStats.holyWater}%`, 
                            this.canvas.width - 150, rightY);
        }
        
        // Bottom right - Score and Timer
        this.ctx.fillText(`Score: ${this.playerStats.score}`, 
                        this.canvas.width - 150, this.canvas.height - 40);
        
        if (this.showTimer) {
            const timeLeft = Math.max(0, this.currentLevel.timeLimit - this.levelTime);
            this.ctx.fillText(`Time: ${Math.floor(timeLeft)}`, 
                            this.canvas.width - 150, this.canvas.height - 15);
        }
        
        // Render toast notifications
        if (this.collectiblesManager.lastToast && this.collectiblesManager.lastToast.timer > 0) {
            const toast = this.collectiblesManager.lastToast;
            toast.timer--;
            
            // Draw toast background
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(this.canvas.width/2 - 150, 100, 300, 50);
            
            // Draw toast text
            this.ctx.fillStyle = 'gold';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(toast.message, this.canvas.width/2, 130);
            this.ctx.textAlign = 'left';
            this.ctx.font = '20px Arial';
        }
    }

    /**
     * Render pause menu
     */
    renderPauseMenu() {
        // Darken screen
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Menu box
        this.ctx.fillStyle = 'rgba(50, 50, 50, 0.9)';
        this.ctx.fillRect(this.canvas.width/2 - 150, this.canvas.height/2 - 100, 300, 200);
        
        // Menu options
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        
        this.pauseMenu.options.forEach((option, index) => {
            if (index === this.pauseMenu.selected) {
                this.ctx.fillStyle = 'yellow';
            } else {
                this.ctx.fillStyle = 'white';
            }
            this.ctx.fillText(option, this.canvas.width/2, 
                            this.canvas.height/2 - 50 + index * 40);
        });
        
        this.ctx.textAlign = 'left';
    }

    /**
     * Render game over screen
     */
    renderGameOver() {
        // Use the menu screens game over screen
        if (this.menuScreens) {
            this.menuScreens.renderGameOverScreen();
        } else {
            // Fallback rendering
            this.ctx.fillStyle = '#2a2a2a';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = 'red';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width/2, this.canvas.height/2);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Press R to restart', this.canvas.width/2, this.canvas.height/2 + 60);
            
            this.ctx.textAlign = 'left';
        }
    }

/**
 * Render victory screen
 */
renderVictory() {
    // Load victory image if not already loaded
    if (!this.victoryImage) {
        this.victoryImage = new Image();
        this.victoryImage.src = 'assets/images/backgrounds/victory.png';
    }
    
    // Clear screen
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw victory background image
    if (this.victoryImage && this.victoryImage.complete) {
        this.ctx.drawImage(this.victoryImage, 0, 0, this.canvas.width, this.canvas.height);
    } else {
        // Fallback gold background if image hasn't loaded
        this.ctx.fillStyle = 'gold';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Victory message - now in white
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = 'black';
    this.ctx.shadowBlur = 10;
    this.ctx.fillText('LEVEL COMPLETE!', this.canvas.width/2, this.canvas.height/2);
    
    this.ctx.shadowBlur = 0;
    this.ctx.font = '24px Arial';
    this.ctx.fillText('Press R to restart', this.canvas.width/2, this.canvas.height/2 + 60);
    
    this.ctx.textAlign = 'left';
}

    /**
     * Setup input handlers
     */
    setupInputHandlers() {
        window.addEventListener('keydown', (e) => {
            // Handle menu input first
if ((this.currentState === this.states.START_SCREEN || 
     this.currentState === this.states.MENU ||
     this.currentState === this.states.SETTINGS ||
     this.currentState === this.states.LEVEL_SELECT || 
     this.currentState === this.states.RELICS_CACHE ||
     this.currentState === this.states.CREDITS) && this.menuScreens) {
    this.menuScreens.handleInput(e);
    return;
}
            
            // Handle ESC to return to menu
            if (e.key === 'Escape') {
                if (this.currentState === this.states.PLAYING) {
                    this.currentState = this.states.MENU;
                    return;
                } else if (this.currentState === this.states.GAME_OVER) {
                    // Reset player stats when returning to menu from game over
                    this.playerStats.lives = 3;
                    this.playerStats.health = this.playerStats.maxHealth;
                    this.currentState = this.states.MENU;
                    return;
                }
            }
            
            // Pause
            if (e.key === 'p' || e.key === 'P') {
                if (this.currentState === this.states.PLAYING) {
                    this.currentState = this.states.PAUSED;
                } else if (this.currentState === this.states.PAUSED) {
                    this.currentState = this.states.PLAYING;
                }
            }

            // Restart key
            if (e.key === 'r' || e.key === 'R') {
                if (this.currentState === this.states.VICTORY || 
                    this.currentState === this.states.GAME_OVER) {
                    this.restartLevel();
                }
            }
                    
            // Debug keys
            if (e.key === 'F1') this.debug.enabled = !this.debug.enabled;
            if (e.key === 'F2') this.debug.freeCamera = !this.debug.freeCamera;
            if (e.key === 'F3') this.debug.godMode = !this.debug.godMode;
            if (e.key === 'F4') this.skipLevel();
            
            // Free camera movement
            if (this.debug.freeCamera) {
                const cameraSpeed = 10;
                if (e.key === 'ArrowLeft') this.camera.x -= cameraSpeed;
                if (e.key === 'ArrowRight') this.camera.x += cameraSpeed;
                if (e.key === 'ArrowUp') this.camera.y -= cameraSpeed;
                if (e.key === 'ArrowDown') this.camera.y += cameraSpeed;
            }
            
            // Pause menu navigation
            if (this.currentState === this.states.PAUSED) {
                if (e.key === 'ArrowUp') {
                    this.pauseMenu.selected = 
                        (this.pauseMenu.selected - 1 + this.pauseMenu.options.length) % 
                        this.pauseMenu.options.length;
                }
                if (e.key === 'ArrowDown') {
                    this.pauseMenu.selected = 
                        (this.pauseMenu.selected + 1) % this.pauseMenu.options.length;
                }
                if (e.key === 'Enter') {
                    this.handlePauseMenuSelect();
                }
            }
        });
    }

    /**
     * Handle pause menu selection
     */
    handlePauseMenuSelect() {
        switch (this.pauseMenu.options[this.pauseMenu.selected]) {
            case 'Resume':
                this.currentState = this.states.PLAYING;
                break;
case 'Settings':
    if (this.menuScreens) {
        this.menuScreens.openSettings();
        this.menuScreens.previousState = this.states.PAUSED;  // Remember we came from pause
    }
    break;
            case 'Quit to Menu':
                this.currentState = this.states.MENU;
                break;
        }
    }

    /**
     * Save game state
     */
    saveGame() {
        const saveData = {
            level: this.currentLevel.name,
            checkpoint: this.levelLoader.currentCheckpoint,
            stats: { ...this.playerStats },
            collectedItems: Array.from(this.levelLoader.collectedItems),
            time: this.levelTime
        };
        
        // Save to localStorage (Note: This won't work in Claude artifacts)
        // In a real game, you'd save to a server or file
        console.log('Game saved:', saveData);
        
        return saveData;
    }
    
    /**
     * Save game data (relics, stats, etc)
     */
    saveGameData() {
        const gameData = {
            relicsCollected: this.playerStats.relicsCollected,
            totalCoins: this.playerStats.coins,
            totalScore: this.playerStats.score
        };
        
        // In a real game, save to localStorage or server
        // For now, just log it
        console.log('Game data saved:', gameData);
        
        // You could use localStorage like this (won't work in Claude):
        // localStorage.setItem('popeGameData', JSON.stringify(gameData));
    }
    
    /**
     * Load game data
     */
    loadGameData() {
        // In a real game, load from localStorage or server
        // For now, just use default values
        console.log('Loading game data...');
        
        // You could use localStorage like this (won't work in Claude):
        // const saved = localStorage.getItem('popeGameData');
        // if (saved) {
        //     const data = JSON.parse(saved);
        //     this.playerStats.relicsCollected = data.relicsCollected || [];
        // }
    }

    /**
     * Render debug info
     */
    renderDebug() {
        this.ctx.fillStyle = 'lime';
        this.ctx.font = '12px monospace';
        
        let debugY = 180;  // Start lower to avoid overlapping with relics display
        this.ctx.fillText(`State: ${this.currentState}`, 10, debugY);
        debugY += 15;
        this.ctx.fillText(`Camera: ${Math.floor(this.camera.x)}, ${Math.floor(this.camera.y)}`, 10, debugY);
        debugY += 15;
        this.ctx.fillText(`Active Chunks: ${this.activeChunks.size}`, 10, debugY);
        debugY += 15;
        this.ctx.fillText(`God Mode: ${this.debug.godMode}`, 10, debugY);
        debugY += 15;
        this.ctx.fillText(`Health: ${this.playerStats.health}/${this.playerStats.maxHealth}`, 10, debugY);
        debugY += 15;
        this.ctx.fillText(`Relics: ${this.playerStats.relicsCollected.length}`, 10, debugY);
        
        // Draw player hitbox
        if (player) {
            this.ctx.save();
            this.ctx.translate(-this.camera.x, -this.camera.y);
            this.ctx.strokeStyle = 'lime';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(player.x, player.y, player.width, player.height);
            this.ctx.restore();
        }

        // Draw enemy hitboxes
        if (window.enemyManager && window.enemyManager.enemies) {
            this.ctx.save();
            this.ctx.translate(-this.camera.x, -this.camera.y);
            this.ctx.strokeStyle = 'orange';
            this.ctx.lineWidth = 2;
            window.enemyManager.enemies.forEach(enemy => {
                this.ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
            });
            this.ctx.restore();
        }
        
        // Draw chunk boundaries
        if (this.debug.showChunks) {
            this.ctx.save();
            this.ctx.translate(-this.camera.x, -this.camera.y);
            this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
            this.activeChunks.forEach(chunkKey => {
                const [cx, cy] = chunkKey.split(',').map(Number);
                this.ctx.strokeRect(cx * this.chunkSize, cy * this.chunkSize, 
                                  this.chunkSize, this.chunkSize);
            });
            this.ctx.restore();
        }
    }

    /**
     * Render parallax background layers
     */
    renderParallaxBackground() {
        if (!this.levelLoader.parallaxLayers || this.levelLoader.parallaxLayers.length === 0) return;
        
        this.levelLoader.parallaxLayers.forEach(layer => {
            // Skip if image not loaded
            if (!layer.img) {
                // Try to load the image
                layer.img = new Image();
                layer.img.src = layer.image;
                layer.img.onload = () => {
                    console.log('Background loaded:', layer.image);
                };
                return;
            }
            
            // Skip if image still loading
            if (!layer.img.complete) return;
            
            // Calculate parallax offset
            const parallaxX = this.camera.x * layer.speed;
            const parallaxY = this.camera.y * layer.speed + layer.offsetY;
            
            // Save context state
            this.ctx.save();
            
            // Reset transform for background
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            if (layer.repeat) {
                // Tile the background horizontally
                const imgWidth = layer.img.width;
                const startX = -(parallaxX % imgWidth);
                
                // Draw enough copies to fill the screen
                for (let x = startX; x < this.canvas.width; x += imgWidth) {
                    this.ctx.drawImage(
                        layer.img,
                        x,
                        -parallaxY,
                        imgWidth,
                        layer.img.height
                    );
                }
            } else {
                // Draw single background image
                this.ctx.drawImage(
                    layer.img,
                    -parallaxX,
                    -parallaxY,
                    layer.img.width,
                    layer.img.height
                );
            }
            
            // Restore context state
            this.ctx.restore();
        });
    }

    renderWeather() {
        // TODO: Implement weather effects
    }

    renderCollectible(item) {
        // Handled by collectiblesManager now
    }

    updateBossFight() {
        // TODO: Implement boss fight camera and mechanics
    }

    skipLevel() {
        console.log('Skipping to next level...');
        // TODO: Load next level
    }

    /**
     * Restart the current level
     */
    restartLevel() {
        // Reset player stats (but keep relics!)
        this.playerStats.lives = 3;
        this.playerStats.health = this.playerStats.maxHealth;
        
        // Reset level state
        this.levelTime = 0;
        this.levelLoader.currentCheckpoint = 0;
        this.levelLoader.collectedItems.clear();
        
        // Clear and reinitialize collectibles with relic check
        this.initializeCollectiblesWithRelicCheck();
        
        // Clear and reinitialize enemies
        if (window.enemyManager) {
            window.enemyManager.clear();
            window.enemyManager.init(this.currentLevel);
        }
        
        // Clear player input state (fixes stuck key bug)
        player.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            space: false
        };
        player.speedX = 0;
        player.speedY = 0;
        
        // Respawn player
        this.respawnPlayer();
        
        // Reset state
        this.currentState = this.states.PLAYING;
    }
}

// Export the GameEngine class
window.GameEngine = GameEngine;
