
export interface CharacterOption {
  id: string;
  url: string;
  base64: string;
}

export interface AppState {
  step: GenerationStep;
  referenceImages: string[]; 
  style: string;
  characterOptions: CharacterOption[];
  selectedCharacter: CharacterOption | null;
  stickerText: string;
  stickerAdjectives: string;
  stickerRequirement: string; // 新增：表情包產生需求說明
  finalGridUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

export enum GenerationStep {
  KeySetup = 0,
  Upload = 1,
  CharacterSelection = 2,
  TextEntry = 3,
  FinalResult = 4
}
