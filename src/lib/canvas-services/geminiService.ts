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

// Replicate API configuration for OCR
const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';
const OCR_MODEL = 'datalab-to/ocr';

const getReplicateClient = () => {
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) {
    console.warn("REPLICATE_API_TOKEN not found in environment variables.");
    return null;
  }
  return apiKey;
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
  const replicateApiKey = getReplicateClient();
  if (!replicateApiKey) {
    console.warn("REPLICATE_API_TOKEN not found, text removal disabled - returning original image");
    return base64Image;
  }

  try {
    console.log("Attempting text removal with Replicate...");

    // Note: Text removal is complex and may require specific models
    // For now, we'll return the original image and log that text removal
    // would need a dedicated inpainting/removal model
    console.log("Text removal requires specialized inpainting models. Returning original image for now.");

    // TODO: Implement text removal using models like:
    // - lama (for inpainting)
    // - stable-diffusion-inpainting (for text removal)
    // - or other text removal specific models

    return base64Image;
  } catch (error) {
    console.error("Remove Text Error:", error);
    // Return original image on error
    return base64Image;
  }
};

interface ExtractedText {
    content: string;
    box_2d: [number, number, number, number]; // ymin, xmin, ymax, xmax
}

export const extractTextFromImage = async (base64Image: string): Promise<ExtractedText[]> => {
    const replicateApiKey = getReplicateClient();
    if (!replicateApiKey) {
        console.warn("REPLICATE_API_TOKEN not found, OCR functionality disabled");
        return [];
    }

    try {
        console.log("Starting OCR extraction with Replicate datalab-to/ocr model...");

        // Convert base64 to blob URL for Replicate
        const imageBlob = await fetch(`data:image/jpeg;base64,${base64Image}`).then(res => res.blob());
        const formData = new FormData();
        formData.append('file', imageBlob, 'image.jpg');

        // Call Replicate datalab-to/ocr model
        const response = await fetch(`${REPLICATE_API_URL}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${replicateApiKey}`,
            },
            body: JSON.stringify({
                version: "9a74a245842759e2c7b0c569db5cca4f916d74557bc4e07e0be7391d2d64d1f0", // datalab-to/ocr model version
                input: {
                    image: `data:image/jpeg;base64,${base64Image}`,
                    format: "json"
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Replicate API error: ${response.status} ${response.statusText}`);
        }

        const prediction = await response.json();
        console.log("Replicate prediction started:", prediction.id);

        // Poll for completion
        const result = await pollReplicatePrediction(prediction.urls?.get || `${REPLICATE_API_URL}/${prediction.id}`, replicateApiKey);

        if (!result.output) {
            console.warn("No OCR output received from Replicate");
            return [];
        }

        // Parse the OCR result
        const extractedTexts: ExtractedText[] = [];

        // The datalab-to/ocr model returns OCR results in a specific format
        if (result.output && Array.isArray(result.output)) {
            result.output.forEach((item: any) => {
                if (item.text && item.box) {
                    // Convert box coordinates to the expected format [ymin, xmin, ymax, xmax]
                    const box = item.box;
                    extractedTexts.push({
                        content: item.text,
                        box_2d: [box[1], box[0], box[3], box[2]] // Convert from [x1,y1,x2,y2] to [ymin,xmin,ymax,xmax]
                    });
                }
            });
        }

        console.log(`Successfully extracted ${extractedTexts.length} text elements from image`);
        return extractedTexts;

    } catch (error) {
        console.error("OCR extraction error:", error);
        return [];
    }
};

// Helper function to poll Replicate prediction status
async function pollReplicatePrediction(predictionUrl: string, apiKey: string, maxAttempts: number = 30): Promise<any> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const response = await fetch(predictionUrl, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'succeeded') {
                return result;
            } else if (result.status === 'failed') {
                throw new Error(`Prediction failed: ${result.error}`);
            } else if (result.status === 'canceled') {
                throw new Error('Prediction was canceled');
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error(`Poll attempt ${attempt + 1} failed:`, error);
            if (attempt === maxAttempts - 1) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    throw new Error('Prediction polling timed out');
}
