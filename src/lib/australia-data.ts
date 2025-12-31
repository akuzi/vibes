export interface TerrainType {
  id: string;
  name: string;
  color: string;
  height: number;
}

export interface VoxelData {
  x: number;
  z: number;
  y: number; // Stacked voxel layer
  terrainType: TerrainType;
  elevation: number;
}

export const TERRAIN_TYPES: TerrainType[] = [
  { id: 'water', name: 'Ocean', color: '#006994', height: 0 },
  { id: 'coastal', name: 'Coastal', color: '#90EE90', height: 1 },
  { id: 'desert', name: 'Desert', color: '#F4A460', height: 2 },
  { id: 'outback', name: 'Outback', color: '#CD853F', height: 3 },
  { id: 'forest', name: 'Forest', color: '#228B22', height: 4 },
  { id: 'mountain', name: 'Mountain', color: '#8B4513', height: 5 },
  { id: 'snow', name: 'Snow', color: '#FFFFFF', height: 6 },
  { id: 'city', name: 'City', color: '#696969', height: 2 },
];

// Australia bounding box (approximate)
export const AUSTRALIA_BOUNDS = {
  north: -10.0, // Top of Australia
  south: -44.0, // Bottom of Tasmania
  east: 154.0,  // East coast
  west: 113.0,  // West coast
};

// Grid resolution (20km x 20km voxels)
export const GRID_RESOLUTION = 0.18; // degrees (roughly 20km)
export const ELEVATION_PER_VOXEL = 1000; // feet per voxel layer
export const FEET_TO_METERS = 0.3048;

export async function fetchElevationData(lat: number, lon: number): Promise<number> {
  try {
    // Using OpenTopography API for elevation data
    const apiKey = process.env.OPENTOPOGRAPHY_API_KEY || 'demo';
    const response = await fetch(
      `https://portal.opentopography.org/API/astergdem?demtype=ASTGTM&south=${lat}&north=${lat + 0.1}&west=${lon}&east=${lon + 0.1}&outputFormat=GTiff&API_Key=${apiKey}`
    );
    
    if (!response.ok) {
      // Fallback to a simple elevation model based on latitude/longitude
      return getFallbackElevation(lat, lon);
    }
    
    // For now, return fallback data since API requires registration
    return getFallbackElevation(lat, lon);
  } catch (error) {
    console.warn('Elevation API failed, using fallback:', error);
    return getFallbackElevation(lat, lon);
  }
}

function getFallbackElevation(lat: number, lon: number): number {
  // More realistic elevation model for Australia
  
  // Great Dividing Range (east coast mountains) - peaks around 2000m
  const greatDividingRange = Math.exp(-Math.pow((lon - 150) / 5, 2)) * Math.exp(-Math.pow((lat + 25) / 10, 2)) * 2000;
  
  // Central Australia (desert plateau) - mostly 200-600m
  const centralPlateau = Math.exp(-Math.pow((lat + 25) / 8, 2)) * Math.exp(-Math.pow((lon - 135) / 15, 2)) * 400;
  
  // Western Australia (plateau) - mostly 300-500m
  const westernPlateau = Math.exp(-Math.pow((lon - 120) / 8, 2)) * Math.exp(-Math.pow((lat + 25) / 12, 2)) * 400;
  
  // Tasmania (mountainous) - peaks around 1600m
  const tasmania = Math.exp(-Math.pow((lat + 42) / 2, 2)) * Math.exp(-Math.pow((lon - 147) / 3, 2)) * 1600;
  
  // Northern Territory (Arnhem Land) - mostly 100-300m
  const arnhemLand = Math.exp(-Math.pow((lat + 12) / 3, 2)) * Math.exp(-Math.pow((lon - 135) / 5, 2)) * 200;
  
  // Add some noise for realism (much smaller)
  const noise = (Math.sin(lat * 20) * Math.cos(lon * 20) + Math.sin(lat * 10) * Math.cos(lon * 10)) * 50;
  
  const totalElevation = greatDividingRange + centralPlateau + westernPlateau + tasmania + arnhemLand + noise;
  
  // Ensure realistic elevation range for Australia (0-2500m)
  return Math.max(0, Math.min(2500, totalElevation));
}

