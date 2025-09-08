"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import SignIn from "@/components/SignIn";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { getIdToken } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useBasket } from "@/lib/basket-context";
import ProductCard from "@/components/ProductCard";

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { items: basketItems } = useBasket();
  const [mode, setMode] = useState<'instant' | 'studio'>('instant');
  const [userImage, setUserImage] = useState<File | null>(null);
  const [clothingImage, setClothingImage] = useState<File | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <SignIn />;
  }

  const handleGenerate = async () => {
    if (!userImage) return;
    if (mode === 'instant' && !clothingImage) return;
    if (mode === 'studio' && selectedProducts.length === 0) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("userImage", userImage);

    if (mode === 'instant') {
      formData.append("clothingImage", clothingImage!);
    } else {
      const clothingUrls = selectedProducts.map(id => {
        const product = basketItems.find(item => item.id === id);
        return product?.image;
      }).filter(Boolean);
      formData.append("clothingUrls", JSON.stringify(clothingUrls));
    }

    try {
      const token = await getIdToken(user);
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setResultImage(data.image);

      // Upload to Firebase Storage and save URL to Firestore
      if (user && data.image) {
        const base64Data = data.image.split(',')[1]; // Remove data:image/png;base64,
        const mimeType = data.image.split(';')[0].split(':')[1];
        const blob = base64ToBlob(base64Data, mimeType);
        const storageRef = ref(storage, `generations/${user.uid}/${Date.now()}.png`);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        await addDoc(collection(db, "generations"), {
          userId: user.uid,
          imageUrl: downloadURL,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (id: string) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Closet</h1>
        <div className="flex justify-center mb-8">
          <Button
            variant={mode === 'instant' ? 'default' : 'outline'}
            onClick={() => setMode('instant')}
            className="mr-4"
          >
            Instant Mode
          </Button>
          <Button
            variant={mode === 'studio' ? 'default' : 'outline'}
            onClick={() => setMode('studio')}
          >
            Studio Mode
          </Button>
        </div>
        {mode === 'instant' && (
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
        )}
        {mode === 'studio' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Your Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setUserImage(e.target.files?.[0] || null)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Select Products from Basket</CardTitle>
              </CardHeader>
              <CardContent>
                {basketItems.length === 0 ? (
                  <p className="text-muted-foreground">Your basket is empty. Add some products first.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {basketItems.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        mode="select"
                        selected={selectedProducts.includes(product.id)}
                        onSelect={handleSelectProduct}
                      />
                    ))}
                  </div>
                )}
                <Button
                  onClick={handleGenerate}
                  disabled={!userImage || selectedProducts.length === 0 || loading}
                  className="w-full mt-4"
                >
                  {loading ? "Generating..." : `Try On ${selectedProducts.length} Product${selectedProducts.length !== 1 ? 's' : ''}`}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
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
