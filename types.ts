
export interface CharacterOption {
  id: string;
  url: string;
  base64: string;
}

export interface AppState {
  step: number;
  referenceImages: string[]; // base64
  style: string;
  characterOptions: CharacterOption[];
  selectedCharacter: CharacterOption | null;
  stickerText: string;
  stickerAdjectives: string; // Added for expression descriptions
  finalGridUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

export enum GenerationStep {
  Upload = 1,
  CharacterSelection = 2,
  TextEntry = 3,
  FinalResult = 4
}
