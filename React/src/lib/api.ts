export type Category = {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Gender = {
  id: number;
  gender: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Location = {
  id: number;
  name: string;
  isUnionTerritory: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Ministry = {
  id: number;
  ministry: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/+$/, "");

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  const data = await get<{ categories: Category[] }>("/categories", signal);
  return data.categories;
}

export async function fetchGenders(signal?: AbortSignal): Promise<Gender[]> {
  const data = await get<{ genders: Gender[] }>("/genders", signal);
  return data.genders;
}

export async function fetchLocations(signal?: AbortSignal): Promise<Location[]> {
  const data = await get<{ locations: Location[] }>("/locations", signal);
  return data.locations;
}

export async function fetchMinistries(signal?: AbortSignal): Promise<Ministry[]> {
  const data = await get<{ ministries: Ministry[] }>("/ministries", signal);
  return data.ministries;
}
