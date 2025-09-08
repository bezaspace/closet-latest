/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function shortTitle(t: string | undefined, n = 60) {
  if (!t) return '';
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

export default function ProductCard({ product, onAdd }: { product: any; onAdd: () => void }) {
  return (
    <Card className="h-full">
      <CardHeader className="p-0">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name} className="w-full h-40 object-cover rounded-t-xl" />
        ) : (
          <div className="w-full h-40 bg-gray-100 rounded-t-xl flex items-center justify-center">No image</div>
        )}
      </CardHeader>

      <CardContent className="py-3">
        <CardTitle className="text-sm">{shortTitle(product.name)}</CardTitle>
        <div className="mt-2 text-sm text-muted-foreground">{product.price ?? ''}</div>
      </CardContent>

      <CardFooter>
        <a href={product.url || '#'} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground">View</a>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={onAdd}>Add</Button>
        </div>
      </CardFooter>
    </Card>
  );
}
