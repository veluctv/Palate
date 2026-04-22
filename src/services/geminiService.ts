import { Type } from "@google/genai";
import { ai } from "../lib/gemini";

export const discoverFamousPlaces = async (dishName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Identify the 8 most famous/distinctive places in Singapore for the dish "${dishName}". 
        You MUST provide a mix of at least:
        - 2 global/local fast food options (e.g., McDonald's, MOS Burger, etc.)
        - 3 high-end/gourmet restaurants
        - 3 local hawker favorites or street stalls.
        If "${dishName}" is a restaurant name, find its specific locations or outlets.
        Return the results as a JSON array of objects with: name (restaurant name), neighborhood, whyItsFamous, estimatedRating (4.0-5.0), and priceLevel ($, $$, $$$, or $$$$).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              neighborhood: { type: Type.STRING },
              whyItsFamous: { type: Type.STRING },
              estimatedRating: { type: Type.NUMBER },
              priceLevel: { type: Type.STRING }
            },
            required: ["name", "neighborhood", "whyItsFamous", "estimatedRating", "priceLevel"]
          }
        }
      }
    });
    
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Discovery Error:", error);
    return [];
  }
};

export const discoverMenu = async (restaurantName: string, neighborhood: string, currentFocus?: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Act as a Singaporean food expert. For the restaurant "${restaurantName}" in "${neighborhood}", extract the 12 most iconic/popular dishes from its real menu and reviews. 
        The user is currently focused on "${currentFocus || 'the entire menu'}".
        For each dish, provide:
        - name: The official name.
        - description: A short, vivid description (15 words max).
        - estimatedRating: A realistic rating (3.5 - 5.0).
        - price: Estimated price in SGD (e.g. "$14.50").
        - flavorProfile: Dynamic palate DNA (0.0 to 1.0).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              estimatedRating: { type: Type.NUMBER },
              price: { type: Type.STRING },
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
                  texture: { type: Type.NUMBER }
                },
                required: ["sweet", "sour", "salty", "bitter", "umami", "spicy", "richness", "texture"]
              }
            },
            required: ["name", "estimatedRating", "flavorProfile"]
          }
        }
      }
    });
    
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Menu Error:", error);
    return [];
  }
};
