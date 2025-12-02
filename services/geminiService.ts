import { GoogleGenAI } from "@google/genai";
import { ShotConfig } from "../types";

// Initialize the client with the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Resizes an image to ensure it fits within API payload limits.
 * Compresses to JPEG with 0.8 quality and max dimension of 1024px.
 */
const resizeImage = (base64Str: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.crossOrigin = "anonymous"; 
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Convert to JPEG for better compression than PNG (significantly reduces payload size)
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        // Fallback if canvas context fails
        resolve(base64Str);
      }
    };

    img.onerror = () => {
       // Fallback if image load fails
       console.warn("Failed to load image for resizing, using original.");
       resolve(base64Str);
    }
  });
};

/**
 * Generates a single storyboard image based on a reference character and a prompt.
 */
export const generateStoryboardFrame = async (
  referenceImageBase64: string,
  shot: ShotConfig
): Promise<string> => {
  try {
    const modelId = 'gemini-2.5-flash-image';

    // Optimize image before sending to avoid "Rpc failed due to xhr error" (payload too large)
    const optimizedImage = await resizeImage(referenceImageBase64);
    
    // Clean the base64 string if it has the data prefix
    const cleanBase64 = optimizedImage.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    // Construct a prompt that enforces character consistency
    const fullPrompt = `
    Generate a cinematic storyboard frame.
    Shot Type: ${shot.shot_type}.
    Aspect Ratio: ${shot.aspect_ratio}.
    Scene Description: ${shot.prompt}.
    
    SYSTEM INSTRUCTION: The attached image is the CHARACTER REFERENCE. 
    You MUST match the character's visual appearance (face, hair, clothing style) from the provided image exactly in the new generated scene.
    High quality, photorealistic, cinematic lighting.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            text: fullPrompt,
          },
          {
            inlineData: {
              mimeType: 'image/jpeg', // We converted to JPEG in resizeImage
              data: cleanBase64,
            },
          },
        ],
      },
    });

    // Parse the response to find the generated image
    // The API might return text (if it refused) or inlineData (the image)
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
            // Return valid data URI
            return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image data found in response. The model may have blocked the request or returned only text.");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to generate image");
  }
};

/**
 * Helper to validate if the API key is theoretically available
 */
export const isApiKeyAvailable = (): boolean => {
  return !!process.env.API_KEY;
};