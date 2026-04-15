import axios from 'axios';

interface GeocodingResult {
  address: string;
  lat: number;
  lon: number;
}

export class GeocodingService {
  private provider: 'google' | 'locationiq';
  private apiKey: string;
  private state: string;
  private country: string;
  private city: string;
  private targetCounties: string[];

  constructor() {
    this.provider = (process.env.GEOCODING_PROVIDER as 'google' | 'locationiq') || 'locationiq';
    this.apiKey = this.provider === 'google'
      ? process.env.GOOGLE_MAPS_API_KEY || ''
      : process.env.LOCATIONIQ_API_KEY || '';
    this.state = process.env.GEOCODING_STATE || '';
    this.country = process.env.GEOCODING_COUNTRY || '';
    this.city = process.env.GEOCODING_CITY || '';
    this.targetCounties = (process.env.GEOCODING_TARGET_COUNTIES || '').split(',').filter(Boolean);
  }

  async geocode(address: string): Promise<GeocodingResult | null> {
    if (this.provider === 'google') {
      return this.geocodeGoogle(address);
    }
    return this.geocodeLocationIQ(address);
  }

  private async geocodeGoogle(address: string): Promise<GeocodingResult | null> {
    try {
      const fullAddress = `${address}, ${this.city}, ${this.state} ${this.country}`;
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: fullAddress,
          key: this.apiKey
        }
      });

      if (response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          address: result.formatted_address,
          lat: result.geometry.location.lat,
          lon: result.geometry.location.lng
        };
      }
    } catch (error) {
      console.error('Google geocoding error:', error);
    }
    return null;
  }

  private async geocodeLocationIQ(address: string): Promise<GeocodingResult | null> {
    try {
      const fullAddress = `${address}, ${this.city}, ${this.state}, ${this.country}`;
      const response = await axios.get('https://us1.locationiq.org/v1/search.php', {
        params: {
          key: this.apiKey,
          q: fullAddress,
          format: 'json',
          addressdetails: 1,
          limit: 1
        }
      });

      if (response.data.length > 0) {
        const result = response.data[0];
        return {
          address: result.display_name,
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon)
        };
      }
    } catch (error) {
      console.error('LocationIQ geocoding error:', error);
    }
    return null;
  }

  async extractAddressFromTranscript(transcript: string): Promise<string | null> {
    const patterns = [
      /(?:at|on|in|address is|located at)\s+(\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|court|ct|place|pl)[\w\s,]*)/i,
      /(\d{3,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|court|ct|place|pl)[\w\s,]*)/i,
      /(?:crossing|intersection of)\s+([\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr)\s+(?:and|at|with)\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr))/i
    ];

    for (const pattern of patterns) {
      const match = transcript.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }
}

export const geocodingService = new GeocodingService();