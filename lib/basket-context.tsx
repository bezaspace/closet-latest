/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createContext, useContext, useEffect, useState } from 'react';

type Item = any;

const BasketContext = createContext<{
  items: Item[];
  add: (i: Item) => void;
  remove: (id: string) => void;
}>({ items: [], add: () => {}, remove: () => {} });

export const BasketProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('basket');
    if (raw) setItems(JSON.parse(raw));
  }, []);

  useEffect(() => {
    localStorage.setItem('basket', JSON.stringify(items));
  }, [items]);

  const add = (i: Item) => setItems((s) => [...s, i]);
  const remove = (id: string) => setItems((s) => s.filter((x) => x.id !== id));

  return <BasketContext.Provider value={{ items, add, remove }}>{children}</BasketContext.Provider>;
};

export const useBasket = () => useContext(BasketContext);