export function getTerrainType(elevation: number, lat: number, lon: number): TerrainType {
  // Determine terrain type based on elevation and location
  
  // Australia coastline detection - more accurate boundaries
  const isInAustralia = isPointInAustralia(lat, lon);
  
  if (!isInAustralia) {
    return TERRAIN_TYPES[0]; // Water - outside Australia
  }
  
  if (elevation < 50) {
    return TERRAIN_TYPES[0]; // Water
  }
  
  if (elevation < 200) {
    return TERRAIN_TYPES[1]; // Coastal
  }
  
  if (elevation > 2000) {
    return TERRAIN_TYPES[6]; // Snow (high elevation)
  }
  
  if (elevation > 1000) {
    return TERRAIN_TYPES[5]; // Mountain
  }
  
  // Desert regions (central Australia)
  const isDesertRegion = lat > -30 && lat < -20 && lon > 120 && lon < 140;
  if (isDesertRegion && elevation < 500) {
    return TERRAIN_TYPES[2]; // Desert
  }
  
  // Outback regions
  const isOutbackRegion = lat > -35 && lat < -15 && lon > 115 && lon < 145;
  if (isOutbackRegion && elevation < 400) {
    return TERRAIN_TYPES[3]; // Outback
  }
  
  // Forest regions (east coast)
  const isForestRegion = lon > 145 && lat > -40 && lat < -10;
  if (isForestRegion && elevation > 200) {
    return TERRAIN_TYPES[4]; // Forest
  }
  
  // Default to outback
  return TERRAIN_TYPES[3];
}

// Helper function to determine if a point is within Australia's landmass
function isPointInAustralia(lat: number, lon: number): boolean {
  // Mainland Australia boundaries (more accurate)
  const mainlandBounds = {
    north: -10.0,
    south: -39.0,
    east: 154.0,
    west: 113.0
  };
  
  // Tasmania boundaries
  const tasmaniaBounds = {
    north: -39.0,
    south: -43.5,
    east: 148.5,
    west: 144.5
  };
  
  // Check if point is in mainland Australia
  const inMainland = lat >= mainlandBounds.south && lat <= mainlandBounds.north &&
                    lon >= mainlandBounds.west && lon <= mainlandBounds.east;
  
  // Check if point is in Tasmania
  const inTasmania = lat >= tasmaniaBounds.south && lat <= tasmaniaBounds.north &&
                    lon >= tasmaniaBounds.west && lon <= tasmaniaBounds.east;
  
  // More detailed shape refinements for mainland Australia
  if (inMainland) {
    // Northern Territory - more detailed boundary
    if (lat > -10.5 && lon > 129 && lon < 138) return false;
    
    // Queensland - Gulf of Carpentaria area
    if (lat > -10.5 && lon > 142 && lon < 145) return false;
    
    // Queensland - Cape York Peninsula (keep more of it)
    if (lat > -10.5 && lon > 145) return false;
    
    // Western Australia - Kimberley region
    if (lat > -14 && lat < -16 && lon > 113 && lon < 120) return false;
    
    // Western Australia - Pilbara coast
    if (lat > -20 && lat < -22 && lon > 113 && lon < 117) return false;
    
    // Western Australia - Shark Bay area
    if (lat > -24 && lat < -26 && lon > 113 && lon < 115) return false;
    
    // Western Australia - Perth area (keep more of it)
    if (lat > -32 && lat < -34 && lon > 113 && lon < 116) return false;
    
    // South Australia - Great Australian Bight
    if (lat < -35 && lon < 130) return false;
    
    // South Australia - Spencer Gulf
    if (lat < -32 && lat > -35 && lon > 136 && lon < 138) return false;
    
    // South Australia - Gulf St Vincent
    if (lat < -34 && lat > -36 && lon > 138 && lon < 140) return false;
    
    // Victoria - Bass Strait area
    if (lat < -38 && lon > 145) return false;
    
    // New South Wales - Sydney area (keep more of it)
    if (lat < -32 && lat > -35 && lon > 150 && lon < 152) return false;
    
    // New South Wales - Newcastle area
    if (lat < -32 && lat > -34 && lon > 151 && lon < 153) return false;
    
    // Queensland - Brisbane area
    if (lat < -26 && lat > -28 && lon > 152 && lon < 154) return false;
    
    // Queensland - Gold Coast area
    if (lat < -28 && lat > -30 && lon > 153 && lon < 154) return false;
  }
  
  return inMainland || inTasmania;
}

