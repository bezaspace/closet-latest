"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from './auth-context';
import { db } from './firebase';

export interface UserPreferences {
  priceRange?: { min?: number; max?: number };
  categories?: string[];
  brands?: string[];
  maxResults?: number;
  region?: { country: string; tld: string };
}

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  loading: boolean;
}

const defaultPreferences: UserPreferences = {
  maxResults: 20,
  region: { country: 'us', tld: 'com' }
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

interface PreferencesProviderProps {
  children: ReactNode;
}

export const PreferencesProvider = ({ children }: PreferencesProviderProps) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load preferences from Firestore when user changes
  useEffect(() => {
    if (!user) {
      setPreferences(defaultPreferences);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const ref = doc(db, 'preferences', user.uid);
        const snap = await getDoc(ref);
        if (cancelled) return;

        if (snap.exists()) {
          const data = snap.data();
          setPreferences({ ...defaultPreferences, ...data });
        } else {
          // Create default preferences in Firestore
          await setDoc(ref, defaultPreferences);
        }
      } catch (e) {
        console.error('Error loading preferences from Firestore', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);

    if (user) {
      try {
        const ref = doc(db, 'preferences', user.uid);
        await setDoc(ref, updated);
      } catch (e) {
        console.error('Error saving preferences to Firestore', e);
      }
    }
  };

  const value = {
    preferences,
    updatePreferences,
    loading,
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};