export interface Shot {
  id: string; // Internal ID for React keys
  shot_type: string;
  aspect_ratio: string;
  prompt: string;
}

export interface ShotConfig {
  shot_type: string;
  aspect_ratio: string;
  prompt: string;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface GeneratedShot extends Shot {
  imageUrl?: string;
  status: GenerationStatus;
  error?: string;
}

export const DEFAULT_SHOT_LIST: ShotConfig[] = [
  {
    shot_type: "Wide Shot",
    aspect_ratio: "16:9",
    prompt: "A wide cinematic shot of the character standing in a futuristic neon-lit alleyway, rain falling heavily."
  },
  {
    shot_type: "Close Up",
    aspect_ratio: "16:9",
    prompt: "A close up on the character's face, showing intense determination, neon lights reflecting in their eyes."
  },
  {
    shot_type: "Low Angle",
    aspect_ratio: "16:9",
    prompt: "Low angle hero shot of the character looking up at a towering skyscraper."
  }
];