// DELETE the duplicate updatePlaying method at line 733-770

// The CORRECT updatePlaying method should be at line 138, and should look like this:
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
        
        // Update all enemies - THIS IS THE KEY FIX!
        if (window.enemyManager) {
            window.enemyManager.update();
        }
        
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
