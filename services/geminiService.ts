
import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = 'gemini-3-pro-image-preview';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("KEY_EXPIRED");
  return new GoogleGenAI({ apiKey });
};

export const generateCharacterOptions = async (
  referenceImages: string[],
  style: string
): Promise<string[]> => {
  const ai = getClient();
  const results: string[] = [];
  
  const prompts = [
    `Generate a consistent character based on the reference images. Character sheet style, front view, pure white background. Style: ${style}`,
    `Generate the same character from the references, smiling and waving, pure white background. Style: ${style}`,
    `Generate the character in a thinking pose with a lightbulb above head, pure white background. Style: ${style}`
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
  const ai = getClient();
  const prompt = `Create a 4x3 grid (total 12 stickers) of the character provided.
  Layout: 16:9 aspect ratio, pure white background.
  Strict Character Consistency: Use the exact SAME character for ALL 12 frames.
  Emotions: ${stickerAdjectives}.
  Text Content: Each of the 12 stickers must contain one of these phrases: ${stickerText}.
  Typography: Use bold, playful HANDWRITTEN TRADITIONAL CHINESE (繁體中文) for the text, integrated into each sticker frame.
  Art Style: Consistent with the provided character image.`;

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
