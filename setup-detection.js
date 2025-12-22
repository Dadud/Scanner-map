// setup-detection.js - Detection utilities for setup wizard
// Handles auto-detection of location, system resources, services, etc.

const os = require('os');
const { spawn } = require('child_process');
const fetch = require('node-fetch');

/**
 * Detect user's location from IP address
 */
async function detectLocation() {
  try {
    // Try ip-api.com first (free, no API key needed)
    const response = await fetch('http://ip-api.com/json/?fields=status,message,country,regionName,city,lat,lon,timezone,query', {
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        return {
          success: true,
          country: data.country,
          region: data.regionName,
          city: data.city,
          lat: data.lat,
          lng: data.lon,
          timezone: data.timezone,
          ip: data.query,
          stateCode: extractStateCode(data.regionName)
        };
      }
    }
  } catch (error) {
    console.error('[Detection] IP geolocation error:', error.message);
  }
  
  // Fallback to ipapi.co
  try {
    const response = await fetch('https://ipapi.co/json/', {
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.latitude && data.longitude) {
        return {
          success: true,
          country: data.country_name,
          region: data.region,
          city: data.city,
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude),
          timezone: data.timezone,
          ip: data.ip,
          stateCode: data.region_code || extractStateCode(data.region)
        };
      }
    }
  } catch (error) {
    console.error('[Detection] IP geolocation fallback error:', error.message);
  }
  
  return { success: false, error: 'Could not detect location' };
}

/**
 * Extract state code from state name
 */
function extractStateCode(stateName) {
  if (!stateName) return null;
  
  // Common state name to code mapping
  const stateMap = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC'
  };
  
  return stateMap[stateName] || null;
}

/**
 * Detect GPU availability and details
 */
async function detectGPU() {
  return new Promise((resolve) => {
    const proc = spawn('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'], {
      timeout: 5000
    });
    
    let output = '';
    proc.stdout.on('data', (data) => { output += data; });
    
    proc.on('close', (code) => {
      if (code === 0 && output.trim()) {
        const lines = output.trim().split('\n');
        const firstGPU = lines[0].split(',');
        resolve({
          available: true,
          name: firstGPU[0].trim(),
          vramGB: Math.round(parseInt(firstGPU[1]) / 1024),
          count: lines.length
        });
      } else {
        resolve({ available: false });
      }
    });
    
    proc.on('error', () => {
      resolve({ available: false });
    });
  });
}

/**
 * Detect system resources
 */
function detectSystemInfo() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  
  return {
    cpu: {
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown',
      speed: cpus[0]?.speed || 0
    },
    memory: {
      totalGB: Math.round(totalMem / 1024 / 1024 / 1024),
      freeGB: Math.round(freeMem / 1024 / 1024 / 1024),
      availableGB: Math.round((totalMem - freeMem) / 1024 / 1024 / 1024)
    },
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch()
  };
}

/**
 * Detect public IP address
 */
async function detectPublicIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, ip: data.ip };
    }
  } catch (error) {
    console.error('[Detection] Public IP detection error:', error.message);
  }
  
  return { success: false, error: 'Could not detect public IP' };
}

/**
 * Get local network IP addresses
 */
function detectLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({
          address: iface.address,
          netmask: iface.netmask,
          interface: name
        });
      }
    }
  }
  
  return ips;
}

/**
 * Detect Ollama service and list models
 */
async function detectOllama(url = 'http://localhost:11434') {
  try {
    // Check if Ollama is running
    const versionRes = await fetch(`${url}/api/version`, {
      timeout: 3000
    });
    
    if (!versionRes.ok) {
      return { available: false, error: 'Ollama not responding' };
    }
    
    // Get available models
    const modelsRes = await fetch(`${url}/api/tags`, {
      timeout: 3000
    });
    
    if (modelsRes.ok) {
      const data = await modelsRes.json();
      const models = (data.models || []).map(model => ({
        name: model.name,
        size: model.size,
        modified: model.modified_at
      }));
      
      return {
        available: true,
        url: url,
        version: (await versionRes.json()).version,
        models: models
      };
    }
  } catch (error) {
    return { available: false, error: error.message };
  }
  
  return { available: false, error: 'Ollama not accessible' };
}

/**
 * Detect remote transcription server
 */
async function detectRemoteTranscription(baseUrl) {
  try {
    // Try common health check endpoints
    const healthEndpoints = ['/health', '/api/health', '/status'];
    
    for (const endpoint of healthEndpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          timeout: 3000
        });
        
        if (response.ok) {
          return {
            available: true,
            url: baseUrl,
            healthEndpoint: endpoint
          };
        }
      } catch (e) {
        // Try next endpoint
      }
    }
  } catch (error) {
    return { available: false, error: error.message };
  }
  
  return { available: false, error: 'Server not responding' };
}

/**
 * Reverse geocode coordinates to find nearest city
 */
async function reverseGeocode(lat, lng, apiKey = null) {
  try {
    // Try using OpenStreetMap Nominatim (free, no API key needed)
    // This is a free service but has rate limits - use sparingly
    if (!apiKey) {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Scanner-Map-Setup/1.0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.address) {
          return {
            success: true,
            city: data.address.city || data.address.town || data.address.village || data.address.municipality || data.address.county || '',
            state: data.address.state || data.address.region || '',
            country: data.address.country_code?.toUpperCase() || 'US',
            fullAddress: data.display_name || ''
          };
        }
      }
    } else {
      // Use provided API key (LocationIQ)
      try {
        const response = await fetch(`https://us1.locationiq.com/v1/reverse.php?key=${apiKey}&lat=${lat}&lon=${lng}&format=json&addressdetails=1`, {
          timeout: 5000
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.address) {
            return {
              success: true,
              city: data.address.city || data.address.town || data.address.village || data.address.municipality || '',
              state: data.address.state || data.address.region || '',
              country: data.address.country_code?.toUpperCase() || 'US',
              fullAddress: data.display_name || ''
            };
          }
        }
      } catch (e) {
        console.error('[Detection] LocationIQ reverse geocoding error:', e.message);
      }
    }
  } catch (error) {
    console.error('[Detection] Reverse geocoding error:', error.message);
  }
  
  return { success: false, error: 'Could not reverse geocode location' };
}

