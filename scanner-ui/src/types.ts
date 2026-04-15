export interface Call {
  id: string;
  talkgroupId: string;
  timestamp: string;
  transcription: string | null;
  audioUrl: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  category: string | null;
  talkgroup?: Talkgroup;
}

export interface Talkgroup {
  id: string;
  hex: string | null;
  alphaTag: string | null;
  mode: string | null;
  description: string | null;
  tag: string | null;
  county: string | null;
}

export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
}

export interface Config {
  googleMapsApiKey: string;
  locationIqApiKey: string;
  geocoding: {
    provider: string;
    state: string;
    country: string;
    city: string;
    targetCounties: string[];
  };
}