// tiled-converter.js - Converts Tiled JSON format to game format

class TiledConverter {
    constructor() {
        this.tileSize = 32;
        
        // Map Tiled tile IDs to platform types
        this.tilePlatformTypes = {
            // Solid tiles (ruins)
            1: 'solid', 2: 'solid', 3: 'solid', 4: 'solid',
            
            // One-way platforms (tree branches)
            9: 'oneway', 10: 'oneway', 11: 'oneway', 12: 'oneway',
            
            // Solid tiles (ground)
            17: 'solid', 18: 'solid', 19: 'solid', 20: 'solid',
            
            // Bouncy platforms
            41: 'bouncy_platform', 42: 'very_bouncy_platform',
            
            // Falling platform
            49: 'falling_platform'
        };
        
        // Map Tiled object types to game entities
        this.objectTypeMap = {
            // Collectibles
            5: { type: 'tithe', category: 'collectible' },
            6: { type: 'beer', category: 'collectible' },
            7: { type: 'leaves', category: 'collectible' },
            8: { type: 'relic', category: 'collectible' },
            
            // Enemies
            57: { type: 'flyer', category: 'enemy', config: { flyPattern: 'sine' } },
            58: { type: 'walker', category: 'enemy', config: { variant: 'normal' } },
            59: { type: 'walker', category: 'enemy', config: { variant: 'fast' } },
            60: { type: 'walker', category: 'enemy', config: { variant: 'strong' } },
            
            // Hazards
            43: { type: 'damage_tile', category: 'hazard', config: { damage: 25 } },
            44: { type: 'death_tile', category: 'hazard', config: { damage: 100 } },
            52: { type: 'bottomless_pit', category: 'hazard', config: { instant_death: true } },
            
            // Special tiles
            50: { type: 'level_exit', category: 'special' },
            51: { type: 'player_spawn', category: 'special' }
        };
        
        // Track moving platform pairs
        this.movingPlatformPairs = new Map();
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
            movingPlatforms: [],
            
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
                    if (layer.name === 'Platforms' || layer.name === 'platforms') {
                        converted.platforms = this.parseTileLayer(layer, tiledData);
                    } else if (layer.name === 'Hazards' || layer.name === 'hazards') {
                        // Parse hazard tiles separately
                        this.parseHazardTiles(layer, converted);
                    } else {
                        // Check any other tile layer for special tiles (exit, spawn, etc.)
                        this.parseHazardTiles(layer, converted);
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
        
        // Process moving platform pairs
        this.processMovingPlatforms(converted);
        
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
                
                // Skip tiles that aren't platforms
                if (!this.tilePlatformTypes[tileId]) continue;
                
                // Get platform type from tile ID
                const platformType = this.tilePlatformTypes[tileId];
                
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
     * Parse hazard tiles from a tile layer
     */
    parseHazardTiles(layer, converted) {
        const width = layer.width;
        const data = layer.data;
        
        for (let y = 0; y < layer.height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                const tileId = data[index];
                
                if (tileId === 0) continue;
                
                // Check for special tiles (exit and spawn)
                if (tileId === 50) {
                    console.log('Found exit tile at:', x * this.tileSize, y * this.tileSize);
                    converted.goal.position = { 
                        x: x * this.tileSize, 
                        y: y * this.tileSize 
                    };
                    continue;
                } else if (tileId === 51) {
                    console.log('Found player spawn tile at:', x * this.tileSize, y * this.tileSize);
                    converted.playerStart = { 
                        x: x * this.tileSize, 
                        y: y * this.tileSize 
                    };
                    continue;
                }
                
                // Check if it's a hazard tile
                if (tileId === 43 || tileId === 44 || tileId === 52) {
                    const hazardDef = this.objectTypeMap[tileId];
                    if (hazardDef && hazardDef.category === 'hazard') {
                        converted.hazards.push({
                            x: x * this.tileSize,
                            y: y * this.tileSize,
                            width: this.tileSize,
                            height: this.tileSize,
                            type: hazardDef.type,
                            config: hazardDef.config || {}
                        });
                    }
                }
                
                // Check for moving platform markers
                if (tileId >= 25 && tileId <= 28) {
                    // Start markers
                    const direction = ['right', 'left', 'up', 'down'][tileId - 25];
                    this.movingPlatformPairs.set(`${x},${y}`, {
                        type: 'start',
                        direction: direction,
                        x: x * this.tileSize,
                        y: y * this.tileSize
                    });
                } else if (tileId >= 33 && tileId <= 36) {
                    // End markers
                    const direction = ['right', 'left', 'up', 'down'][tileId - 33];
                    this.movingPlatformPairs.set(`${x},${y}`, {
                        type: 'end',
                        direction: direction,
                        x: x * this.tileSize,
                        y: y * this.tileSize
                    });
                }
            }
        }
    }
    
    /**
     * Process moving platform pairs
     */
    processMovingPlatforms(converted) {
        const starts = [];
        const ends = [];
        
        // Separate starts and ends
        this.movingPlatformPairs.forEach(marker => {
            if (marker.type === 'start') {
                starts.push(marker);
            } else {
                ends.push(marker);
            }
        });
        
        // Match starts with ends based on direction
        starts.forEach(start => {
            // Find the nearest end marker with the same direction
            const matchingEnds = ends.filter(end => end.direction === start.direction);
            
            if (matchingEnds.length > 0) {
                // Find the closest one
                let closestEnd = matchingEnds[0];
                let minDistance = Math.abs(closestEnd.x - start.x) + Math.abs(closestEnd.y - start.y);
                
                matchingEnds.forEach(end => {
                    const distance = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestEnd = end;
                    }
                });
                
                // Create moving platform
                converted.movingPlatforms.push({
                    x: start.x,
                    y: start.y,
                    width: this.tileSize * 2, // Default platform size
                    height: this.tileSize,
                    startX: start.x,
                    startY: start.y,
                    endX: closestEnd.x,
                    endY: closestEnd.y,
                    speed: 100, // pixels per second
                    direction: start.direction,
                    type: 'moving_platform'
                });
            }
        });
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
        
        // Check for rectangle objects (no gid means it's a shape, not a tile)
        if (!obj.gid) {
            // Check if it's a platform by name or type property
            if (obj.name === 'platform' || obj.type === 'platform' || 
                (obj.properties && obj.properties.find(p => p.name === 'platformType'))) {
                
                const platform = {
                    x: x,
                    y: y,
                    width: obj.width,
                    height: obj.height,
                    type: 'solid' // default type
                };
                
                // Process custom properties
                if (obj.properties) {
                    const props = {};
                    obj.properties.forEach(prop => {
                        props[prop.name] = prop.value;
                    });
                    
                    // Handle platform type
                    if (props.platformType) {
                        platform.type = props.platformType;
                    }
                    
                    // Handle moving platform properties
                    if (props.moveDistance || props.moveSpeed) {
                        platform.moving = true;
                        platform.moveDistance = props.moveDistance || 200;
                        platform.moveSpeed = props.moveSpeed || 100;
                        platform.moveDirection = props.moveDirection || 'horizontal';
                        
                        // Calculate end positions based on direction
                        if (platform.moveDirection === 'horizontal') {
                            platform.startX = x;
                            platform.endX = x + platform.moveDistance;
                            platform.startY = y;
                            platform.endY = y;
                        } else {
                            platform.startX = x;
                            platform.endX = x;
                            platform.startY = y;
                            platform.endY = y + platform.moveDistance;
                        }
                    }
                    
                    // Store all properties for future use
                    platform.properties = props;
                }
                
                converted.platforms.push(platform);
                console.log('Added platform from object:', platform);
                return;
            }
        }
        
        // Check for special tiles FIRST (before checking objectTypeMap)
        if (obj.gid === 50) {
            console.log('Found exit at:', x, y);
            converted.goal.position = { x, y };
            return;
        } else if (obj.gid === 51) {
            console.log('Found player spawn at:', x, y);
            converted.playerStart = { x, y };
            return;
        }
        
        // Check if it's a special object by name
        if (obj.name === 'playerStart' || obj.name === 'player_spawn') {
            converted.playerStart = { x, y };
            return;
        }
        
        if (obj.name === 'levelExit' || obj.name === 'pequods' || obj.name === 'level_exit') {
            converted.goal.position = { x, y };
            return;
        }
        
        // Only check objectTypeMap if obj has a gid
        if (obj.gid) {
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
                    entity.config = entityDef.config || {};
                    converted.hazards.push(entity);
                    break;
            }
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
