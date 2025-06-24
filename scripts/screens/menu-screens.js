// scripts/screens/menu-screens.js

class MenuScreens {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.canvas = gameEngine.canvas;
        this.ctx = gameEngine.ctx;
        
        // Menu state
        this.menuSelection = 0;
        this.menuOptions = [
            { text: 'Play Game', enabled: true },
            { text: 'Settings', enabled: true },  // CHANGED to enabled
            { text: 'Relics Cache', enabled: false },
            { text: 'Credits', enabled: false }
        ];
        
        // Animation timers
        this.floatAnimation = 0;
        this.messageTimer = 0;
        this.showMessage = false;
        
        // Images
        this.images = {
            titleScreen: null,
            menuScreen: null,
            gameOverScreen: null  // ADDED for game over
        };
        
        // Audio
        this.menuMusic = null;
        this.musicStarted = false;
        
        // Settings screen instance
        this.settingsScreen = null;
        this.previousState = null;  // Track where we came from
        
        // Load assets
        this.loadAssets();
    }
    
    loadAssets() {
        // Load title screen image
        const titleImg = new Image();
        titleImg.src = 'assets/images/backgrounds/title-screen.png';
        titleImg.onload = () => {
            this.images.titleScreen = titleImg;
            console.log('Title screen image loaded successfully');
        };
        
        // Load menu screen image
        const menuImg = new Image();
        menuImg.src = 'assets/images/backgrounds/menu-screen.png';
        menuImg.onload = () => {
            this.images.menuScreen = menuImg;
            console.log('Menu screen image loaded successfully');
        };
        
        // ADDED: Load game over screen image
        const gameOverImg = new Image();
        gameOverImg.src = 'assets/images/backgrounds/game-over.png';
        gameOverImg.onload = () => {
            this.images.gameOverScreen = gameOverImg;
            console.log('Game over screen image loaded successfully');
        };
        
        // Load menu music
        this.menuMusic = new Audio('assets/audio/music/pinkPonyClub.mp3');
        this.menuMusic.loop = true;
        this.menuMusic.volume = 0.3; // Start at 30% volume
    }
    
    startMusic() {
        if (!this.musicStarted && this.menuMusic) {
            this.menuMusic.play().catch(e => {
                console.log("Music autoplay blocked, will play on next interaction");
            });
            this.musicStarted = true;
        }
    }
    
    handleInput(e) {
        switch(this.gameEngine.currentState) {
            case 'start_screen':
                // Any key advances to main menu
                this.gameEngine.currentState = 'menu';
                this.startMusic(); // Start music when entering menu
                break;
                
            case 'menu':
                this.handleMenuInput(e);
                break;
                
            case 'settings':
                this.handleSettingsInput(e);
                break;
        }
    }
    
    handleMenuInput(e) {
        switch(e.key) {
            case 'ArrowUp':
                this.menuSelection = (this.menuSelection - 1 + this.menuOptions.length) % this.menuOptions.length;
                break;
                
            case 'ArrowDown':
                this.menuSelection = (this.menuSelection + 1) % this.menuOptions.length;
                break;
                
            case 'Enter':
                const selected = this.menuOptions[this.menuSelection];
                if (selected.text === 'Play Game') {
                    // Load the test level and initialize game
                    this.gameEngine.init('data/levels/chicago-level.json').then(success => {
                        if (success) {
                            console.log('Level loaded successfully, starting game');
                            // Game state is already set to PLAYING by init()
                        } else {
                            console.error('Failed to load level');
                        }
                    });
                    // Music continues playing
                } else if (selected.text === 'Settings') {
                    // Open settings
                    this.openSettings();
                } else {
                    // Show "coming soon" message for disabled options
                    this.showMessage = true;
                    this.messageTimer = 180; // 3 seconds at 60fps
                }
                break;
        }
    }
    openSettings() {
        // Create settings screen if needed
        if (!this.settingsScreen) {
            this.settingsScreen = new SettingsScreen(this);
        }
        
        // Store where we came from
        this.previousState = this.gameEngine.currentState;
        
        // Change state to settings
        this.gameEngine.currentState = 'settings';
    }
    
    returnFromSettings() {
        // Return to previous state
        this.gameEngine.currentState = this.previousState || 'menu';
        this.previousState = null;
    }
    
    handleSettingsInput(e) {
        if (this.settingsScreen) {
            this.settingsScreen.handleInput(e);
        }
    }
    update(deltaTime) {
        // Update animations
        this.floatAnimation += deltaTime * 2;
        
        // Update message timer
        if (this.messageTimer > 0) {
            this.messageTimer--;
            if (this.messageTimer === 0) {
                this.showMessage = false;
            }
        }
    }
    
    render() {
        // Don't log every frame - too spammy
        switch(this.gameEngine.currentState) {
            case 'start_screen':
                this.renderStartScreen();
                break;
                
            case 'menu':
                this.renderMainMenu();
                break;
                
            case 'settings':
                if (this.settingsScreen) {
                    this.settingsScreen.render(this.ctx);
                }
                break;
        }
    }
    
    renderStartScreen() {
        // Save the context state
        this.ctx.save();
        
        // Clear canvas with black
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.images.titleScreen) {
            // Draw the title screen image
            this.ctx.drawImage(this.images.titleScreen, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Fallback gradient if image hasn't loaded
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#2a1a3a');
            gradient.addColorStop(0.5, '#6a3a4a');
            gradient.addColorStop(1, '#aa5a3a');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Fallback title text
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('CHICAGO POPE', this.canvas.width/2, 150);
        }
        
        // Draw floating "Press any key" text
        const floatY = Math.sin(this.floatAnimation) * 10;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Press any key to start', this.canvas.width/2, this.canvas.height - 100 + floatY);
        
        // Restore context state
        this.ctx.restore();
    }
    
    renderMainMenu() {
        // Save the context state
        this.ctx.save();
        
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.images.menuScreen) {
            // Draw the menu screen image
            this.ctx.drawImage(this.images.menuScreen, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Fallback gradient
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#1a1a2a');
            gradient.addColorStop(1, '#4a3a3a');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Draw title
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('CHICAGO POPE', this.canvas.width/2, 80);
        
        // Draw menu options on left side
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'left';
        
        this.menuOptions.forEach((option, index) => {
            const x = 100;
            const y = 200 + (index * 60);
            
            // Draw selection indicator
            if (index === this.menuSelection) {
                this.ctx.fillStyle = '#FF6B35';
                this.ctx.fillText('>', x - 30, y);
            }
            
            // Draw option text
            this.ctx.fillStyle = option.enabled ? '#FFFFFF' : '#666666';
            this.ctx.fillText(option.text, x, y);
        });
        
        // Draw "coming soon" message if needed
        if (this.showMessage) {
            // Dark overlay
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(50, this.canvas.height - 150, this.canvas.width - 100, 100);
            
            // Message text
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Still working on that...', this.canvas.width/2, this.canvas.height - 110);
            this.ctx.fillText('why don\'t you try "Play game" instead?', this.canvas.width/2, this.canvas.height - 80);
        }
        
        // Restore context state
        this.ctx.restore();
    }
    
    /**
     * Render game over screen - NEW METHOD
     */
    renderGameOverScreen() {
        // Save context state
        this.ctx.save();
        
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.images.gameOverScreen && this.images.gameOverScreen.complete) {
            // Draw the game over background image
            this.ctx.drawImage(this.images.gameOverScreen, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Fallback dark gradient
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#000000');
            gradient.addColorStop(0.5, '#2a0000');
            gradient.addColorStop(1, '#000000');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Draw "GAME OVER" text
        this.ctx.fillStyle = '#FF0000';
        this.ctx.font = 'bold 72px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'black';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText('GAME OVER', this.canvas.width/2, this.canvas.height/2 - 50);
        
        // Draw options
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Press R to restart level', this.canvas.width/2, this.canvas.height/2 + 50);
        this.ctx.fillText('Press ESC to return to menu', this.canvas.width/2, this.canvas.height/2 + 90);
        
        // Draw final stats
        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillText(`Final Score: ${this.gameEngine.playerStats.score}`, this.canvas.width/2, this.canvas.height/2 + 150);
        this.ctx.fillText(`Tithes Collected: ${this.gameEngine.playerStats.coins}`, this.canvas.width/2, this.canvas.height/2 + 180);
        
        // Restore context
        this.ctx.restore();
    }
}

// Add this to your menu-screens.js file

class SettingsScreen {
    constructor(menuScreens) {
        this.menuScreens = menuScreens;
        
        // Load background image
        this.backgroundImage = new Image();
        this.backgroundImage.src = 'assets/images/backgrounds/settings.png';
        
        this.options = [
            { 
                name: 'Music Volume', 
                type: 'slider', 
                value: 1.0,
                min: 0,
                max: 1,
                step: 0.1
            },
            { 
                name: 'Sound Effects', 
                type: 'slider', 
                value: 1.0,
                min: 0,
                max: 1,
                step: 0.1
            },
            { 
                name: 'Mute All', 
                type: 'toggle', 
                value: false 
            },
            { 
                name: 'Back', 
                type: 'button' 
            }
        ];
        this.selectedOption = 0;
        
        // Load saved settings
        this.loadSettings();
    }
    
    loadSettings() {
        const saved = localStorage.getItem('popeGameSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.options[0].value = settings.musicVolume || 1.0;
            this.options[1].value = settings.sfxVolume || 1.0;
            this.options[2].value = settings.muteAll || false;
            this.applySettings();
        }
    }
    
    saveSettings() {
        const settings = {
            musicVolume: this.options[0].value,
            sfxVolume: this.options[1].value,
            muteAll: this.options[2].value
        };
        localStorage.setItem('popeGameSettings', JSON.stringify(settings));
    }
    
    applySettings() {
        const musicVolume = this.options[2].value ? 0 : this.options[0].value;
        const sfxVolume = this.options[2].value ? 0 : this.options[1].value;
        
        // Apply to menu music
        if (this.menuScreens.menuMusic) {
            this.menuScreens.menuMusic.volume = musicVolume;
        }
        
        // Store for game use
        window.gameSettings = {
            musicVolume: musicVolume,
            sfxVolume: sfxVolume
        };
    }
    
    handleInput(e) {
        const option = this.options[this.selectedOption];
        
        switch(e.key) {
            case 'ArrowUp':
                this.selectedOption = (this.selectedOption - 1 + this.options.length) % this.options.length;
                break;
                
            case 'ArrowDown':
                this.selectedOption = (this.selectedOption + 1) % this.options.length;
                break;
                
            case 'ArrowLeft':
                if (option.type === 'slider') {
                    option.value = Math.max(option.min, option.value - option.step);
                    this.applySettings();
                    this.saveSettings();
                }
                break;
                
            case 'ArrowRight':
                if (option.type === 'slider') {
                    option.value = Math.min(option.max, option.value + option.step);
                    this.applySettings();
                    this.saveSettings();
                }
                break;
                
            case 'Enter':
            case ' ':
                if (option.type === 'toggle') {
                    option.value = !option.value;
                    this.applySettings();
                    this.saveSettings();
                } else if (option.name === 'Back') {
                    this.menuScreens.returnFromSettings();
                }
                break;
                
            case 'Escape':
                this.menuScreens.returnFromSettings();
                break;
        }
    }
    
    render(ctx) {
        // Background image
        if (this.backgroundImage && this.backgroundImage.complete) {
            ctx.drawImage(this.backgroundImage, 0, 0, ctx.canvas.width, ctx.canvas.height);
        } else {
            // Fallback color
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
        
        // Title
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Settings', ctx.canvas.width / 2, 100);
        
        // Options
        this.options.forEach((option, index) => {
            const y = 200 + index * 80;
            const selected = index === this.selectedOption;
            
            // Highlight selected
            if (selected) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(100, y - 35, ctx.canvas.width - 200, 70);
            }
            
            // Option name
            ctx.fillStyle = selected ? 'yellow' : 'white';
            ctx.font = '28px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(option.name, 150, y);
            
            // Option value/control
            if (option.type === 'slider') {
                // Draw slider track
                ctx.fillStyle = '#555';
                ctx.fillRect(450, y - 10, 200, 20);
                
                // Draw slider fill
                ctx.fillStyle = '#4a4';
                const fillWidth = 200 * ((option.value - option.min) / (option.max - option.min));
                ctx.fillRect(450, y - 10, fillWidth, 20);
                
                // Draw slider handle
                ctx.fillStyle = 'white';
                ctx.fillRect(448 + fillWidth, y - 15, 4, 30);
                
                // Show percentage
                ctx.textAlign = 'right';
                ctx.fillText(Math.round(option.value * 100) + '%', 700, y);
                
            } else if (option.type === 'toggle') {
                ctx.textAlign = 'right';
                ctx.fillText(option.value ? 'ON' : 'OFF', 650, y);
            }
        });
        
        // Instructions
        ctx.fillStyle = 'gray';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Use Arrow Keys to adjust, Enter to select, ESC to go back', ctx.canvas.width / 2, ctx.canvas.height - 50);
    }
}
