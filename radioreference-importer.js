// radioreference-importer.js - Radio Reference import and config generator
// Handles importing talkgroups from Radio Reference and generating configs for various scanner software

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

/**
 * Search Radio Reference for systems by location
 * Note: Radio Reference requires authentication for API access
 * This function provides a way to search by state/county
 */
async function searchSystems(stateCode, county = null) {
  // Radio Reference doesn't have a public free API
  // Users will need to provide system ID or we'll use web scraping
  // For now, return a structure that can be populated
  
  return {
    systems: [],
    message: 'Radio Reference requires manual system selection or premium API access'
  };
}

/**
 * Fetch talkgroups from Radio Reference system
 * This would use the Radio Reference API if available, or web scraping
 */
async function fetchTalkgroups(systemId, apiKey = null) {
  if (!apiKey) {
    // Without API key, we'll need to parse from CSV export or manual entry
    throw new Error('Radio Reference API key required, or use CSV import');
  }
  
  // If API key provided, use Radio Reference API
  try {
    const response = await fetch(`https://api.radioreference.com/webservices/v2/system/${systemId}/talkgroups?key=${apiKey}`, {
      timeout: 10000
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.talkgroups || [];
    } else {
      throw new Error(`Radio Reference API error: ${response.statusText}`);
    }
  } catch (error) {
    throw new Error(`Failed to fetch from Radio Reference: ${error.message}`);
  }
}

/**
 * Parse Radio Reference CSV export
 * Radio Reference allows exporting talkgroups as CSV
 * Handles various CSV formats from Radio Reference
 */
function parseRadioReferenceCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // Try to detect header row (might be first or second line)
  let headerLine = 0;
  let headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  // Check if first line looks like headers
  if (!headers[0] || isNaN(parseInt(headers[0]))) {
    // First line is headers
    headerLine = 0;
  } else {
    // First line might be data, try common header names
    headers = ['DEC', 'HEX', 'Alpha Tag', 'Mode', 'Description', 'Tag', 'County'];
    headerLine = -1;
  }
  
  // Re-parse headers if we found them
  if (headerLine === 0) {
    headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  }
  
  const talkgroups = [];
  const startLine = headerLine === 0 ? 1 : 0;
  
  for (let i = startLine; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    // Handle CSV with quoted fields that may contain commas
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    // Remove quotes from values
    const cleanValues = values.map(v => v.replace(/^"|"$/g, ''));
    
    if (cleanValues.length < headers.length) continue;
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cleanValues[index] || '';
    });
    
    // Map Radio Reference CSV format to our format
    // Try various column name variations
    const decStr = row['Decimal'] || row['DEC'] || row['Talkgroup ID'] || row['TGID'] || row['ID'] || cleanValues[0];
    const dec = parseInt(decStr, 10);
    if (isNaN(dec)) continue;
    
    // Extract hex
    let hex = row['Hex'] || row['HEX'] || row['Hexadecimal'];
    if (!hex && dec) {
      hex = `0x${dec.toString(16).toUpperCase()}`;
    }
    
    // Extract alpha tag/name
    const alphaTag = row['Alpha Tag'] || row['AlphaTag'] || row['Name'] || row['Label'] || row['Description'] || '';
    
    // Extract description
    const description = row['Description'] || row['Desc'] || row['Alpha Tag'] || row['Name'] || '';
    
    // Extract mode
    const mode = row['Mode'] || row['Type'] || 'A';
    
    // Extract tag/category
    const tag = row['Tag'] || row['Category'] || row['Group'] || '';
    
    // Extract county
    const county = row['County'] || row['Location'] || '';
    
    // Extract system info (might be in filename or first row)
    const systemId = row['System ID'] || row['SystemID'] || row['SysID'] || '';
    const systemName = row['System Name'] || row['SystemName'] || row['System'] || '';
    
    talkgroups.push({
      id: dec,
      hex: hex,
      alphaTag: alphaTag,
      mode: mode,
      description: description,
      tag: tag,
      county: county,
      systemId: systemId,
      systemName: systemName
    });
  }
  
  return talkgroups;
}

