// tiled-converter.js - Converts Tiled JSON format to game format

class TiledConverter {
    constructor() {
        this.tileSize = 32;
        
        // Map Tiled tile IDs to platform types
        // You'll need to define which tiles are which type
        this.tilePlatformTypes = {
            // Solid tiles (brick, concrete, etc)
            1: 'solid', 2: 'solid', 3: 'solid', 4: 'solid',
            9: 'solid', 10: 'solid', 11: 'solid', 12: 'solid',
            17: 'solid', 18: 'solid', 19: 'solid', 20: 'solid',
            
            // One-way platforms
            5: 'oneway', 6: 'oneway', 7: 'oneway', 8: 'oneway',
            
            // Bouncy platforms
            13: 'bouncy_platform', 14: 'bouncy_platform',
            
            // Moving platforms (you'd define these in Tiled with custom properties)
            21: 'platform_r_slow', 22: 'platform_l_slow',
            
            // Add more tile ID mappings as needed
        };
        
        // Map Tiled object types to game entities
        this.objectTypeMap = {
            // Collectibles (GID from your sprite sheet)
            65: { type: 'leaves', category: 'collectible' },
            66: { type: 'tithe', category: 'collectible' },
            67: { type: 'beer', category: 'collectible' },
            68: { type: 'relic', category: 'collectible' },
            
            // Enemies
            69: { type: 'walker', category: 'enemy', config: { variant: 'normal' } },
            70: { type: 'walker', category: 'enemy', config: { variant: 'fast' } },
            71: { type: 'walker', category: 'enemy', config: { variant: 'strong' } },
            72: { type: 'flyer', category: 'enemy', config: { flyPattern: 'sine' } },
            
            // Hazards
            41: { type: 'dibs_chair', category: 'hazard' },
            42: { type: 'construction_cone', category: 'hazard' },
            43: { type: 'rat_hole', category: 'hazard' },
        };
    }
    
    /**
     * Convert Tiled JSON to game format
     */
    convert(tiledData) {
        const converted = {
            // Basic level info
            name: tiledData.properties?.name || 'Unnamed Level',
            width: tiledData.width,
            height: tiledData.height,
            pixelWidth: tiledData.width * this.tileSize,
            pixelHeight: tiledData.height * this.tileSize,
            
            // Default values
            gravity: 1.0,
            wind: { x: 0, y: 0 },
            timeLimit: null,
            weather: null,
            
            // Arrays for game objects
            platforms: [],
            enemies: [],
            collectibles: [],
            hazards: [],
            checkpoints: [],
            decorations: [],
            
            // Parse from Tiled data
            background: this.parseBackgrounds(tiledData),
            playerStart: { x: 100, y: 400 }, // Default, override if found
            goal: {
                type: 'reach_exit',
                position: { x: 3000, y: 544 } // Default, override if found
            },
            
            // Audio
            music: {
                track: tiledData.properties?.music || null,
                bossTrack: null,
                ambient: []
            }
        };
        
        // Process each layer
        tiledData.layers.forEach(layer => {
            switch (layer.type) {
                case 'tilelayer':
                    if (layer.name === 'platforms') {
                        converted.platforms = this.parseTileLayer(layer, tiledData);
                    }
                    break;
                    
                case 'objectgroup':
                    this.parseObjectLayer(layer, converted);
                    break;
                    
                case 'imagelayer':
                    // Already handled in parseBackgrounds
                    break;
            }
        });
        
        return converted;
    }
    
    /**
     * Parse tile layer into platform rectangles
     */
    parseTileLayer(layer, tiledData) {
        const platforms = [];
        const width = layer.width;
        const data = layer.data;
        
        // Track which tiles we've already processed
        const processed = new Set();
        
        for (let y = 0; y < layer.height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                const tileId = data[index];
                
                // Skip empty tiles or already processed
                if (tileId === 0 || processed.has(index)) continue;
                
                // Get platform type from tile ID
                const platformType = this.tilePlatformTypes[tileId] || 'solid';
                
                // Try to create larger rectangles by merging adjacent tiles
                const rect = this.expandRectangle(x, y, width, layer.height, data, processed, tileId);
                
                platforms.push({
                    x: rect.x * this.tileSize,
                    y: rect.y * this.tileSize,
                    width: rect.width * this.tileSize,
                    height: rect.height * this.tileSize,
                    type: platformType,
                    properties: {}
                });
            }
        }
        
        return platforms;
    }
    
    /**
     * Expand a tile into the largest possible rectangle
     */
    expandRectangle(startX, startY, mapWidth, mapHeight, data, processed, tileId) {
        let width = 1;
        let height = 1;
        
        // First expand horizontally
        for (let x = startX + 1; x < mapWidth; x++) {
            const index = startY * mapWidth + x;
            if (data[index] !== tileId || processed.has(index)) break;
            width++;
        }
        
        // Then expand vertically
        outer: for (let y = startY + 1; y < mapHeight; y++) {
            for (let x = startX; x < startX + width; x++) {
                const index = y * mapWidth + x;
                if (data[index] !== tileId || processed.has(index)) {
                    break outer;
                }
            }
            height++;
        }
        
        // Mark all tiles in rectangle as processed
        for (let y = startY; y < startY + height; y++) {
            for (let x = startX; x < startX + width; x++) {
                processed.add(y * mapWidth + x);
            }
        }
        
        return { x: startX, y: startY, width, height };
    }
    
    /**
     * Parse object layer for entities
     */
    parseObjectLayer(layer, converted) {
        layer.objects.forEach(obj => {
            // Tiled uses bottom-left origin for objects, convert to top-left
            const x = obj.x;
            const y = obj.y - (obj.height || 32);
            
            // Check if it's a special object
            if (obj.name === 'playerStart') {
                converted.playerStart = { x, y };
                return;
            }
            
            if (obj.name === 'levelExit' || obj.name === 'pequods') {
                converted.goal.position = { x, y };
                return;
            }
            
            // Map GID to entity type
            const entityDef = this.objectTypeMap[obj.gid];
            if (!entityDef) {
                console.warn('Unknown object GID:', obj.gid);
                return;
            }
            
            // Create entity based on category
            const entity = {
                x: x,
                y: y,
                type: entityDef.type
            };
            
            // Add any custom properties from Tiled
            if (obj.properties) {
                obj.properties.forEach(prop => {
                    entity[prop.name] = prop.value;
                });
            }
            
            // Add to appropriate array
            switch (entityDef.category) {
                case 'enemy':
                    entity.config = entityDef.config || {};
                    converted.enemies.push(entity);
                    break;
                    
                case 'collectible':
                    converted.collectibles.push(entity);
                    break;
                    
                case 'hazard':
                    converted.hazards.push(entity);
                    break;
            }
        });
    }
    
    /**
     * Parse image layers for parallax backgrounds
     */
    parseBackgrounds(tiledData) {
        const backgrounds = { layers: [] };
        
        tiledData.layers.forEach(layer => {
            if (layer.type === 'imagelayer' && layer.visible) {
                backgrounds.layers.push({
                    image: layer.image,
                    speed: layer.parallaxx || 1.0,
                    offsetY: layer.offsety || 0,
                    repeat: layer.repeatx || false
                });
            }
        });
        
        return backgrounds;
    }
}

// Export the TiledConverter class
window.TiledConverter = TiledConverter;
