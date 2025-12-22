
import { GoogleGenAI } from "@google/genai";

// 使用旗艦影像模型
const MODEL_NAME = 'gemini-3-pro-image-preview';

const getClient = () => {
  // 優先檢查全域 window 上的 process.env (用於手動套用的金鑰)
  const apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey.length < 10) {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateCharacterOptions = async (
  referenceImages: string[],
  style: string
): Promise<string[]> => {
  const ai = getClient();
  const results: string[] = [];
  
  const prompts = [
    `Create a high-quality character sheet, front view, based on the reference images. Full body, pure white background. Artistic Style: ${style}. High consistency.`,
    `A happy version of the same character, waving. Pure white background, Style: ${style}.`,
    `A thoughtful pose of the character, identical appearance. White background, Style: ${style}.`
  ];

  for (const prompt of prompts) {
    const imageParts = referenceImages.map(base64 => ({
      inlineData: {
        data: base64.split(',')[1] || base64,
        mimeType: 'image/png'
      }
    }));

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [...imageParts, { text: prompt }]
        },
        config: { 
          imageConfig: { aspectRatio: "1:1", imageSize: "1K" } 
        }
      });

      const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        results.push(`data:image/png;base64,${imagePart.inlineData.data}`);
      }
    } catch (error: any) {
      console.error("Character Gen Error:", error);
      throw error;
    }
  }
  return results;
};

export const generateStickerGrid = async (
  characterBase64: string,
  stickerText: string,
  stickerAdjectives: string
): Promise<string | null> => {
  const ai = getClient();
  
  // 強化 Prompt：要求 4x3 佈局、16:9 比例、繁體中文手寫風格
  const prompt = `Task: Generate a 4x3 grid (total 12 distinct stickers) of the EXACT same character.
  Atmosphere: ${stickerAdjectives}.
  Layout: 4 columns and 3 rows (4x3 grid), filling the 16:9 canvas.
  Language: Traditional Chinese (繁體中文).
  Text content: Use these phrases: ${stickerText}.
  Visual Style: Handwritten, bold, cute Traditional Chinese text integrated into each sticker frame.
  Background: Pure white background.
  Consistency: Character must look identical in all 12 frames.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { data: characterBase64.split(',')[1] || characterBase64, mimeType: 'image/png' } },
          { text: prompt }
        ]
      },
      config: { 
        imageConfig: { 
          aspectRatio: "16:9",
          imageSize: "1K" 
        } 
      }
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (imagePart?.inlineData) {
      return `data:image/png;base64,${imagePart.inlineData.data}`;
    }
  } catch (error: any) {
    console.error("Grid Gen Error:", error);
    throw error;
  }
  return null;
};