/**
 * Fetch towns/cities within selected counties
 */
async function fetchTownsInCounties(counties, stateCode, apiKey = null) {
  const towns = new Set(); // Use Set to avoid duplicates
  
  try {
    // Use OpenStreetMap Nominatim to search for cities/towns in each county
    // Limit to first 10 counties to avoid rate limits
    console.log(`[Detection] Fetching towns for ${counties.length} counties in ${stateCode}`);
    
    for (const county of counties.slice(0, 10)) {
      try {
        // Search for cities/towns in this county - try multiple query formats
        const queries = [
          `${county} County, ${stateCode}, USA`,
          `cities in ${county} County, ${stateCode}`,
          `towns in ${county} County, ${stateCode}`
        ];
        
        for (const query of queries) {
          try {
            // Use AbortController for timeout (more reliable than timeout option)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=50&addressdetails=1&extratags=1`, {
              signal: controller.signal,
              headers: {
                'User-Agent': 'Scanner-Map-Setup/1.0'
              }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              
              // Extract city/town names from results
              for (const place of data) {
                const address = place.address || {};
                // Try multiple address fields for city/town name
                const city = address.city || address.town || address.village || address.municipality || address.hamlet || address.locality;
                const placeType = place.type || '';
                const placeClass = place.class || '';
                
                // Only include actual cities/towns, not counties or states
                if (city && 
                    !city.toLowerCase().includes('county') &&
                    !city.toLowerCase().includes('state') &&
                    city.length > 1 &&
                    city !== county) { // Don't include the county name itself
                  // Check if it's a populated place
                  if (placeClass === 'place' || 
                      placeType === 'city' || 
                      placeType === 'town' || 
                      placeType === 'village' || 
                      placeType === 'municipality' ||
                      placeType === 'hamlet' ||
                      placeType === 'locality') {
                    towns.add(city);
                  }
                }
              }
            } else {
              console.warn(`[Detection] Nominatim returned status ${response.status} for query: ${query}`);
            }
            
            // Small delay to respect rate limits (Nominatim requires 1 request per second)
            await new Promise(resolve => setTimeout(resolve, 1100));
          } catch (queryError) {
            if (queryError.name === 'AbortError') {
              console.warn(`[Detection] Query "${query}" timed out`);
            } else {
              console.error(`[Detection] Error with query "${query}":`, queryError.message);
            }
          }
        }
      } catch (error) {
        console.error(`[Detection] Error fetching towns for ${county}:`, error.message);
      }
    }
    
    // If we have an API key, we can optionally enhance results with LocationIQ
    // But primary method is using counties, so this is optional
    if (apiKey && counties.length > 0) {
      // For each county, try to get additional towns using LocationIQ
      for (const county of counties.slice(0, 5)) { // Limit to avoid too many API calls
        try {
          const query = `${county} County, ${stateCode}, USA`;
          const response = await fetch(`https://us1.locationiq.com/v1/search.php?key=${apiKey}&q=${encodeURIComponent(query)}&format=json&tag=place:city,place:town,place:village&limit=20`, {
            timeout: 5000
          });
          
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              for (const place of data) {
                if (place.name && place.name.length > 1 && !place.name.toLowerCase().includes('county')) {
                  towns.add(place.name);
                }
              }
            }
          }
          
          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          // Silently fail - this is optional enhancement
        }
      }
    }
    
    // Convert Set to sorted array (case-insensitive sort)
    const townsArray = Array.from(towns).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    
    return {
      success: true,
      towns: townsArray,
      count: townsArray.length
    };
  } catch (error) {
    console.error('[Detection] Error fetching towns:', error.message);
    return { success: false, error: error.message, towns: [] };
  }
}

/**
 * Recommend transcription model based on hardware
 */
function recommendTranscriptionModel(systemInfo, gpuInfo) {
  if (gpuInfo.available) {
    return {
      model: 'large-v3',
      device: 'cuda',
      reason: 'GPU detected - best accuracy',
      estimatedTime: '~2 seconds per call'
    };
  }
  
  const cores = systemInfo.cpu.cores;
  const ramGB = systemInfo.memory.totalGB;
  
  if (cores >= 8 && ramGB >= 16) {
    return {
      model: 'medium',
      device: 'cpu',
      reason: 'High-end CPU - good balance',
      estimatedTime: '~8 seconds per call'
    };
  } else if (cores >= 4) {
    return {
      model: 'small',
      device: 'cpu',
      reason: 'Mid-range CPU - faster processing',
      estimatedTime: '~5 seconds per call'
    };
  } else {
    return {
      model: 'tiny',
      device: 'cpu',
      reason: 'Limited CPU - fastest processing',
      estimatedTime: '~2 seconds per call'
    };
  }
}

module.exports = {
  detectLocation,
  detectGPU,
  detectSystemInfo,
  detectPublicIP,
  detectLocalIPs,
  detectOllama,
  detectRemoteTranscription,
  recommendTranscriptionModel,
  extractStateCode,
  reverseGeocode,
  fetchTownsInCounties
};

