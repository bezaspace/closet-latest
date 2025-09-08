"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [userImage, setUserImage] = useState<File | null>(null);
  const [clothingImage, setClothingImage] = useState<File | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!userImage || !clothingImage) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("userImage", userImage);
    formData.append("clothingImage", clothingImage);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setResultImage(data.image);
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Closet</h1>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setUserImage(e.target.files?.[0] || null)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Clothing Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setClothingImage(e.target.files?.[0] || null)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!userImage || !clothingImage || loading}
              className="w-full"
            >
              {loading ? "Generating..." : "Generate Try-On"}
            </Button>
          </CardContent>
        </Card>
        {resultImage && (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent>
              <img src={resultImage} alt="Generated try-on" className="w-full max-w-md mx-auto" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
