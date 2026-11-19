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

export type SchemeContentFormat = "bullets" | "numbered" | "steps" | "paragraphs" | "checklist" | "list";

export type StructuredSchemeContent = {
  format: SchemeContentFormat;
  items: string[];
};

export type DocumentRequirement = {
  name: string;
  description?: string;
  requirement: "mandatory" | "optional" | "conditional" | "unspecified";
};

export type DocumentChecklist = {
  format: "checklist";
  items: DocumentRequirement[];
  verified?: boolean;
  sourceNote?: string;
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
  documents: StructuredSchemeContent | DocumentChecklist;
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
  genderId?: number;
  search?: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/+$/, "");
export const ADMIN_TOKEN_KEY = "govscheme-admin-token";

export type AdminLoginResponse = {
  token: string;
  admin: { id: string };
};

export async function loginAdmin(id: string, password: string): Promise<AdminLoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, password }),
  });
  const data = await response.json() as AdminLoginResponse & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || `Admin login failed with status ${response.status}`);
  }
  if (!data.token || !data.admin?.id) {
    throw new Error("The server returned an invalid admin login response");
  }

  return data;
}

function getAdminToken(): string {
  const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) throw new Error("Your admin session has expired. Please sign in again.");
  return token;
}

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
      Authorization: `Bearer ${getAdminToken()}`,
    },
  });
  const data = await response.json() as T & { error?: string };

  if (response.status === 401) {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    throw new Error("Your admin session has expired. Please sign in again.");
  }
  if (!response.ok) throw new Error(data.error || `Request to ${path} failed with status ${response.status}`);
  return data;
}

export async function verifyAdminSession(): Promise<{ id: string }> {
  const data = await adminRequest<{ admin: { id: string } }>("/admin/me");
  return data.admin;
}

export async function saveCategory(input: { name: string; description: string }): Promise<Category> {
  const body = new FormData();
  body.set("name", input.name);
  body.set("description", input.description);
  const data = await adminRequest<{ category: Category }>("/categories", { method: "POST", body });
  return data.category;
}

export async function updateCategory(id: number, input: { name?: string; description?: string; isActive?: boolean }): Promise<Category> {
  const body = new FormData();
  if (input.name !== undefined) body.set("name", input.name);
  if (input.description !== undefined) body.set("description", input.description);
  if (input.isActive !== undefined) body.set("isActive", String(input.isActive));
  const data = await adminRequest<{ category: Category }>(`/categories/${id}`, { method: "PATCH", body });
  return data.category;
}

export async function deleteCategory(id: number): Promise<void> {
  await adminRequest(`/categories/${id}`, { method: "DELETE" });
}

export async function saveMinistry(input: { ministry: string; description: string }): Promise<Ministry> {
  const data = await adminRequest<{ ministry: Ministry }>("/ministries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return data.ministry;
}

export async function updateMinistry(id: number, input: { ministry?: string; description?: string; isActive?: boolean }): Promise<Ministry> {
  const data = await adminRequest<{ ministry: Ministry }>(`/ministries/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return data.ministry;
}

export async function deleteMinistry(id: number): Promise<void> {
  await adminRequest(`/ministries/${id}`, { method: "DELETE" });
}

export async function saveGender(gender: string): Promise<Gender> {
  const data = await adminRequest<{ gender: Gender }>("/genders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gender }),
  });
  return data.gender;
}

export async function updateGender(id: number, input: { gender?: string; isActive?: boolean }): Promise<Gender> {
  const data = await adminRequest<{ gender: Gender }>(`/genders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return data.gender;
}

export async function deleteGender(id: number): Promise<void> {
  await adminRequest(`/genders/${id}`, { method: "DELETE" });
}

export async function saveLocation(kind: "state" | "union-territory", name: string): Promise<void> {
  const path = kind === "state" ? "/states" : "/union-territories";
  const field = kind === "state" ? "state" : "ut";
  await adminRequest(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [field]: name }),
  });
}

export async function updateLocation(id: number, kind: "state" | "union-territory", name: string, isActive: boolean): Promise<void> {
  const path = kind === "state" ? "/states" : "/union-territories";
  const field = kind === "state" ? "state" : "ut";
  await adminRequest(`${path}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [field]: name, isActive }),
  });
}

export async function deleteLocation(id: number, kind: "state" | "union-territory"): Promise<void> {
  const path = kind === "state" ? "/states" : "/union-territories";
  await adminRequest(`${path}/${id}`, { method: "DELETE" });
}

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
  const data = await adminRequest<{ scheme?: CreatedScheme }>("/schemes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!data.scheme) {
    throw new Error("The server returned an invalid scheme response");
  }

  return data.scheme;
}

export async function updateScheme(id: number, input: CreateSchemeInput): Promise<void> {
  await adminRequest(`/schemes/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export async function updateSchemeStatus(id: number, isActive: boolean): Promise<void> {
  await adminRequest(`/schemes/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
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

export async function fetchSchemeForAdmin(id: string): Promise<SchemeRecord> {
  const data = await adminRequest<{ scheme: SchemeRecord }>(`/admin/schemes/${encodeURIComponent(id)}`);
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
