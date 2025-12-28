
import { GoogleGenAI } from "@google/genai";

// 旗艦版模型，支援 1K 高清與 4x3 佈局
const MODEL_NAME = 'gemini-3-pro-image-preview';

const getClient = () => {
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
  stickerRequirement: string
): Promise<string | null> => {
  const ai = getClient();
  
  // 深度融合 Prompt：整合原圖、12組標語與具體需求說明
  const prompt = `ACT AS A PROFESSIONAL LINE STICKER DESIGNER.
  
  INPUT CHARACTER: The provided image is the base character genetic. 
  
  TASK: Create a single 16:9 image containing exactly 12 stickers in a 4x3 GRID layout.
  
  SPECIFIC REQUIREMENTS FROM USER: "${stickerRequirement}"
  
  STICKER PHRASES (Traditional Chinese):
  Add these 12 labels, one for each frame: "${stickerText}".
  
  VISUAL STYLE RULES:
  1. CHARACTER CONSISTENCY: The character must be IDENTICAL to the input image in all 12 frames.
  2. TEXT STYLE: Bold, cute, "HANDWRITTEN" (手寫風格) Traditional Chinese text integrated creatively into each frame.
  3. LAYOUT: Strictly 4 columns and 3 rows.
  4. BACKGROUND: Pure white background for easy cropping.
  5. COMPOSITION: High-quality rendering, 1K resolution.
  
  Combine the user's requirements with the character and text to create a masterpiece.`;

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
    console.error("Grid Generation Error:", error);
    throw error;
  }
  return null;
};
