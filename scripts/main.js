// main.js - The main entry point for Pope Game
// This file sets up the game canvas and starts the game loop

// Wait for the page to fully load before starting
window.addEventListener('load', init);

// Global variables for our game
let canvas;
let ctx; // ctx stands for "context" - our drawing tool
let lastTime = 0; // For calculating FPS
let fps = 0; // Frames per second counter
let physics; // Physics system
let collisionDetection; // Collision system
let gameEngine; // Main game engine
let enemyManager; // Enemy management system

// Player object - will be initialized after loading player.js
let player;

/**
 * Initialize the game
 * This runs once when the page loads
 */
function init() {
    // Find our canvas element by its ID
    canvas = document.getElementById('gameCanvas');
    
    // Check if canvas is supported (it should be in all modern browsers)
    if (!canvas) {
        alert('Canvas not supported! Please use a modern browser.');
        console.log('Canvas element not found or not supported');
        return;
    }
    
    // Get the drawing context - this is what we use to draw
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 960;
    canvas.height = 640;
    
    // Create physics system FIRST
    window.physics = new Physics(); // Make it globally accessible immediately
    physics = window.physics; // Keep local reference too
    
    // Create collision detection system
    window.collisionDetection = new CollisionDetection();
    collisionDetection = window.collisionDetection;
    
    // Create enemy manager
    window.enemyManager = new EnemyManager();
    enemyManager = window.enemyManager;

    // Add this to your main.js file where you create other managers:
    // Create the collectibles manager
    window.collectiblesManager = new CollectiblesManager();
    
    // Create player instance AFTER physics is ready
    player = new Player(50, canvas.height - 64 - 60);
    window.player = player; // Make player globally accessible for enemies
    
    // Create game engine
    gameEngine = new GameEngine(canvas, ctx);
    window.gameEngine = gameEngine;
    
    // IMPORTANT: Create and attach menu screens BEFORE starting the game loop
    gameEngine.menuScreens = new MenuScreens(gameEngine);
    
    // Set up keyboard event listeners AFTER game engine exists
    window.addEventListener('keydown', (e) => {
        // Only handle player input when playing (not in menus)
        if (gameEngine.currentState === gameEngine.states.PLAYING && !gameEngine.debug.freeCamera) {
            player.handleKeyDown(e.key);
        }
        // Don't prevent default for debug keys
        if (!e.key.startsWith('F')) {
            e.preventDefault();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        // Only handle player input when playing (not in menus)
        if (gameEngine.currentState === gameEngine.states.PLAYING && !gameEngine.debug.freeCamera) {
            player.handleKeyUp(e.key);
        }
    });
    
    // DON'T load the test level here - let the menu handle it!
    // The menu will call gameEngine.init() when "Play Game" is selected
    
    // Start the game loop immediately
    console.log('Game initialized successfully!');
    console.log(`Canvas size: ${canvas.width}x${canvas.height}`);
    gameLoop(0);
}

/**
 * Main game loop - runs 60 times per second
 * @param {number} currentTime - Time in milliseconds
 */
function gameLoop(currentTime) {
    // Calculate FPS (frames per second)
    if (lastTime !== 0) {
        fps = Math.round(1000 / (currentTime - lastTime));
    }
    lastTime = currentTime;
    
    // Clear the entire canvas for fresh drawing
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update game logic
    update();
    
    // Draw everything
    draw();
    
    // Request next frame (this creates our 60 FPS loop)
    requestAnimationFrame(gameLoop);
}

/**
 * Update all game logic
 * This is called 60 times per second
 */
function update() {
    // Let game engine handle everything
    gameEngine.update();
    
    // Only update player and physics when actually playing
    if (gameEngine.currentState === gameEngine.states.PLAYING) {
        // Update player (physics are now applied inside player.update())
        player.update();
        
        // Get platforms from current level
        const levelPlatforms = gameEngine.currentLevel ? 
            gameEngine.currentLevel.platforms : [];
        
        // Check collisions with all platforms for PLAYER ONLY
        levelPlatforms.forEach(platform => {
            const collision = collisionDetection.checkRectCollision(player, platform);
            if (collision) {
                collisionDetection.handlePlatformCollision(player, platform, collision);
            }
        });
        
        // Update moving platforms
        levelPlatforms.forEach(platform => {
            const platType = collisionDetection.platformTypes[platform.type];
            if (platType && platType.dirX !== undefined) {
                // Move the platform
                platform.x += platType.dirX * platType.speed;
                
                // Reverse at boundaries (temporary)
                if (platform.x < 0 || platform.x + platform.width > gameEngine.currentLevel.pixelWidth) {
                    platType.dirX *= -1;
                }
            }
        });
    }
}

/**
 * Draw all game elements
 * This is called 60 times per second
 */
function draw() {
    // Let game engine handle all rendering
    gameEngine.render();
    
    // Draw debug info (FPS) - now part of game engine HUD
    if (gameEngine.debug.showStats && gameEngine.currentState === gameEngine.states.PLAYING) {
        ctx.fillStyle = 'lime';
        ctx.font = '16px Arial';
        ctx.fillText(`FPS: ${fps}`, 10, 110);
    }
}

/**
 * Draw debug information on screen
 * This helps us see what's happening in the game
 */
function drawDebugInfo() {
    // Set text properties
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    
    // Draw FPS counter in top-left corner
    ctx.fillText(`FPS: ${fps}`, 10, 20);
    
    // Draw player coordinates below FPS
    ctx.fillText(`Player X: ${player.x}`, 10, 40);
    ctx.fillText(`Player Y: ${player.y}`, 10, 60);
}

// Note: In the next phase, we'll move player code to player.js
// and import it here. For now, everything is in main.js to keep it simple.
