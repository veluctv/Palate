import { GoogleGenAI, Type } from "@google/genai";
import { PalateMap } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeReviewFlavor(review: string): Promise<Partial<PalateMap>> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not found. Returning empty flavor profile.");
    return {};
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this food review and score it on these 8 flavor axes from 0.0 to 1.0: 
      Sweet, Sour, Salty, Bitter, Umami, Spicy, Richness, Texture.
      
      Review: "${review}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sweet: { type: Type.NUMBER },
            sour: { type: Type.NUMBER },
            salty: { type: Type.NUMBER },
            bitter: { type: Type.NUMBER },
            umami: { type: Type.NUMBER },
            spicy: { type: Type.NUMBER },
            richness: { type: Type.NUMBER },
            texture: { type: Type.NUMBER },
          },
          required: ["sweet", "sour", "salty", "bitter", "umami", "spicy", "richness", "texture"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Error analyzing review flavor:", error);
    return {};
  }
}

export async function identifyDishFromImage(base64Image: string): Promise<{ dishName: string; restaurantName?: string; flavorProfile: PalateMap }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not found.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
        {
          text: "Identify this dish and provide a score (0.0-1.0) for these 8 flavor axes: Sweet, Sour, Salty, Bitter, Umami, Spicy, Richness, Texture. Also guess the restaurant if possible from any context in the image.",
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dishName: { type: Type.STRING },
            restaurantName: { type: Type.STRING },
            flavorProfile: {
              type: Type.OBJECT,
              properties: {
                sweet: { type: Type.NUMBER },
                sour: { type: Type.NUMBER },
                salty: { type: Type.NUMBER },
                bitter: { type: Type.NUMBER },
                umami: { type: Type.NUMBER },
                spicy: { type: Type.NUMBER },
                richness: { type: Type.NUMBER },
                texture: { type: Type.NUMBER },
              },
              required: ["sweet", "sour", "salty", "bitter", "umami", "spicy", "richness", "texture"],
            },
          },
          required: ["dishName", "flavorProfile"],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error identifying dish from image:", error);
    throw error;
  }
}
