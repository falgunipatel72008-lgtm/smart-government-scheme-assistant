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

export type CriteriaOption = {
  id: number;
  code: string;
  label: string;
  sortOrder: number;
};

export type CriteriaDimension = {
  id: number;
  code: string;
  name: string;
  inputType: "SINGLE_SELECT" | "MULTI_SELECT" | "NUMERIC";
  options: CriteriaOption[];
};

export type SchemeContentFormat = "bullets" | "numbered" | "steps" | "checklist" | "paragraphs";

export type StructuredSchemeContent = {
  format: SchemeContentFormat;
  items: string[];
};

export type CreateSchemeInput = {
  name: string;
  code?: string;
  ministryId: number;
  categoryIds: number[];
  coverage: {
    allIndia: boolean;
    stateIds: number[];
    unionTerritoryIds: number[];
  };
  details: StructuredSchemeContent;
  benefits: StructuredSchemeContent;
  eligibilityInfo: StructuredSchemeContent;
  documents: StructuredSchemeContent;
  applicationProcess: {
    online: {
      enabled: boolean;
      subsections: { title: string; format: SchemeContentFormat; steps: string[] }[];
    };
    offline: {
      enabled: boolean;
      subsections: { title: string; format: SchemeContentFormat; steps: string[] }[];
    };
  };
  criteria: Record<string, number[]>;
  numericRules: Record<string, { min: number | null; max: number | null }>;
};

export type CreatedScheme = {
  id: number;
  name: string;
  code: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SchemeRecord = {
  id: number;
  code: string | null;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ministry: { id: number; name: string };
  categories: { id: number; name: string }[];
  coverage: {
    type: "ALL_INDIA" | "SELECTED";
    states: { id: number; name: string }[];
    unionTerritories: { id: number; name: string }[];
  };
  details: StructuredSchemeContent;
  benefits: StructuredSchemeContent;
  eligibilityInfo: StructuredSchemeContent;
  applicationProcess: CreateSchemeInput["applicationProcess"];
  documents: StructuredSchemeContent;
  genders: { id: number; name: string }[];
  criteria: {
    id: number;
    code: string;
    name: string;
    options: { id: number; code: string; label: string }[];
  }[];
  numericRules: {
    dimensionId: number;
    code: string;
    name: string;
    min: number | null;
    max: number | null;
  }[];
};

export type SchemeListing = {
  schemes: SchemeRecord[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
};

export type SchemeListFilters = {
  page: number;
  pageSize: number;
  categoryId?: number;
  ministryId?: number;
  stateId?: number;
  unionTerritoryId?: number;
  search?: string;
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

export async function createScheme(input: CreateSchemeInput): Promise<CreatedScheme> {
  const response = await fetch(`${API_BASE_URL}/schemes`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const data = await response.json() as { scheme?: CreatedScheme; error?: string };

  if (!response.ok) {
    throw new Error(data.error || `Creating scheme failed with status ${response.status}`);
  }
  if (!data.scheme) {
    throw new Error("The server returned an invalid scheme response");
  }

  return data.scheme;
}

export async function fetchSchemes(
  filters: SchemeListFilters,
  signal?: AbortSignal,
): Promise<SchemeListing> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return get<SchemeListing>(`/schemes?${query.toString()}`, signal);
}

export async function fetchScheme(id: string, signal?: AbortSignal): Promise<SchemeRecord> {
  const data = await get<{ scheme: SchemeRecord }>(`/schemes/${encodeURIComponent(id)}`, signal);
  return data.scheme;
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

export async function fetchCriteriaOptions(signal?: AbortSignal): Promise<CriteriaDimension[]> {
  const data = await get<{ dimensions: CriteriaDimension[] }>("/criteria/options", signal);
  return data.dimensions;
}
