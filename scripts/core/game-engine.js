// game-engine.js - Core game engine that manages everything

class GameEngine {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Game states
        this.states = {
            START_SCREEN: 'start_screen',  // ADDED
            MENU: 'menu',
            PLAYING: 'playing',
            PAUSED: 'paused',
            CUTSCENE: 'cutscene',
            BOSS_FIGHT: 'boss_fight',
            GAME_OVER: 'game_over',
            VICTORY: 'victory',
            LEVEL_SELECT: 'level_select'
        };
        this.currentState = this.states.START_SCREEN;  // CHANGED from MENU
        this.previousState = null;
        
        // Core systems
        this.levelLoader = new LevelLoader();
        this.collectiblesManager = new CollectiblesManager();
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            smoothing: 0.1,  // Camera lag
            bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 }
        };
        
        // Player stats
        this.playerStats = {
            lives: 3,
            health: 100,
            maxHealth: 100,
            coins: 0,
            score: 0,
            powerUps: [],
            popeBlood: 0,
            holyWater: 100,
            maxHolyWater: 100
        };
        
        // Level state
        this.currentLevel = null;
        this.levelTime = 0;
        this.showTimer = false;
        this.showPopeBlood = false;
        this.showHolyWater = false;
        
        // Performance optimization
        this.chunks = new Map();
        this.activeChunks = new Set();
        this.chunkSize = 512;
        this.renderDistance = 2; // Chunks in each direction
        
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
            duration: 120  // 2 seconds at 60fps
        };
        
        // Pause menu
        this.pauseMenu = {
            options: ['Resume', 'Settings', 'Quit to Menu'],
            selected: 0
        };
        
        // Save system
        this.saveSlots = [null, null, null];  // 3 save slots
        this.currentSlot = 0;
        
        // Menu screens handler - ADDED
        this.menuScreens = null; // Will be initialized in main.js
        
        // Input handling
        this.setupInputHandlers();
    }
    
    /**
     * Initialize the engine and load a level
     */
    async init(levelPath) {
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
        
        // Initialize enemies
        if (window.enemyManager) {
            window.enemyManager.init(this.currentLevel);
        }
        
        // Initialize collectibles
        this.collectiblesManager.init(this.currentLevel);
        
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
     * Main update loop
     */
    update() {
        switch (this.currentState) {
            case this.states.START_SCREEN:  // ADDED
            case this.states.MENU:           // ADDED
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
    }
    
    /**
     * Update death animation
     */
    updateDeathAnimation() {
        this.deathAnimation.timer++;
        
        // Fade out or fall
        if (this.deathAnimation.timer < 60) {
            player.y += 5;  // Fall
        }
        
        // Respawn or game over
        if (this.deathAnimation.timer >= this.deathAnimation.duration) {
            if (this.playerStats.lives > 0) {
                this.respawnPlayer();
            } else {
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
            const exitDist = Math.abs(player.x - goal.position.x) + 
                           Math.abs(player.y - goal.position.y);
            return exitDist < 50;
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
     * Main render loop
     */
    render() {
        // Clear screen
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render menu screens first (no camera transform needed) - ADDED
        if ((this.currentState === this.states.START_SCREEN || 
             this.currentState === this.states.MENU) && this.menuScreens) {
            this.menuScreens.render();
            return; // Don't render anything else
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
    
    /**
     * Render the game world
     */
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
        
        // Render player (always)
        player.draw(this.ctx);
        
        // Render enemies
        if (window.enemyManager) {
            window.enemyManager.draw(this.ctx);
        }
        
        // Render collectibles
        this.collectiblesManager.draw(this.ctx);
        
        // Render weather effects
        this.renderWeather();

        // Render level goal/exit
if (this.currentLevel.goal && this.currentLevel.goal.type === 'reach_exit') {
    const exit = this.currentLevel.goal.position;
    
    // Draw a golden door/portal as the exit
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fillRect(exit.x - 25, exit.y - 50, 50, 50);
    
    // Add a glow effect
    this.ctx.strokeStyle = '#FFFF00';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(exit.x - 25, exit.y - 50, 50, 50);
    
    // Add "EXIT" text
    this.ctx.fillStyle = '#000';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('SANCTUARY', exit.x, exit.y - 20);
}
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
            'oneway': '#90EE90',
            'platform_r_slow': '#FFD700'
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
        this.ctx.fillText(`Health: ${this.playerStats.health}%`, 10, 55);
        this.ctx.fillText(`Tithe: ${this.playerStats.coins}`, 10, 80);
        
        // Collection progress
        const stats = this.collectiblesManager.getCollectionStats();
        this.ctx.fillText(`Tithes: ${stats.tithes}`, 10, 105);
        if (parseInt(stats.relics.split('/')[1]) > 0) {
            this.ctx.fillText(`Relics: ${stats.relics}`, 10, 130);
        }
        
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
     * Setup input handlers
     */
    setupInputHandlers() {
        window.addEventListener('keydown', (e) => {
            // Handle menu input first - ADDED
            if ((this.currentState === this.states.START_SCREEN || 
                 this.currentState === this.states.MENU) && this.menuScreens) {
                this.menuScreens.handleInput(e);
                return;
            }
            
            // Handle ESC to return to menu from game - ADDED
            if (e.key === 'Escape' && this.currentState === this.states.PLAYING) {
                this.currentState = this.states.MENU;
                return;
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
                // TODO: Open settings menu
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
     * Render debug info
     */
    renderDebug() {
        this.ctx.fillStyle = 'lime';
        this.ctx.font = '12px monospace';
        
        let debugY = 150;
        this.ctx.fillText(`State: ${this.currentState}`, 10, debugY);
        debugY += 15;
        this.ctx.fillText(`Camera: ${Math.floor(this.camera.x)}, ${Math.floor(this.camera.y)}`, 10, debugY);
        debugY += 15;
        this.ctx.fillText(`Active Chunks: ${this.activeChunks.size}`, 10, debugY);
        debugY += 15;
        this.ctx.fillText(`God Mode: ${this.debug.godMode}`, 10, debugY);
        
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
    
    // Placeholder methods for features we'll add later
    renderParallaxBackground() {
        // TODO: Implement parallax layers
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
    
    updateGameOver() {
        // For now, just wait for restart
        // TODO: Implement full game over screen
    }
    
    /**
     * Render game over screen
     */
    renderGameOver() {
        // Dark screen
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Game over message
        this.ctx.fillStyle = 'red';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width/2, this.canvas.height/2);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Press R to restart', this.canvas.width/2, this.canvas.height/2 + 60);
        
        this.ctx.textAlign = 'left';
    }
    
    updateVictory() {
        // For now, just show victory message
        // TODO: Implement full victory screen with stats
    }
    
    /**
     * Render victory screen
     */
    renderVictory() {
        // Fill screen with celebration color (no camera transform)
        this.ctx.fillStyle = 'gold';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Victory message
        this.ctx.fillStyle = 'black';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('LEVEL COMPLETE!', this.canvas.width/2, this.canvas.height/2);
        
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Press R to restart', this.canvas.width/2, this.canvas.height/2 + 60);
        
        this.ctx.textAlign = 'left';
    }
    
    skipLevel() {
        console.log('Skipping to next level...');
        // TODO: Load next level
    }
    
    /**
     * Restart the current level
     */
    restartLevel() {
        // Reset player stats
        this.playerStats.lives = 3;
        this.playerStats.health = this.playerStats.maxHealth;
        
        // Reset level state
        this.levelTime = 0;
        this.levelLoader.currentCheckpoint = 0;
        this.levelLoader.collectedItems.clear();
        
        // Clear and reinitialize collectibles
        this.collectiblesManager.init(this.currentLevel);
        
        // Clear and reinitialize enemies
        if (window.enemyManager) {
            window.enemyManager.clear();
            window.enemyManager.init(this.currentLevel);
        }
        
        // Respawn player
        this.respawnPlayer();
        
        // Reset state
        this.currentState = this.states.PLAYING;
    }
}

// Export the GameEngine class
window.GameEngine = GameEngine;
