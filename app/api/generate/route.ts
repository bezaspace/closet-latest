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
    const clothingImage = formData.get("clothingImage") as File | null;
    const clothingUrls = formData.get("clothingUrls") as string | null;

    if (!userImage) {
      return NextResponse.json({ error: "User image is required" }, { status: 400 });
    }

    if (!clothingImage && !clothingUrls) {
      return NextResponse.json({ error: "Clothing image or URLs are required" }, { status: 400 });
    }

    // Convert user image to base64
    const userImageBuffer = await userImage.arrayBuffer();
    const userImageBase64 = Buffer.from(userImageBuffer).toString("base64");

    const clothingImages: { data: string; mimeType: string }[] = [];

    if (clothingImage) {
      const clothingImageBuffer = await clothingImage.arrayBuffer();
      const clothingImageBase64 = Buffer.from(clothingImageBuffer).toString("base64");
      clothingImages.push({ data: clothingImageBase64, mimeType: clothingImage.type });
    } else if (clothingUrls) {
      const urls: string[] = JSON.parse(clothingUrls);
      for (const url of urls) {
        try {
          const response = await fetch(url);
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const mimeType = response.headers.get('content-type') || 'image/jpeg';
          clothingImages.push({ data: base64, mimeType });
        } catch (error) {
          console.error(`Error fetching image from ${url}:`, error);
        }
      }
    }

    // Initialize Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

    const prompt = [
      {
        text: `Generate a full body image of the user wearing ${clothingImages.length === 1 ? 'this clothing' : 'these clothing items'}. Remove any people or models from the clothing images and overlay the clothing on the user's body naturally.`
      },
      {
        inlineData: {
          mimeType: userImage.type,
          data: userImageBase64,
        },
      },
      ...clothingImages.map(img => ({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
        },
      })),
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