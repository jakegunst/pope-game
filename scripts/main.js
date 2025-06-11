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

// Player object - will be initialized after loading player.js
let player;

// Temporary platforms for testing
let platforms = [];

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
    
    // Create player instance AFTER physics is ready
    player = new Player(50, canvas.height - 64 - 60);
    
    // Create some test platforms
    platforms = [
        // Ground
        { x: 0, y: canvas.height - 60, width: canvas.width, height: 60, type: 'solid' },
        
        // Some platforms to jump on
        { x: 200, y: 450, width: 100, height: 20, type: 'solid' },
        { x: 400, y: 350, width: 80, height: 20, type: 'oneway' },
        { x: 600, y: 400, width: 120, height: 20, type: 'bouncy_platform' },
        { x: 350, y: 250, width: 60, height: 20, type: 'platform_r_slow' }
    ];
    
    // Set up keyboard event listeners
    window.addEventListener('keydown', (e) => {
        player.handleKeyDown(e.key);
        e.preventDefault(); // Prevent page scrolling with arrow keys
    });
    
    window.addEventListener('keyup', (e) => {
        player.handleKeyUp(e.key);
    });
    
    // Log successful initialization
    console.log('Game initialized successfully!');
    console.log(`Canvas size: ${canvas.width}x${canvas.height}`);
    
    // Start the game loop
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
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
    // Update player
    player.update();
    
    // Apply gravity using physics system
    if (!player.isGrounded) {
        physics.applyGravity(player);
    }
    
    // Reset grounded state (will be set by collisions)
    player.setGrounded(false);
    
    // Check collisions with all platforms
    platforms.forEach(platform => {
        const collision = collisionDetection.checkRectCollision(player, platform);
        if (collision) {
            collisionDetection.handlePlatformCollision(player, platform, collision);
        }
    });
    
    // Update moving platforms
    platforms.forEach(platform => {
        const platType = collisionDetection.platformTypes[platform.type];
        if (platType && platType.dirX !== undefined) {
            // Move the platform
            platform.x += platType.dirX * platType.speed;
            
            // Reverse at boundaries (temporary)
            if (platform.x < 0 || platform.x + platform.width > canvas.width) {
                platType.dirX *= -1;
            }
        }
    });
}

/**
 * Draw all game elements
 * This is called 60 times per second
 */
function draw() {
    // Draw platforms
    platforms.forEach(platform => {
        // Different colors for different platform types
        switch(platform.type) {
            case 'bouncy_platform':
            case 'super_bouncy_platform':
                ctx.fillStyle = '#FF69B4';  // Hot pink for bouncy
                break;
            case 'oneway':
                ctx.fillStyle = '#87CEEB';  // Sky blue for one-way
                break;
            case 'platform_r_slow':
            case 'platform_l_slow':
                ctx.fillStyle = '#FFD700';  // Gold for moving
                break;
            default:
                ctx.fillStyle = '#654321';  // Brown for solid
        }
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
    
    // Draw player
    player.draw(ctx);
    
    // Draw collision debug info
    collisionDetection.drawDebug(ctx, [...platforms, player]);
    
    // Draw debug info (FPS and coordinates)
    drawDebugInfo();
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
