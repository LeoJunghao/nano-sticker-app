
import { GoogleGenAI } from "@google/genai";

// Nano Banana Pro (Gemini 3 Pro Flagship)
const MODEL_NAME = 'gemini-3-pro-image-preview';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");
  return new GoogleGenAI({ apiKey });
};

export const generateCharacterOptions = async (
  referenceImages: string[],
  style: string
): Promise<string[]> => {
  const ai = getClient();
  const results: string[] = [];
  
  // Prompting strategy for consistent characters in Gemini 3 Pro
  const prompts = [
    `Create a high-quality character sheet, front view, character based on the reference images. Full body, pure white background. Artistic Style: ${style}. High consistency.`,
    `A happy version of the same character from reference images, waving at the viewer. Pure white background, Style: ${style}.`,
    `A character in a thoughtful pose, identical appearance to the reference. Clean white background, Style: ${style}.`
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
          imageConfig: { 
            aspectRatio: "1:1",
            imageSize: "1K" // Pro model flagship quality
          } 
        }
      });

      if (response.candidates?.[0]?.content?.parts) {
        const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);
        if (imagePart?.inlineData) {
          results.push(`data:image/png;base64,${imagePart.inlineData.data}`);
        }
      }
    } catch (error: any) {
      console.error("Gemini Pro Image Generation Error:", error);
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
  
  // Advanced prompt for Gemini 3 Pro to handle grid layout and Traditional Chinese text
  const prompt = `Task: Generate a 4x3 grid (total 12 distinct stickers) of the EXACT same character provided in the image.
  Requirement: Extremely high visual consistency for the character across all 12 frames.
  Atmosphere: ${stickerAdjectives}.
  Language: Traditional Chinese (繁體中文).
  Text: Each of the 12 stickers must include one unique phrase from this list: ${stickerText}.
  Typography: Write the text in a bold, cute, hand-drawn style inside each frame.
  Background: Pure white background for easy transparency.
  Layout: Organize as a neat 4x3 sticker sheet.`;

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
          imageSize: "1K" // Flagship quality for the final grid
        } 
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        return `data:image/png;base64,${imagePart.inlineData.data}`;
      }
    }
  } catch (error: any) {
    console.error("Gemini Pro Grid Generation Error:", error);
    throw error;
  }
  return null;
};
