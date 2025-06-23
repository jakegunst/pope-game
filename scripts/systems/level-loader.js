// level-loader.js - Loads and manages level data

class LevelLoader {
    constructor() {
        // Tile size for grid-based placement
        this.tileSize = 32;
        
        // Current level data
        this.currentLevel = null;
        
        // Level completion types
        this.goalTypes = {
            reach_exit: 'reach',          // Just reach the exit
            collect_and_exit: 'collect',   // Collect all required items first
            defeat_all: 'defeat',          // Defeat all enemies
            time_trial: 'time',            // Complete within time limit
            boss_fight: 'boss'             // Defeat the boss
        };
        
        // Parallax layer definitions
        this.parallaxLayers = [];
        
        // Level state (for respawning)
        this.checkpoints = [];
        this.collectedItems = new Set();  // Persists through death
        this.currentCheckpoint = 0;
    }
    
    // Add this to the beginning of your level-loader.js, after the constructor

    /**
     * Detect if level data is from Tiled
     */
    isTiledFormat(levelData) {
        // Tiled levels have these specific properties
        return levelData.layers !== undefined && 
               levelData.tilewidth !== undefined &&
               levelData.orientation !== undefined;
    }
    
    /**
     * Load a level from JSON file (updated to support Tiled)
     * @param {string} levelPath - Path to the level JSON file
     * @returns {Promise} Resolves with level data
     */
    async loadLevel(levelPath) {
        try {
            const response = await fetch(levelPath);
            const levelData = await response.json();
            
            // Check if it's Tiled format
            if (this.isTiledFormat(levelData)) {
                console.log('Detected Tiled format, converting...');
                
                // Convert Tiled format to game format
                const converter = new TiledConverter();
                const convertedLevel = converter.convert(levelData);
                
                // Process as normal
                this.currentLevel = this.processLevel(convertedLevel);
            } else {
                // Validate level data
                if (!this.validateLevel(levelData)) {
                    throw new Error('Invalid level format');
                }
                
                // Process the level
                this.currentLevel = this.processLevel(levelData);
            }
            
            // Initialize level-specific features
            this.initializeParallax(this.currentLevel.background);
            this.initializeCheckpoints(this.currentLevel.checkpoints);
            this.initializeWeather(this.currentLevel.weather);
            
            console.log(`Level loaded: ${this.currentLevel.name}`);
            return this.currentLevel;
            
        } catch (error) {
            console.error('Failed to load level:', error);
            return null;
        }
    }
    
    /**
     * Load a level from JSON file
     * @param {string} levelPath - Path to the level JSON file
     * @returns {Promise} Resolves with level data
     */
    async loadLevel(levelPath) {
        try {
            const response = await fetch(levelPath);
            const levelData = await response.json();
            
            // Validate level data
            if (!this.validateLevel(levelData)) {
                throw new Error('Invalid level format');
            }
            
            // Process the level
            this.currentLevel = this.processLevel(levelData);
            
            // Initialize level-specific features
            this.initializeParallax(this.currentLevel.background);
            this.initializeCheckpoints(this.currentLevel.checkpoints);
            this.initializeWeather(this.currentLevel.weather);
            
            console.log(`Level loaded: ${this.currentLevel.name}`);
            return this.currentLevel;
            
        } catch (error) {
            console.error('Failed to load level:', error);
            return null;
        }
    }
    
    /**
     * Process level data for both grid and pixel coordinates
     * Compatible with Tiled export format
     */
    processLevel(rawLevel) {
        const processed = {
            name: rawLevel.name || 'Unnamed Level',
            width: rawLevel.width || 30,  // In tiles
            height: rawLevel.height || 20, // In tiles
            pixelWidth: (rawLevel.width || 30) * this.tileSize,
            pixelHeight: (rawLevel.height || 20) * this.tileSize,
            
            // Goal configuration
            goal: {
                type: rawLevel.goal?.type || 'reach_exit',
                requirements: rawLevel.goal?.requirements || {},
                position: this.convertPosition(rawLevel.goal?.position)
            },
            
            // Visual settings
            tileset: rawLevel.tileset || 'peru-tileset',
            background: rawLevel.background || {},
            
            // Audio settings
            music: {
                track: rawLevel.music?.track || null,
                bossTrack: rawLevel.music?.bossTrack || null,
                ambient: rawLevel.music?.ambient || []
            },
            
            // Physics modifications
            gravity: rawLevel.gravity || 1.0,  // Multiplier
            wind: rawLevel.wind || { x: 0, y: 0 },
            
            // Level mechanics
            timeLimit: rawLevel.timeLimit || null,  // In seconds
            weather: rawLevel.weather || null,
            
            // Convert all object positions
            platforms: this.convertPlatforms(rawLevel.platforms || []),
            enemies: this.convertObjects(rawLevel.enemies || []),
            collectibles: this.convertObjects(rawLevel.collectibles || []),
            hazards: this.convertObjects(rawLevel.hazards || []),
            checkpoints: this.convertObjects(rawLevel.checkpoints || []),
            decorations: this.convertObjects(rawLevel.decorations || []),
            
            // Player start position
            playerStart: this.convertPosition(rawLevel.playerStart || { x: 2, y: 15 })
        };
        
        return processed;
    }
    
