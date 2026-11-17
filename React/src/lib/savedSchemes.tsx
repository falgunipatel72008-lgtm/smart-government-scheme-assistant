import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "govscheme-saved-scheme-ids";

type SavedSchemesState = {
  ids: number[];
  error: string | null;
};

type SavedSchemesContextValue = SavedSchemesState & {
  toggleSavedScheme: (id: number) => void;
};

const SavedSchemesContext = createContext<SavedSchemesContextValue | null>(null);

function readSavedSchemes(): SavedSchemesState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ids: [], error: null };

    const parsed: unknown = JSON.parse(stored);
    if (
      !Array.isArray(parsed)
      || !parsed.every((id) => typeof id === "number" && Number.isSafeInteger(id) && id > 0)
    ) {
      return { ids: [], error: "Saved schemes data is invalid." };
    }

    return { ids: [...new Set(parsed as number[])], error: null };
  } catch {
    return { ids: [], error: "Saved schemes could not be loaded from this browser." };
  }
}

export function SavedSchemesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(readSavedSchemes);

  useEffect(() => {
    const syncSavedSchemes = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        setState(readSavedSchemes());
      }
    };

    window.addEventListener("storage", syncSavedSchemes);
    return () => window.removeEventListener("storage", syncSavedSchemes);
  }, []);

  const toggleSavedScheme = (id: number) => {
    if (!Number.isSafeInteger(id) || id <= 0) {
      setState((current) => ({ ...current, error: "Unable to update saved schemes." }));
      return;
    }

    const ids = state.ids.includes(id)
      ? state.ids.filter((savedId) => savedId !== id)
      : [...state.ids, id];

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      setState({ ids, error: null });
    } catch {
      setState((current) => ({ ...current, error: "Unable to update saved schemes." }));
    }
  };

  return (
    <SavedSchemesContext.Provider value={{ ...state, toggleSavedScheme }}>
      {children}
    </SavedSchemesContext.Provider>
  );
}

export function useSavedSchemes() {
  const context = useContext(SavedSchemesContext);
  if (!context) throw new Error("useSavedSchemes must be used within SavedSchemesProvider");
  return context;
}
