// mock-geocoding-server.js - HTTP server mocking geocoding services

const express = require('express');
const bodyParser = require('body-parser');

/**
 * Mock Geocoding Server
 * Simulates LocationIQ, Google Maps, and Nominatim geocoding APIs
 */
class MockGeocodingServer {
  constructor(port = 8767) {
    this.port = port;
    this.app = express();
    this.server = null;
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    
    this.responses = {
      locationiq: {
        default: null,
        delay: 0,
        error: null,
        rateLimit: false
      },
      google: {
        default: null,
        delay: 0,
        error: null,
        rateLimit: false
      },
      nominatim: {
        default: null,
        delay: 0,
        error: null,
        rateLimit: false
      }
    };
    
    this.requestLog = [];
    this.setupRoutes();
  }

  setupRoutes() {
    // LocationIQ API endpoint
    this.app.get('/v1/search', async (req, res) => {
      await this.simulateDelay('locationiq');
      
      this.logRequest('locationiq', req.query);
      
      if (this.responses.locationiq.rateLimit) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      
      if (this.responses.locationiq.error) {
        return res.status(500).json({ error: this.responses.locationiq.error });
      }

      const address = req.query.q || '';
      const response = this.getLocationIQResponse(address);

      if (!response) {
        return res.json([]);
      }

      res.json([response]);
    });

    // Google Maps Geocoding API endpoint
    this.app.get('/maps/api/geocode/json', async (req, res) => {
      await this.simulateDelay('google');
      
      this.logRequest('google', req.query);
      
      if (this.responses.google.rateLimit) {
        return res.status(429).json({ error_message: 'Rate limit exceeded', status: 'OVER_QUERY_LIMIT' });
      }
      
      if (this.responses.google.error) {
        return res.status(500).json({ error_message: this.responses.google.error, status: 'ERROR' });
      }

      const address = req.query.address || '';
      const response = this.getGoogleResponse(address);

      if (!response) {
        return res.json({ status: 'ZERO_RESULTS', results: [] });
      }

      res.json({
        status: 'OK',
        results: [response]
      });
    });

    // Nominatim API endpoint
    this.app.get('/search', async (req, res) => {
      await this.simulateDelay('nominatim');
      
      this.logRequest('nominatim', req.query);
      
      if (this.responses.nominatim.rateLimit) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      
      if (this.responses.nominatim.error) {
        return res.status(500).json({ error: this.responses.nominatim.error });
      }

      const address = req.query.q || '';
      const response = this.getNominatimResponse(address);

      if (!response) {
        return res.json([]);
      }

      res.json([response]);
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'mock-geocoding' });
    });

    // Request log endpoint
    this.app.get('/requests', (req, res) => {
      res.json(this.requestLog);
    });

    // Clear request log endpoint
    this.app.delete('/requests', (req, res) => {
      this.requestLog = [];
      res.json({ cleared: true });
    });
  }

  getLocationIQResponse(address) {
    // Default response for valid addresses
    if (this.responses.locationiq.default) {
      return this.responses.locationiq.default;
    }

    // Generate a response based on address
    if (address.includes('123 Main')) {
      return {
        lat: '39.2904',
        lon: '-76.6122',
        display_name: '123 Main Street, Baltimore, MD 21201, USA',
        type: 'house',
        class: 'place',
        address: {
          road: 'Main Street',
          house_number: '123',
          city: 'Baltimore',
          county: 'Baltimore City',
          state: 'Maryland',
          postcode: '21201',
          country: 'United States'
        }
      };
    }

    // Address outside target county
    if (address.includes('999 Remote')) {
      return {
        lat: '40.7128',
        lon: '-74.0060',
        display_name: '999 Remote Street, New York, NY 10001, USA',
        type: 'house',
        class: 'place',
        address: {
          road: 'Remote Street',
          house_number: '999',
          city: 'New York',
          county: 'New York County',
          state: 'New York',
          postcode: '10001',
          country: 'United States'
        }
      };
    }

    // Generic city-level result (should be filtered)
    if (address.includes('Baltimore')) {
      return {
        lat: '39.2904',
        lon: '-76.6122',
        display_name: 'Baltimore, MD, USA',
        type: 'city',
        class: 'place',
        address: {
          city: 'Baltimore',
          county: 'Baltimore City',
          state: 'Maryland',
          country: 'United States'
        }
      };
    }

    return null;
  }

  getGoogleResponse(address) {
    // Default response for valid addresses
    if (this.responses.google.default) {
      return this.responses.google.default;
    }

    // Generate a response based on address
    if (address.includes('123 Main')) {
      return {
        formatted_address: '123 Main Street, Baltimore, MD 21201, USA',
        geometry: {
          location: {
            lat: 39.2904,
            lng: -76.6122
          }
        },
        types: ['street_address', 'premise'],
        address_components: [
          { long_name: '123', short_name: '123', types: ['street_number'] },
          { long_name: 'Main Street', short_name: 'Main St', types: ['route'] },
          { long_name: 'Baltimore', short_name: 'Baltimore', types: ['locality', 'political'] },
          { long_name: 'Baltimore City', short_name: 'Baltimore City', types: ['administrative_area_level_2', 'political'] },
          { long_name: 'Maryland', short_name: 'MD', types: ['administrative_area_level_1', 'political'] },
          { long_name: 'United States', short_name: 'US', types: ['country', 'political'] },
          { long_name: '21201', short_name: '21201', types: ['postal_code'] }
        ]
      };
    }

    return null;
  }

  getNominatimResponse(address) {
    // Default response for valid addresses
    if (this.responses.nominatim.default) {
      return this.responses.nominatim.default;
    }

    // Generate a response based on address
    if (address.includes('123 Main')) {
      return {
        lat: '39.2904',
        lon: '-76.6122',
        display_name: '123 Main Street, Baltimore, MD 21201, USA',
        type: 'house',
        importance: 0.9,
        address: {
          road: 'Main Street',
          house_number: '123',
          city: 'Baltimore',
          county: 'Baltimore City',
          state: 'Maryland',
          state_code: 'MD',
          postcode: '21201',
          country: 'United States',
          country_code: 'us'
        }
      };
    }

    return null;
  }

  logRequest(provider, query) {
    this.requestLog.push({
      timestamp: new Date().toISOString(),
      provider,
      query: JSON.stringify(query)
    });
  }

  async simulateDelay(provider) {
    const delay = this.responses[provider]?.delay || 0;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Configure mock responses for a provider
   */
  configure(provider, options = {}) {
    if (!this.responses[provider]) {
      this.responses[provider] = {};
    }
    
    if (options.default !== undefined) this.responses[provider].default = options.default;
    if (options.delay !== undefined) this.responses[provider].delay = options.delay;
    if (options.error !== undefined) this.responses[provider].error = options.error;
    if (options.rateLimit !== undefined) this.responses[provider].rateLimit = options.rateLimit;
  }

  /**
   * Reset to default responses
   */
  reset() {
    this.responses = {
      locationiq: {
        default: null,
        delay: 0,
        error: null,
        rateLimit: false
      },
      google: {
        default: null,
        delay: 0,
        error: null,
        rateLimit: false
      },
      nominatim: {
        default: null,
        delay: 0,
        error: null,
        rateLimit: false
      }
    };
    this.requestLog = [];
  }

  /**
   * Start the mock server
   */
  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`[Mock Geocoding Server] Listening on port ${this.port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the mock server
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log(`[Mock Geocoding Server] Stopped`);
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the server URL
   */
  getUrl() {
    return `http://localhost:${this.port}`;
  }

  /**
   * Get request log
   */
  getRequestLog() {
    return this.requestLog;
  }
}

module.exports = MockGeocodingServer;

