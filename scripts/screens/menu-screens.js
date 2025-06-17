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
            { text: 'Settings', enabled: false },
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
            menuScreen: null
        };
        
        // Audio
        this.menuMusic = null;
        this.musicStarted = false;
        
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
                    this.gameEngine.init('data/levels/test-level-enemies.json').then(success => {
                        if (success) {
                            console.log('Level loaded successfully, starting game');
                            // Game state is already set to PLAYING by init()
                        } else {
                            console.error('Failed to load level');
                        }
                    });
                    // Music continues playing
                } else {
                    // Show "coming soon" message for disabled options
                    this.showMessage = true;
                    this.messageTimer = 180; // 3 seconds at 60fps
                }
                break;
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
        }
    }
    
    renderStartScreen() {
        // Save the context state
        this.ctx.save();
        
        // TEST: Draw a red rectangle to see if anything renders
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(100, 100, 200, 200);
        
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
}
