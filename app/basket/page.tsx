"use client";

import { useBasket } from '@/lib/basket-context';

export default function BasketPage() {
  const { items, remove } = useBasket();
type Product = {
  id: string;
  name: string;
  price: number;
  image?: string;
  url: string;
};

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Your Basket</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground">Your basket is empty.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
              {items.map((it: Product) => (
            <div key={it.id} className="p-4 border rounded flex items-center gap-4">
              {it.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt={it.name} className="w-24 h-24 object-cover rounded" />
              ) : (
                <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center">No image</div>
              )}
              <div className="flex-1">
                <div className="font-medium">{it.name}</div>
                <div className="text-sm text-muted-foreground">{it.price}</div>
                <a href={it.url} target="_blank" rel="noreferrer" className="text-sm text-primary">View</a>
              </div>
              <div>
                <button className="btn btn-outline btn-sm" onClick={() => remove(it.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
