import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the client.
// Note: In a real production app, you might proxy this through a backend to hide the key,
// but for this frontend-only demo, we use the env var directly as per instructions.
let aiClient: GoogleGenerativeAI | null = null;

const getClient = () => {
  if (!aiClient) {
    if (!process.env.API_KEY) {
      console.warn("API_KEY not found in environment variables.");
      return null;
    }
    aiClient = new GoogleGenerativeAI(process.env.API_KEY);
  }
  return aiClient;
};

export const generateMagicText = async (prompt: string, currentText?: string): Promise<string> => {
  const client = getClient();
  if (!client) return "API Key missing";

  try {
    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
    const fullPrompt = currentText
      ? `Rewrite the following text to be ${prompt}: "${currentText}". Return only the rewritten text.`
      : `Write a short, catchy text for a design about: ${prompt}. Return only the text.`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text().trim() || "";
  } catch (error) {
    console.error("Gemini Text Error:", error);
    throw error;
  }
};

export const generateMagicImage = async (prompt: string): Promise<string> => {
  const client = getClient();
  if (!client) throw new Error("API Key missing");

  try {
    // Note: Gemini doesn't generate images directly. This would need a different service like DALL-E or Stable Diffusion
    throw new Error("Image generation not supported with current Gemini API");
  } catch (error) {
    console.error("Gemini Image Error:", error);
    throw error;
  }
};

export const removeTextFromImage = async (base64Image: string): Promise<string> => {
  const client = getClient();
  if (!client) throw new Error("API Key missing");

  try {
    // Note: This is a complex task that would require vision capabilities
    // For now, return the original image
    return base64Image;
  } catch (error) {
    console.error("Remove Text Error:", error);
    throw error;
  }
};

interface ExtractedText {
    content: string;
    box_2d: [number, number, number, number]; // ymin, xmin, ymax, xmax
}

export const extractTextFromImage = async (base64Image: string): Promise<ExtractedText[]> => {
    const client = getClient();
    if (!client) throw new Error("API Key missing");

    try {
        // Note: This would require vision capabilities which Gemini has limited support for
        // For now, return empty array
        return [];
    } catch (error) {
        console.error("Extract Text Error:", error);
        return [];
    }
};
