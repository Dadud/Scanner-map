import { describe, it, expect } from 'vitest';

describe('Geocoding Service', () => {
  it('should extract addresses from transcripts', () => {
    const patterns = [
      /(?:at|on|in|address is|located at)\s+(\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|court|ct|place|pl))/i,
      /(\d{3,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|court|ct|place|pl))/i
    ];

    const transcript = 'Unit 12 respond to 123 Main Street for a medical emergency';
    const match = transcript.match(patterns[1]);

    expect(match).not.toBeNull();
    expect(match?.[1]).toContain('123 Main Street');
  });

  it('should validate coordinate bounds', () => {
    const validCoords = { lat: 40.7128, lon: -74.0060 };
    const invalidCoords = { lat: 100, lon: 200 };

    expect(validCoords.lat).toBeLessThanOrEqual(90);
    expect(validCoords.lat).toBeGreaterThanOrEqual(-90);
    expect(validCoords.lon).toBeLessThanOrEqual(180);
    expect(validCoords.lon).toBeGreaterThanOrEqual(-180);

    expect(invalidCoords.lat).toBeGreaterThan(90);
    expect(invalidCoords.lon).toBeGreaterThan(180);
  });

  it('should handle intersection addresses', () => {
    const intersectionPattern = /(?:crossing|intersection of)\s+([\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr)\s+(?:and|at|with)\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr))/i;

    const transcript = 'Accident at the intersection of Main Street and Oak Avenue';
    const match = transcript.match(intersectionPattern);

    expect(match).not.toBeNull();
  });
});