export function generateStackedVoxels(elevation: number): number {
  // Convert elevation to number of stacked voxels
  // 1 voxel = 1000 feet (304.8 meters)
  const elevationInFeet = elevation * 3.28084; // Convert meters to feet
  const voxelCount = Math.max(1, Math.floor(elevationInFeet / ELEVATION_PER_VOXEL));
  
  // Cap at reasonable maximum (8 voxels = 8000 feet = ~2400m)
  return Math.min(8, voxelCount);
}

export async function generateAustraliaVoxelData(): Promise<VoxelData[]> {
  const voxels: VoxelData[] = [];
  
  console.warn('Generating Australia voxel data with fallback elevation model...');
  
  // Track voxel distribution by region
  const regionCounts = {
    mainland: 0,
    tasmania: 0,
    ocean: 0
  };
  
  // Generate grid covering Australia with 20km resolution
  for (let lat = AUSTRALIA_BOUNDS.south; lat <= AUSTRALIA_BOUNDS.north; lat += GRID_RESOLUTION) {
    for (let lon = AUSTRALIA_BOUNDS.west; lon <= AUSTRALIA_BOUNDS.east; lon += GRID_RESOLUTION) {
      try {
        // Use fallback elevation directly instead of API calls for performance
        const elevation = getFallbackElevation(lat, lon);
        const terrainType = getTerrainType(elevation, lat, lon);
        
        // Only include land voxels (not ocean)
        if (terrainType.id === 'water') {
          regionCounts.ocean++;
          continue; // Skip ocean voxels
        }
        
        // Convert lat/lon to grid coordinates
        const x = (lon - AUSTRALIA_BOUNDS.west) / GRID_RESOLUTION;
        const z = (lat - AUSTRALIA_BOUNDS.south) / GRID_RESOLUTION;
        
        // Generate stacked voxels based on elevation
        const stackedVoxels = generateStackedVoxels(elevation);
        
        for (let y = 0; y < stackedVoxels; y++) {
          voxels.push({
            x: Math.floor(x),
            z: Math.floor(z),
            y: y,
            terrainType,
            elevation
          });
        }
        
        // Count by region
        if (lat >= -39.0 && lat <= -10.0 && lon >= 113.0 && lon <= 154.0) {
          regionCounts.mainland++;
        } else if (lat >= -43.5 && lat <= -39.0 && lon >= 144.5 && lon <= 148.5) {
          regionCounts.tasmania++;
        }
      } catch (error) {
        console.warn(`Failed to get data for ${lat}, ${lon}:`, error);
      }
    }
  }
  
  console.warn(`Generated ${voxels.length} land voxels for Australia (ocean filtered out)`);
  console.warn('Region distribution:', regionCounts);
  console.warn('Data bounds - Lat:', AUSTRALIA_BOUNDS.south, 'to', AUSTRALIA_BOUNDS.north);
  console.warn('Data bounds - Lon:', AUSTRALIA_BOUNDS.west, 'to', AUSTRALIA_BOUNDS.east);
  
  return voxels;
}

