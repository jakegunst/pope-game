// main.js - The main entry point for Pope Game
// This file sets up the game canvas and starts the game loop

// Wait for the page to fully load before starting
window.addEventListener('load', init);

// Global variables for our game
let canvas;
let ctx; // ctx stands for "context" - our drawing tool
let lastTime = 0; // For calculating FPS
let fps = 0; // Frames per second counter

// Player object - temporary until we create player.js
let player = {
    x: 50,          // Start 50 pixels from left edge
    y: 0,           // Will be set once canvas loads
    width: 32,      // Player width in pixels
    height: 64,     // Player height in pixels  
    color: '#D2B48C' // Tan color in hex code
};

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
    
    // Set player starting position (bottom-left, but above ground)
    player.y = canvas.height - player.height - 60; // 60 pixels up from bottom for ground
    
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
    
    // Draw everything
    draw();
    
    // Request next frame (this creates our 60 FPS loop)
    requestAnimationFrame(gameLoop);
}

/**
 * Draw all game elements
 * This is called 60 times per second
 */
function draw() {
    // Draw ground line (simple brown line for now)
    ctx.strokeStyle = '#654321'; // Brown color
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 60); // Start line 60 pixels from bottom
    ctx.lineTo(canvas.width, canvas.height - 60); // Draw across screen
    ctx.stroke();
    
    // Draw player rectangle
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw debug info (FPS and coordinates)
    drawDebugInfo();
}

/**
 * Draw debug information on screen
 * This helps us see what's happening in the game
 */
function drawDebugInfo() {
    // Set text properties
    ctx.fillStyle = 'black';  // Changed to black so it shows on light background
    ctx.font = '16px Arial';
    
    // Draw FPS counter in top-left corner
    ctx.fillText(`FPS: ${fps}`, 10, 20);
    
    // Draw player coordinates below FPS
    ctx.fillText(`Player X: ${player.x}`, 10, 40);
    ctx.fillText(`Player Y: ${player.y}`, 10, 60);
}

// Note: In the next phase, we'll move player code to player.js
// and import it here. For now, everything is in main.js to keep it simple.
