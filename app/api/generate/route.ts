import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Basic auth check: require Authorization header (in production, verify token with Firebase Admin SDK)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const formData = await request.formData();
    const userImage = formData.get("userImage") as File;
    const clothingImage = formData.get("clothingImage") as File;

    if (!userImage || !clothingImage) {
      return NextResponse.json({ error: "Both images are required" }, { status: 400 });
    }

    // Convert files to base64
    const userImageBuffer = await userImage.arrayBuffer();
    const userImageBase64 = Buffer.from(userImageBuffer).toString("base64");

    const clothingImageBuffer = await clothingImage.arrayBuffer();
    const clothingImageBase64 = Buffer.from(clothingImageBuffer).toString("base64");

    // Initialize Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

    const prompt = [
      {
        text: "Generate a full body image of the user wearing this clothing. Remove any people or models from the clothing image and overlay the clothing on the user's body naturally."
      },
      {
        inlineData: {
          mimeType: userImage.type,
          data: userImageBase64,
        },
      },
      {
        inlineData: {
          mimeType: clothingImage.type,
          data: clothingImageBase64,
        },
      },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: prompt,
    });

    if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts) {
      return NextResponse.json({ error: "No response from Gemini" }, { status: 500 });
    }

    let generatedImage = null;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!generatedImage) {
      return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
    }

    return NextResponse.json({ image: generatedImage });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}