// Initialize with a detailed Australia shape
export function initializeAustraliaData(): VoxelData[] {
  const data: VoxelData[] = [];
  const gridSize = 100; // 100x100 grid for detailed Australia
  
  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      // Create a more detailed Australia shape
      const centerX = gridSize / 2;
      const centerZ = gridSize / 2;
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2));
      
      // Australia shape parameters
      const isInAustralia = distance < 35 && 
        !(x < 10 && z > 80) && // Cut out top right
        !(x > 85 && z < 15) && // Cut out bottom left
        !(x < 15 && z < 15);   // Cut out bottom right
      
      // Tasmania - separate island south of mainland
      const isTasmania = z > 90 && x > 35 && x < 65 && 
        Math.sqrt(Math.pow(x - 50, 2) + Math.pow(z - 95, 2)) < 15;
      
      if (!isInAustralia && !isTasmania) {
        // Outside Australia and Tasmania - water
        data.push({
          x, z, y: 0,
          terrainType: TERRAIN_TYPES[0],
          elevation: 0
        });
        continue;
      }
      
      // Calculate elevation based on position (more realistic ranges)
      let elevation = 0;
      let terrainType: TerrainType;
      
      // Tasmania - peaks around 1600m
      if (isTasmania) {
        elevation = 600 + Math.random() * 1000; // 600-1600m
        terrainType = elevation > 1400 ? TERRAIN_TYPES[6] : TERRAIN_TYPES[5];
      }
      // Great Dividing Range (east coast) - peaks around 2000m
      else if (x < 25 && z > 20 && z < 80) {
        elevation = 800 + Math.random() * 1200; // 800-2000m
        terrainType = elevation > 1800 ? TERRAIN_TYPES[6] : TERRAIN_TYPES[5];
      }
      // Central desert - mostly 200-600m
      else if (distance < 20 && x > 30 && x < 70) {
        elevation = 200 + Math.random() * 400; // 200-600m
        terrainType = TERRAIN_TYPES[2];
      }
      // Western plateau - mostly 300-500m
      else if (x > 70 && z > 20 && z < 80) {
        elevation = 300 + Math.random() * 200; // 300-500m
        terrainType = TERRAIN_TYPES[3];
      }
      // Northern Territory - mostly 100-300m
      else if (z < 20 && x > 30 && x < 70) {
        elevation = 100 + Math.random() * 200; // 100-300m
        terrainType = TERRAIN_TYPES[3];
      }
      // Coastal areas - mostly 50-200m
      else if (distance > 25) {
        elevation = 50 + Math.random() * 150; // 50-200m
        terrainType = TERRAIN_TYPES[1];
      }
      // Forest regions (east coast) - mostly 200-800m
      else if (x < 30 && z > 30 && z < 70) {
        elevation = 200 + Math.random() * 600; // 200-800m
        terrainType = TERRAIN_TYPES[4];
      }
      // Default outback - mostly 200-400m
      else {
        elevation = 200 + Math.random() * 200; // 200-400m
        terrainType = TERRAIN_TYPES[3];
      }
      
      // Generate stacked voxels
      const stackedVoxels = generateStackedVoxels(elevation);
      
      for (let y = 0; y < stackedVoxels; y++) {
        data.push({ x, z, y, terrainType, elevation });
      }
    }
  }
  
  return data;
}

export function getTerrainColor(elevation: number): string {
  // Simple terrain color mapping based on elevation
  if (elevation < 0) return '#006994'; // Deep water
  if (elevation < 10) return '#4A90E2'; // Shallow water
  if (elevation < 50) return '#F4D03F'; // Beach
  if (elevation < 200) return '#27AE60'; // Grassland
  if (elevation < 500) return '#8B4513'; // Forest
  if (elevation < 1000) return '#7F8C8D'; // Mountain
  return '#FFFFFF'; // Snow
} 