/**
 * Generate RDIO Scanner configuration
 * RDIO Scanner uses JSON format for talkgroups
 */
function generateRDIOScannerConfig(talkgroups, systemName = 'Imported System') {
  const config = {
    version: '1.0',
    system: {
      name: systemName,
      type: 'trunked',
      talkgroups: talkgroups.map(tg => ({
        id: tg.id,
        hex: tg.hex,
        label: tg.alphaTag || tg.description || `TG ${tg.id}`,
        name: tg.description || tg.alphaTag || '',
        tag: tg.tag || '',
        group: tg.county || 'Default'
      }))
    }
  };
  
  return JSON.stringify(config, null, 2);
}

/**
 * Generate SDRTrunk configuration
 * SDRTrunk uses JSON format with specific structure
 */
function generateSDRTrunkConfig(talkgroups, systemName = 'Imported System', systemId = null) {
  const config = {
    aliasList: {
      name: systemName,
      system: systemId || 'default',
      groups: [
        {
          name: 'Talkgroups',
          aliases: talkgroups.map(tg => ({
            id: tg.id,
            name: tg.alphaTag || tg.description || `TG ${tg.id}`,
            group: tg.tag || 'Default',
            description: tg.description || ''
          }))
        }
      ]
    }
  };
  
  return JSON.stringify(config, null, 2);
}

/**
 * Generate TrunkRecorder configuration
 * TrunkRecorder uses JSON format for systems
 */
function generateTrunkRecorderConfig(talkgroups, systemName = 'Imported System', systemId = null) {
  const config = {
    systems: [
      {
        id: systemId || 'default',
        name: systemName,
        talkgroups: talkgroups.map(tg => ({
          id: tg.id,
          label: tg.alphaTag || tg.description || `TG ${tg.id}`,
          name: tg.description || tg.alphaTag || '',
          tag: tg.tag || '',
          group: tg.county || 'Default'
        }))
      }
    ]
  };
  
  return JSON.stringify(config, null, 2);
}

/**
 * Save configuration file
 */
function saveConfigFile(configContent, filename, outputDir = './configs') {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, configContent, 'utf8');
  
  return filepath;
}

/**
 * Generate all config files for a set of talkgroups
 */
function generateAllConfigs(talkgroups, systemName, systemId = null, outputDir = './configs') {
  const configs = {
    rdioScanner: generateRDIOScannerConfig(talkgroups, systemName),
    sdrtrunk: generateSDRTrunkConfig(talkgroups, systemName, systemId),
    trunkRecorder: generateTrunkRecorderConfig(talkgroups, systemName, systemId)
  };
  
  const files = {
    rdioScanner: saveConfigFile(configs.rdioScanner, 'rdio-scanner-config.json', outputDir),
    sdrtrunk: saveConfigFile(configs.sdrtrunk, 'sdrtrunk-config.json', outputDir),
    trunkRecorder: saveConfigFile(configs.trunkRecorder, 'trunkrecorder-config.json', outputDir)
  };
  
  return { configs, files };
}

/**
 * Convert talkgroups to Scanner Map database format
 */
function convertToScannerMapFormat(talkgroups) {
  return talkgroups.map(tg => ({
    id: tg.id,
    hex: tg.hex,
    alphaTag: tg.alphaTag,
    mode: tg.mode,
    description: tg.description,
    tag: tg.tag,
    county: tg.county
  }));
}

module.exports = {
  searchSystems,
  fetchTalkgroups,
  parseRadioReferenceCSV,
  generateRDIOScannerConfig,
  generateSDRTrunkConfig,
  generateTrunkRecorderConfig,
  generateAllConfigs,
  convertToScannerMapFormat,
  saveConfigFile
};

