/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from './auth-context';
import { db } from './firebase';

type Item = any;

const BasketContext = createContext<{
  items: Item[];
  add: (i: Item) => void;
  remove: (id: string) => void;
}>({ items: [], add: () => {}, remove: () => {} });

export const BasketProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<Item[]>([]);
  const { user } = useAuth();

  // Load initial basket from localStorage (anonymous default)
  useEffect(() => {
    const raw = localStorage.getItem('basket');
    if (raw) setItems(JSON.parse(raw));
  }, []);

  // Persist locally on every change
  useEffect(() => {
    try {
      localStorage.setItem('basket', JSON.stringify(items));
    } catch (e) {
      // ignore localStorage failures (e.g. private mode)
      // eslint-disable-next-line no-console
      console.warn('Could not persist basket to localStorage', e);
    }
  }, [items]);

  // When a user signs in, load their Firestore basket (or seed it from localStorage)
  useEffect(() => {
    if (!user) return; // nothing to do for signed-out

    let cancelled = false;
    (async () => {
      try {
        const ref = doc(db, 'baskets', user.uid);
        const snap = await getDoc(ref);
        if (cancelled) return;

        if (snap.exists()) {
          const data = snap.data();
          if (data && Array.isArray(data.items)) setItems(data.items);
        } else {
          // If no Firestore doc, seed it with any local items (if present)
          const raw = localStorage.getItem('basket');
          const local = raw ? JSON.parse(raw) : [];
          await setDoc(ref, { items: local });
          if (!cancelled && Array.isArray(local) && local.length) setItems(local);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error loading basket from Firestore', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Helper to ensure an item has an id
  const normalize = (i: Item) => {
    if (!i) return i;
    if (i.id) return i;
    // Use url or name fallback, otherwise timestamp
    const fallback = i.url || i.name || `item_${Date.now()}`;
    return { ...i, id: String(fallback) };
  };

  const add = (i: Item) => {
    const item = normalize(i);
    setItems((s) => {
      const next = [...s, item];
      // persist to Firestore for signed-in users
      if (user) {
        const ref = doc(db, 'baskets', user.uid);
        setDoc(ref, { items: next }).catch((e) => {
          // eslint-disable-next-line no-console
          console.error('Error writing basket to Firestore', e);
        });
      }
      return next;
    });
  };

  const remove = (id: string) => {
    setItems((s) => {
      const next = s.filter((x) => x.id !== id);
      if (user) {
        const ref = doc(db, 'baskets', user.uid);
        setDoc(ref, { items: next }).catch((e) => {
          // eslint-disable-next-line no-console
          console.error('Error writing basket to Firestore', e);
        });
      }
      return next;
    });
  };

  return <BasketContext.Provider value={{ items, add, remove }}>{children}</BasketContext.Provider>;
};

export const useBasket = () => useContext(BasketContext);
