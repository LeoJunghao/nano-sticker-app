
import { GoogleGenAI } from "@google/genai";

// 升級至 Gemini 3 Pro 影像模型
const MODEL_NAME = 'gemini-3-pro-image-preview';

export const generateCharacterOptions = async (
  referenceImages: string[],
  style: string
): Promise<string[]> => {
  // 規則要求：在 API 呼叫前才建立實例，確保使用最新的 API KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const results: string[] = [];
  
  // 為確保多樣性，我們生成 3 個不同視角的原型
  const prompts = [
    `Generate a consistent character based on the reference images. Show the character in a standard front view, white background. Style: ${style}`,
    `Generate the same character from the references in a 3/4 side view, ensuring facial features are consistent. Style: ${style}`,
    `Generate a highly detailed version of the reference character, focus on its unique accessories and expressions. Style: ${style}`
  ];

  for (let i = 0; i < 3; i++) {
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
          parts: [
            ...imageParts,
            { text: prompts[i] }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
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
      console.error("Generation error:", error);
      // 如果是金鑰問題，將錯誤拋出由 UI 處理
      if (error.message?.includes("Requested entity was not found")) {
        throw new Error("KEY_NOT_FOUND");
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
  Layout: 16:9 aspect ratio.
  Background: Pure white.
  Character Consistency: Each of the 12 stickers must feature the same character.
  Expressions & Adjectives: Apply the following vibe/adjectives to the stickers' expressions: ${stickerAdjectives}.
  Text: Crucially, write the following phrases in playful HANDWRITTEN TRADITIONAL CHINESE (繁體中文) inside each corresponding sticker area: ${stickerText}.
  Aesthetics: Stickers should be clear, fun, and ready for digital use. Ensure the text matches the specified adjectives in emotional tone.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: characterBase64.split(',')[1] || characterBase64,
              mimeType: 'image/png'
            }
          },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("KEY_NOT_FOUND");
    }
    throw error;
  }

  return null;
};