    /**
     * Convert grid or pixel coordinates to pixels
     * Supports both formats for Tiled compatibility
     */
    convertPosition(pos) {
        if (!pos) return { x: 0, y: 0 };
        
        // If position has 'tile' property, it's grid-based
        if (pos.tile !== undefined) {
            return {
                x: pos.tile.x * this.tileSize,
                y: pos.tile.y * this.tileSize
            };
        }
        
        // If position has x,y less than 100, assume it's grid coordinates
        if (pos.x < 100 && pos.y < 100 && !pos.pixel) {
            return {
                x: pos.x * this.tileSize,
                y: pos.y * this.tileSize
            };
        }
        
        // Otherwise it's already in pixels
        return { x: pos.x || 0, y: pos.y || 0 };
    }
    
    /**
     * Convert platform data with special handling for sizes
     * FIXED: Don't multiply pixel values by tile size
     */
    convertPlatforms(platforms) {
        return platforms.map(platform => {
            const pos = this.convertPosition(platform);
            
            // Check if the platform explicitly says it's in tiles
            let width = platform.width || 1;
            let height = platform.height || 1;
            
            // Only convert to pixels if explicitly marked as tiles
            // or if the values are very small (less than 5)
            if (platform.inTiles || (width < 5 && height < 5)) {
                width *= this.tileSize;
                height *= this.tileSize;
            }
            // Otherwise, assume the values are already in pixels
            // This fixes the bug where height:32 was being multiplied by 32
            
            return {
                x: pos.x,
                y: pos.y,
                width: width,
                height: height,
                type: platform.type || 'solid',
                properties: platform.properties || {}
            };
        });
    }
    
    /**
     * Convert general objects (enemies, items, etc)
     */
    convertObjects(objects) {
        return objects.map(obj => {
            const pos = this.convertPosition(obj);
            return {
                ...obj,
                x: pos.x,
                y: pos.y
            };
        });
    }
    
    /**
     * Initialize parallax background layers
     */
    initializeParallax(bgConfig) {
        this.parallaxLayers = [];
        
        if (bgConfig.layers) {
            bgConfig.layers.forEach(layer => {
                this.parallaxLayers.push({
                    image: layer.image,
                    speed: layer.speed || 0.5,  // Relative to camera
                    offsetX: 0,
                    offsetY: layer.offsetY || 0,
                    repeat: layer.repeat !== false,  // Default true
                    animated: layer.animated || false,
                    animations: layer.animations || []
                });
            });
        }
    }
    
    /**
     * Initialize checkpoint system
     */
    initializeCheckpoints(checkpoints) {
        this.checkpoints = checkpoints;
        this.currentCheckpoint = 0;
        
        // Sort checkpoints by X position
        this.checkpoints.sort((a, b) => a.x - b.x);
    }
    
    /**
     * Initialize weather effects
     */
    initializeWeather(weather) {
        if (!weather) return;
        
        // Weather can be: rain, snow, fog, wind, etc
        window.weatherSystem = {
            type: weather.type,
            intensity: weather.intensity || 1,
            windEffect: weather.windEffect || false,
            particles: []
        };
    }
    
    /**
     * Validate level data structure
     */
    validateLevel(levelData) {
        // Basic validation
        if (!levelData) return false;
        
        // Check required fields
        const required = ['name'];
        for (let field of required) {
            if (!levelData[field]) {
                console.warn(`Missing required field: ${field}`);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Get spawn position (checkpoint or start)
     */
    getSpawnPosition() {
        if (this.currentCheckpoint > 0 && this.checkpoints[this.currentCheckpoint - 1]) {
            return { ...this.checkpoints[this.currentCheckpoint - 1] };
        }
        return { ...this.currentLevel.playerStart };
    }
    
    /**
     * Update checkpoint when player reaches one
     */
    updateCheckpoint(playerX) {
        for (let i = this.currentCheckpoint; i < this.checkpoints.length; i++) {
            if (playerX >= this.checkpoints[i].x) {
                this.currentCheckpoint = i + 1;
                console.log('Checkpoint reached!');
                return true;
            }
        }
        return false;
    }
    
    /**
     * Check if level goal is complete
     */
    checkGoalComplete() {
        const goal = this.currentLevel.goal;
        
        switch (goal.type) {
            case 'reach_exit':
                // Check if player reached exit position
                return false;  // Will be implemented with player position
                
            case 'collect_and_exit':
                // Check if all required items collected
                const required = goal.requirements.collectibles || [];
                return required.every(item => this.collectedItems.has(item));
                
            case 'defeat_all':
                // Check if all enemies defeated
                return window.enemies?.length === 0;
                
            case 'time_trial':
                // Handled by game engine timer
                return false;
                
            default:
                return false;
        }
    }
}

// Export the LevelLoader class
window.LevelLoader = LevelLoader;
