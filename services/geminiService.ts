
import { GoogleGenAI } from "@google/genai";

// 旗艦版模型，支援 1K 高清與 4x3 佈局
const MODEL_NAME = 'gemini-3-pro-image-preview';

const getClient = () => {
  // 優先讀取 window 墊片中的值，這是在外部連結手動輸入後存放的地方
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
    `Create a character concept art based on reference. Front view, neutral pose. Pure White background. Style: ${style}.`,
    `Same character, happy expression. Consistent appearance. Pure White background. Style: ${style}.`,
    `Full body shot of the character, identical features. Pure White background. Style: ${style}.`
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
      console.error("Gen Error:", error);
      if (error.message?.includes("403") || error.message?.includes("404")) {
        throw new Error("BILLING_REQUIRED");
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
  const ai = getClient();
  
  const prompt = `ACT AS A PRO STICKER AGENT. 
  Task: Create a sticker sheet with EXACTLY 12 distinct poses in a 4x3 GRID layout.
  Character: Same as input, strictly consistent.
  Adjectives: ${stickerAdjectives}.
  Text Labels: ${stickerText}.
  Language: Traditional Chinese (繁體中文).
  Style: CUTE HANDWRITTEN (手寫感), bold and clear text in each frame.
  Canvas: 4 columns x 3 rows. 16:9 ratio. Pure White background.`;

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
        imageConfig: { aspectRatio: "16:9", imageSize: "1K" } 
      }
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (imagePart?.inlineData) {
      return `data:image/png;base64,${imagePart.inlineData.data}`;
    }
  } catch (error: any) {
    console.error("Grid Error:", error);
    throw error;
  }
  return null;
};
