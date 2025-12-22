
import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = 'gemini-3-pro-image-preview';

export const generateCharacterOptions = async (
  referenceImages: string[],
  style: string
): Promise<string[]> => {
  // 建立實例時直接使用自動注入的 process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const results: string[] = [];
  
  const prompts = [
    `Generate a consistent character based on the reference images. Standard front view, white background. Style: ${style}`,
    `Generate the same character from the references in a 3/4 side view. Style: ${style}`,
    `Generate the reference character with a happy and energetic expression. Style: ${style}`
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
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            results.push(`data:image/png;base64,${part.inlineData.data}`);
            break;
          }
        }
      }
    } catch (error: any) {
      // 如果發生權限錯誤，拋出特定異常讓 UI 捕捉
      if (error.message?.includes("entity was not found") || error.message?.includes("404")) {
        throw new Error("KEY_EXPIRED");
      }
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Task: Create a 4x3 LINE sticker grid (12 individual stickers) of the character provided.
  Layout: 16:9 aspect ratio. Background: Pure white.
  Character Consistency: Same character in all 12 stickers.
  Expressions: ${stickerAdjectives}.
  Text: Write these phrases in playful HANDWRITTEN TRADITIONAL CHINESE (繁體中文) inside each sticker: ${stickerText}.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { data: characterBase64.split(',')[1] || characterBase64, mimeType: 'image/png' } },
          { text: prompt }
        ]
      },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error: any) {
    if (error.message?.includes("entity was not found") || error.message?.includes("404")) {
      throw new Error("KEY_EXPIRED");
    }
    throw error;
  }
  return null;
};
