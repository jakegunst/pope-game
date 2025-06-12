// player.js - Handles all player movement, input, and state

class Player {
    constructor(x, y) {
        // Position and dimensions
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 64;
        
        // Movement properties
        this.speedX = 0;  // Current horizontal velocity
        this.speedY = 0;  // Current vertical velocity
        
        // State machine
        this.state = 'idle';  // Current state
        this.facingRight = true;  // Which direction we're facing
        this.idleTimer = 0;  // For tracking long idle state
        
        // Jump mechanics
        this.isGrounded = false;
        this.coyoteTime = 0;  // Frames since leaving ground
        this.coyoteTimeMax = 6;  // Allow jump for 6 frames after leaving platform
        this.hasReleasedJump = true;  // Prevent jump key holding
        
        // Visual properties
        this.color = '#D2B48C';  // Tan color
        
        // Input states
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            space: false
        };
    }
    
    /**
     * Handle keyboard input
     * Called from main.js event listeners
     */
    handleKeyDown(key) {
        switch(key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.keys.left = true;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.keys.right = true;
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.keys.up = true;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.keys.down = true;
                break;
            case ' ':  // Spacebar
                this.keys.space = true;
                break;
        }
    }
    
    handleKeyUp(key) {
        switch(key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.keys.left = false;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.keys.right = false;
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.keys.up = false;
                this.hasReleasedJump = true;  // Can jump again
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.keys.down = false;
                break;
            case ' ':  // Spacebar
                this.keys.space = false;
                break;
        }
    }
    
    /**
     * Update player physics and state
     * Called every frame from main.js
     */
    update() {
        // Get input direction
        let inputDirection = 0;
        if (this.keys.left) inputDirection = -1;
        if (this.keys.right) inputDirection = 1;
        
        // Update facing direction
        if (inputDirection !== 0) {
            this.facingRight = inputDirection > 0;
        }
        
        // Use physics system for movement
        window.physics.applyMovement(this, inputDirection);
        
        // Apply gravity - THIS WAS MISSING!
        window.physics.applyGravity(this);
        
        // Handle jumping
        if (this.keys.up && this.hasReleasedJump) {
            // Can jump if grounded OR within coyote time
            if (this.isGrounded || this.coyoteTime < this.coyoteTimeMax) {
                this.jump();
                this.hasReleasedJump = false;
            }
        }
        
        // Update coyote time
        if (!this.isGrounded) {
            this.coyoteTime++;
        } else {
            this.coyoteTime = 0;
        }
        
        // Apply movement
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Keep player on screen (temporary boundaries)
        this.x = Math.max(0, Math.min(960 - this.width, this.x));
        
        // Update state machine
        this.updateState();
        
        // Handle idle timer
        if (this.state === 'idle') {
            this.idleTimer++;
        } else {
            this.idleTimer = 0;
        }
    }
    
    /**
     * Make the player jump
     */
    jump() {
        this.speedY = window.physics.playerJumpPower;
        this.isGrounded = false;
    }
    
    /**
     * Update the player's state based on current conditions
     */
    updateState() {
        // Determine current state
        if (this.speedY < -0.5) {  // Add threshold for jumping
            this.state = 'jumping';
        } else if (this.speedY > 0.5 && !this.isGrounded) {  // Add threshold for falling
            this.state = 'falling';
        } else if (Math.abs(this.speedX) > 0.5) {  // Already has threshold
            this.state = 'walking';
        } else if (this.idleTimer > 300) {  // 5 seconds at 60fps
            this.state = 'longIdle';
        } else if (this.isGrounded) {  // Make sure we're grounded for idle
            this.state = 'idle';
        } else {
            // Default to falling if not grounded and not moving much
            this.state = Math.abs(this.speedY) < 0.5 ? 'idle' : 'falling';
        }
    }
    
    /**
     * Draw the player
     * Called every frame from main.js
     */
    draw(ctx) {
        // Draw main body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw eye to show facing direction
        ctx.fillStyle = 'black';
        let eyeX = this.facingRight ? 
            this.x + this.width - 8 : 
            this.x + 4;
        let eyeY = this.y + 15;
        ctx.fillRect(eyeX, eyeY, 4, 4);
        
        // Draw state indicator (temporary - for debugging)
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.fillText(this.state, this.x - 10, this.y - 5);
    }
    
    /**
     * Set grounded state (called from collision detection)
     */
    setGrounded(grounded) {
        this.isGrounded = grounded;
        if (grounded) {
            this.speedY = 0;
        }
    }
}

// Export the Player class so main.js can use it
// In a browser environment, we'll attach it to window
window.Player = Player;
