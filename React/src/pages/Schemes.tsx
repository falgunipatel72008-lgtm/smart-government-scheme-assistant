import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Building2, ChevronLeft, ChevronRight, MapPin, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import SavedSchemeButton from "@/components/SavedSchemeButton";
import {
  fetchCategories,
  fetchGenders,
  fetchLocations,
  fetchMinistries,
  fetchSchemes,
  type Category,
  type Gender,
  type Location,
  type Ministry,
  type SchemeRecord,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const PAGE_SIZE = 8;
const ALL_CATEGORIES = "All categories";
const MASTER_FILTERS = [
  ["ministryId", "ministry"],
  ["stateId", "state"],
  ["unionTerritoryId", "union territory"],
  ["genderId", "gender"],
] as const;

function parseId(value: string | null): number | undefined {
  if (!value) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

function coverageLabel(
  scheme: SchemeRecord,
  t: (text: string) => string,
  locationName: (name: string) => string,
) {
  if (scheme.coverage.type === "ALL_INDIA") return t("All India");
  const locations = [
    ...scheme.coverage.states.map((location) => locationName(location.name)),
    ...scheme.coverage.unionTerritories.map((location) => locationName(location.name)),
  ];
  return locations.join(", ") || t("Selected locations");
}

export default function Schemes() {
  const { t, categoryName, ministryName, locationName, schemeName, schemeText } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [schemes, setSchemes] = useState<SchemeRecord[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalItems: 0,
    totalPages: 0,
    hasPrevious: false,
    hasNext: false,
  });
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [schemeError, setSchemeError] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [schemesLoading, setSchemesLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const searchParam = searchParams.get("search") ?? "";
  const [query, setQuery] = useState(searchParam);
  const [submittedQuery, setSubmittedQuery] = useState(searchParam);

  const page = parseId(searchParams.get("page")) ?? 1;
  const categoryParam = searchParams.get("categoryId");
  const requestedCategoryId = parseId(categoryParam);
  const selectedMasterFilter = MASTER_FILTERS.find(([key]) => searchParams.has(key));
  const selectedMasterValue = selectedMasterFilter ? searchParams.get(selectedMasterFilter[0]) : null;

  useEffect(() => {
    const controller = new AbortController();
    setCategoriesLoading(true);
    setCategoryError(null);
    Promise.all([
      fetchCategories(controller.signal),
      fetchMinistries(controller.signal),
      fetchLocations(controller.signal),
      fetchGenders(controller.signal),
    ])
      .then(([nextCategories, nextMinistries, nextLocations, nextGenders]) => {
        setCategories(nextCategories.filter((item) => item.isActive));
        setMinistries(nextMinistries.filter((item) => item.isActive));
        setLocations(nextLocations.filter((item) => item.isActive));
        setGenders(nextGenders.filter((item) => item.isActive));
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setCategoryError(requestError instanceof Error ? requestError.message : "Unable to load categories.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCategoriesLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery === submittedQuery) return undefined;
    const timeout = window.setTimeout(() => {
      setSubmittedQuery(normalizedQuery);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("page");
        if (normalizedQuery) next.set("search", normalizedQuery);
        else next.delete("search");
        return next;
      }, { replace: true });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [query, submittedQuery, setSearchParams]);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.isActive),
    [categories],
  );
  const activeMinistries = useMemo(() => ministries.filter((ministry) => ministry.isActive), [ministries]);
  const activeStates = useMemo(
    () => locations.filter((location) => location.isActive && !location.isUnionTerritory),
    [locations],
  );
  const activeUnionTerritories = useMemo(
    () => locations.filter((location) => location.isActive && location.isUnionTerritory),
    [locations],
  );
  const activeGenders = useMemo(() => genders.filter((gender) => gender.isActive), [genders]);
  const selectedCategory = activeCategories.find((category) => category.id === requestedCategoryId);
  const categoryUnavailable = categoryParam !== null && !selectedCategory && !categoriesLoading;

  useEffect(() => {
    const controller = new AbortController();
    setSchemesLoading(true);
    setSchemeError(null);
    fetchSchemes({
      page,
      pageSize: PAGE_SIZE,
      search: submittedQuery,
      ...(requestedCategoryId !== undefined ? { categoryId: requestedCategoryId } : {}),
      ...(parseId(searchParams.get("ministryId")) !== undefined
        ? { ministryId: parseId(searchParams.get("ministryId")) }
        : {}),
      ...(parseId(searchParams.get("stateId")) !== undefined
        ? { stateId: parseId(searchParams.get("stateId")) }
        : {}),
      ...(parseId(searchParams.get("unionTerritoryId")) !== undefined
        ? { unionTerritoryId: parseId(searchParams.get("unionTerritoryId")) }
        : {}),
      ...(parseId(searchParams.get("genderId")) !== undefined
        ? { genderId: parseId(searchParams.get("genderId")) }
        : {}),
    }, controller.signal)
      .then((result) => {
        setSchemes(result.schemes);
        setPagination(result.pagination);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setSchemeError(requestError instanceof Error ? requestError.message : "Unable to load schemes.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSchemesLoading(false);
      });

    return () => controller.abort();
  }, [page, requestedCategoryId, reloadKey, searchParams, submittedQuery]);

  const selectCategory = (id?: number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (id === undefined) next.delete("categoryId");
      else next.set("categoryId", String(id));
      next.delete("page");
      return next;
    });
  };

  const selectMasterFilter = (key: string, value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      return next;
    });
  };

  const selectLocationFilter = (value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("stateId");
      next.delete("unionTerritoryId");
      if (value.startsWith("state:")) next.set("stateId", value.slice(6));
      if (value.startsWith("ut:")) next.set("unionTerritoryId", value.slice(3));
      next.delete("page");
      return next;
    });
  };

  const clearFilters = () => {
    setQuery("");
    setSubmittedQuery("");
    setSearchParams({});
  };

  const setPage = (nextPage: number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextPage <= 1) next.delete("page");
      else next.set("page", String(nextPage));
      return next;
    });
  };

  const hasFilters = categoryParam !== null || selectedMasterFilter !== undefined;
  const startItem = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(pagination.page * PAGE_SIZE, pagination.totalItems);

  return (
    <div className="bg-slate-50">
      <section className="bg-slate-900 py-14 text-white">
        <div className="container mx-auto px-4">
          <Badge variant="outline" className="mb-4 border-secondary text-secondary">{t("Scheme directory")}</Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{t("All government schemes")}</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            {t("Browse schemes saved in the database, including their benefits and eligibility information.")}
          </p>
          <div className="relative mt-8 max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-14 rounded-xl border-none bg-white pl-12 text-slate-900"
              placeholder={t("Search schemes, ministries or benefits...")}
              aria-label={t("Search schemes")}
            />
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-col gap-5">
          <div>
            <h2 className="text-2xl font-bold">{t("Browse schemes")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {schemesLoading ? t("Loading schemes…") : t("Showing {start}–{end} of {total} schemes", { start: startItem, end: endItem, total: pagination.totalItems })}
            </p>
            {selectedMasterFilter && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Filtered by {filter} (ID {id})", { filter: t(selectedMasterFilter[1]), id: selectedMasterValue ?? "" })}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-700">{t("Filter schemes")}</p>
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="scheme-category-filter" className="sr-only">{t("Categories")}</label>
              <select
                id="scheme-category-filter"
                value={requestedCategoryId === undefined ? "" : String(requestedCategoryId)}
                onChange={(event) => {
                  const value = event.target.value;
                  selectCategory(value ? Number(value) : undefined);
                }}
                className="h-10 min-w-56 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t(ALL_CATEGORIES)}</option>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>{categoryName(category.name)}</option>
                ))}
              </select>
              <label htmlFor="scheme-ministry-filter" className="sr-only">{t("Ministry")}</label>
              <select
                id="scheme-ministry-filter"
                value={searchParams.get("ministryId") ?? ""}
                onChange={(event) => selectMasterFilter("ministryId", event.target.value)}
                className="h-10 min-w-48 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t("All ministries")}</option>
                {activeMinistries.map((ministry) => (
                  <option key={ministry.id} value={ministry.id}>{ministryName(ministry.ministry)}</option>
                ))}
              </select>
              <label htmlFor="scheme-location-filter" className="sr-only">{t("State or union territory")}</label>
              <select
                id="scheme-location-filter"
                value={searchParams.get("stateId") ? `state:${searchParams.get("stateId")}` : searchParams.get("unionTerritoryId") ? `ut:${searchParams.get("unionTerritoryId")}` : ""}
                onChange={(event) => selectLocationFilter(event.target.value)}
                className="h-10 min-w-52 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t("All states and UTs")}</option>
                <optgroup label={t("States")}>
                  {activeStates.map((location) => (
                    <option key={location.id} value={`state:${location.id}`}>{locationName(location.name)}</option>
                  ))}
                </optgroup>
                <optgroup label={t("Union territories")}>
                  {activeUnionTerritories.map((location) => (
                    <option key={location.id} value={`ut:${location.id}`}>{locationName(location.name)}</option>
                  ))}
                </optgroup>
              </select>
              <label htmlFor="scheme-gender-filter" className="sr-only">{t("Gender")}</label>
              <select
                id="scheme-gender-filter"
                value={searchParams.get("genderId") ?? ""}
                onChange={(event) => selectMasterFilter("genderId", event.target.value)}
                className="h-10 min-w-40 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t("All genders")}</option>
                {activeGenders.map((gender) => (
                  <option key={gender.id} value={gender.id}>{schemeText(gender.gender)}</option>
                ))}
              </select>
              {(hasFilters || submittedQuery) && (
                <Button type="button" variant="ghost" onClick={clearFilters}>{t("Clear filters")}</Button>
              )}
            </div>
          </div>
        </div>

        {categoriesLoading && <p role="status" className="mb-6 text-sm text-muted-foreground">{t("Loading categories…")}</p>}
        {categoryError && (
          <div role="alert" className="mb-6 flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 sm:flex-row sm:items-center sm:justify-between">
            <p>{t("Category filters could not be loaded:")} {categoryError}</p>
            <Button type="button" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" /> {t("Retry")}
            </Button>
          </div>
        )}
        {schemeError && (
          <div role="alert" className="mb-6 flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 sm:flex-row sm:items-center sm:justify-between">
            <p>{schemeError}</p>
            <Button type="button" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" /> {t("Retry")}
            </Button>
          </div>
        )}

        {schemesLoading && <p role="status" className="py-12 text-center text-muted-foreground">{t("Loading schemes…")}</p>}

        {!schemesLoading && !schemeError && !categoryUnavailable && schemes.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {schemes.map((scheme) => (
              <Card key={scheme.id} className="border-slate-200 bg-white transition-shadow hover:shadow-lg">
                <CardHeader className="pb-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {scheme.categories.map((category) => (
                        <Badge key={category.id} variant="secondary" className="bg-slate-100 text-slate-600">
                          {categoryName(category.name)}
                        </Badge>
                      ))}
                    </div>
                    {scheme.code && <Badge variant="outline">{scheme.code}</Badge>}
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight">{schemeText(schemeName(scheme.code, scheme.name))}</h2>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-start gap-2">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{ministryName(scheme.ministry.name)}</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{coverageLabel(scheme, t, locationName)}</span>
                    </p>
                  </div>
                  {scheme.details.items[0] && (
                    <p className="mb-4 text-sm leading-relaxed text-slate-600">{schemeText(scheme.details.items[0])}</p>
                  )}
                  {scheme.benefits.items.length > 0 && (
                    <div className="border-y border-slate-100 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Benefits")}</p>
                      <p className="mt-1 text-sm font-semibold text-primary">{schemeText(scheme.benefits.items[0])}</p>
                    </div>
                  )}
                  <Button asChild variant="outline" className="group mt-5 w-full border-primary text-primary hover:bg-primary hover:text-white">
                    <Link to={`/schemes/${scheme.id}`}>
                      {t("View scheme details")} <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  <SavedSchemeButton schemeId={scheme.id} className="mt-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!schemesLoading && !schemeError && (categoryUnavailable || schemes.length === 0) && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <Search className="mx-auto mb-4 h-8 w-8 text-slate-400" />
            <h3 className="text-lg font-bold">{t(categoryUnavailable ? "Category not available" : "No schemes found")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {categoryUnavailable
                ? t("The selected category is not available.")
                : t("Try another search term or filter. Schemes will appear here when they have been saved.")}
            </p>
          </div>
        )}

        {!schemesLoading && !schemeError && pagination.totalPages > 1 && (
          <nav aria-label={t("Scheme pages")} className="mt-8 flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage(pagination.page - 1)}
              disabled={!pagination.hasPrevious}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> {t("Previous")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("Page {page} of {total}", { page: pagination.page, total: pagination.totalPages })}
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage(pagination.page + 1)}
              disabled={!pagination.hasNext}
            >
              {t("Next")} <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </nav>
        )}
      </main>
    </div>
  );
}
