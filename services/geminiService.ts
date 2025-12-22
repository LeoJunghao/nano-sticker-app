
import { GoogleGenAI } from "@google/genai";

// 使用旗艦影像模型 Gemini 3 Pro Image
const MODEL_NAME = 'gemini-3-pro-image-preview';

const getApiKey = (): string => {
  // 多重路徑偵測金鑰，解決外部連結環境存取不到的問題
  const win = window as any;
  const key = win.process?.env?.API_KEY || win.API_KEY || (import.meta.env ? import.meta.env.VITE_API_KEY : "");
  return key || "";
};

const getClient = () => {
  const apiKey = getApiKey();
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
  
  // 建立 3 個不同的視角以供選擇
  const prompts = [
    `Create a character concept art based on reference. Front view, simple pose. Background: Pure White. Style: ${style}.`,
    `Same character, different expression (smiling). High consistency. Background: Pure White. Style: ${style}.`,
    `Full body shot of the character. Background: Pure White. Style: ${style}.`
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
      console.error("Option Gen Error:", error);
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
  
  // 核心 Prompt：定義 4x3 布局與手寫繁體中文
  const prompt = `ACT AS A PRO STICKER AGENT. 
  Task: Create a sticker sheet containing EXACTLY 12 distinct poses in a 4x3 GRID layout.
  Character: Same as input image, strictly consistent.
  Atmosphere/Adjectives: ${stickerAdjectives}.
  Text Content: Add these 12 labels: "${stickerText}".
  Text Requirements: 
  - Language: Traditional Chinese (繁體中文).
  - Style: Cute, bold, "HANDWRITTEN" (手寫風格).
  - Placement: Text must be clearly visible and integrated into each of the 12 frames.
  Canvas Layout: 4 columns x 3 rows.
  Aspect Ratio: 16:9.
  Background: Pure White.`;

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
