import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  fetchCategories,
  fetchCriteriaOptions,
  fetchLocations,
  fetchMinistries,
  createScheme,
  type Category,
  type CreateSchemeInput,
  type CriteriaDimension,
  type Location,
  type Ministry,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Option = {
  value: string;
  label: string;
};

type NumericRule = {
  min: string;
  max: string;
};

type ContentFormat = "bullets" | "numbered" | "steps" | "checklist" | "paragraphs";

type StructuredContent = {
  format: ContentFormat;
  items: string[];
};

type ApplicationSubsection = {
  id: string;
  title: string;
  format: ContentFormat;
  steps: string[];
};

type ApplicationMode = {
  enabled: boolean;
  subsections: ApplicationSubsection[];
};

type SchemeDraft = {
  name: string;
  code: string;
  details: StructuredContent;
  benefits: StructuredContent;
  eligibilityInfo: StructuredContent;
  documents: StructuredContent;
  applicationProcess: {
    online: ApplicationMode;
    offline: ApplicationMode;
  };
  ministryId: string;
  categoryIds: string[];
  allIndia: boolean;
  locationKeys: string[];
  criteria: Record<string, string[]>;
  numericRules: Record<string, NumericRule>;
};

const CONTENT_FORMATS: { value: ContentFormat; label: string }[] = [
  { value: "bullets", label: "Bullet points" },
  { value: "numbered", label: "Numbered list" },
  { value: "steps", label: "Steps" },
  { value: "checklist", label: "Checklist" },
  { value: "paragraphs", label: "Paragraphs" },
];

const NUMERIC_FIELD_DETAILS: Record<string, { unit: string; step: string; max?: string }> = {
  AGE: { unit: "years", step: "1", max: "120" },
  DISABILITY_PERCENT: { unit: "%", step: "1", max: "100" },
  FAMILY_INCOME: { unit: "₹", step: "1000" },
};

const initialNumericRules = Object.fromEntries(
  Object.keys(NUMERIC_FIELD_DETAILS).map((code) => [code, { min: "", max: "" }]),
) as Record<string, NumericRule>;

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createApplicationSubsection(): ApplicationSubsection {
  return {
    id: createId(),
    title: "",
    format: "steps",
    steps: [""],
  };
}

function createInitialDraft(): SchemeDraft {
  return {
    name: "",
    code: "",
    details: { format: "paragraphs", items: [""] },
    benefits: { format: "bullets", items: [""] },
    eligibilityInfo: { format: "bullets", items: [""] },
    documents: { format: "checklist", items: [""] },
    applicationProcess: {
      online: { enabled: true, subsections: [createApplicationSubsection()] },
      offline: { enabled: false, subsections: [] },
    },
    ministryId: "",
    categoryIds: [],
    allIndia: true,
    locationKeys: [],
    criteria: {},
    numericRules: Object.fromEntries(
      Object.keys(NUMERIC_FIELD_DETAILS).map((code) => [code, { min: "", max: "" }]),
    ),
  };
}

function OptionChecklist({
  id,
  label,
  options,
  selected,
  onChange,
  helperText,
}: {
  id: string;
  label: string;
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  helperText?: string;
}) {
  const { t } = useI18n();
  const toggleOption = (value: string, checked: boolean) => {
    onChange(
      checked
        ? [...selected, value]
        : selected.filter((selectedValue) => selectedValue !== value),
    );
  };

  return (
    <fieldset className="space-y-3">
      <legend className="font-semibold">{label}</legend>
      {helperText && <p className="text-sm text-muted-foreground">{helperText}</p>}
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("No active options are available.")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((option) => (
            <label
              key={option.value}
              htmlFor={`${id}-${option.value}`}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm hover:border-primary/40"
            >
              <Checkbox
                id={`${id}-${option.value}`}
                checked={selected.includes(option.value)}
                onCheckedChange={(checked) => toggleOption(option.value, checked === true)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function locationKey(location: Location) {
  return `${location.isUnionTerritory ? "ut" : "state"}:${location.id}`;
}

export default function CreateScheme() {
  const { t, categoryName, ministryName, locationName } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [criteriaDimensions, setCriteriaDimensions] = useState<CriteriaDimension[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [draft, setDraft] = useState<SchemeDraft>(createInitialDraft);
  const [showPreview, setShowPreview] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSchemeId, setSavedSchemeId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      fetchCategories(controller.signal),
      fetchLocations(controller.signal),
      fetchMinistries(controller.signal),
      fetchCriteriaOptions(controller.signal),
    ])
      .then(([nextCategories, nextLocations, nextMinistries, nextCriteriaDimensions]) => {
        setCategories(nextCategories.filter((item) => item.isActive));
        setLocations(nextLocations.filter((item) => item.isActive));
        setMinistries(nextMinistries.filter((item) => item.isActive));
        setCriteriaDimensions(nextCriteriaDimensions);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load scheme form values.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const states = useMemo(
    () => locations.filter((location) => !location.isUnionTerritory),
    [locations],
  );
  const unionTerritories = useMemo(
    () => locations.filter((location) => location.isUnionTerritory),
    [locations],
  );
  const selectedMinistryName = ministries.find((ministry) => String(ministry.id) === draft.ministryId)?.ministry;
  const selectedCategoryNames = categories
    .filter((category) => draft.categoryIds.includes(String(category.id)))
    .map((category) => categoryName(category.name));
  const selectedLocations = locations.filter((location) => draft.locationKeys.includes(locationKey(location)));

  const workStatusDimension = criteriaDimensions.find((dimension) => dimension.code === "WORK_STATUS");
  const employedOptionId = workStatusDimension?.options.find((option) => option.code === "EMPLOYED")?.id;
  const isEmployedSelected = employedOptionId !== undefined
    && (draft.criteria.WORK_STATUS ?? []).includes(String(employedOptionId));
  const disabilityDimension = criteriaDimensions.find((dimension) => dimension.code === "DISABILITY_STATUS");
  const disabilityYesOptionId = disabilityDimension?.options.find((option) => option.code === "YES")?.id;
  const isDisabilitySelected = disabilityYesOptionId !== undefined
    && (draft.criteria.DISABILITY_STATUS ?? []).includes(String(disabilityYesOptionId));

  const updateCriteria = (code: string, selected: string[]) => {
    setDraft((current) => ({
      ...current,
      criteria: { ...current.criteria, [code]: selected },
    }));
  };

  const updateNumericRule = (code: string, bound: keyof NumericRule, value: string) => {
    setDraft((current) => ({
      ...current,
      numericRules: {
        ...current.numericRules,
        [code]: { ...current.numericRules[code], [bound]: value },
      },
    }));
  };

  const updateContent = (
    key: "details" | "benefits" | "eligibilityInfo" | "documents",
    content: StructuredContent,
  ) => {
    setDraft((current) => ({ ...current, [key]: content }));
  };

  const updateApplicationMode = (
    modeName: "online" | "offline",
    update: (mode: ApplicationMode) => ApplicationMode,
  ) => {
    setDraft((current) => ({
      ...current,
      applicationProcess: {
        ...current.applicationProcess,
        [modeName]: update(current.applicationProcess[modeName]),
      },
    }));
  };

  const toggleLocation = (key: string, checked: boolean) => {
    setDraft((current) => ({
      ...current,
      locationKeys: checked
        ? [...current.locationKeys, key]
        : current.locationKeys.filter((selectedKey) => selectedKey !== key),
    }));
  };

  const toggleCategory = (id: string, checked: boolean) => {
    setDraft((current) => ({
      ...current,
      categoryIds: checked
        ? [...current.categoryIds, id]
        : current.categoryIds.filter((selectedId) => selectedId !== id),
    }));
  };

  const changeWorkStatus = (selected: string[]) => {
    setDraft((current) => ({
      ...current,
      criteria: {
        ...current.criteria,
        WORK_STATUS: selected,
        ...(employedOptionId !== undefined && selected.includes(String(employedOptionId))
          ? {}
          : { EMPLOYMENT_TYPE: [] }),
      },
    }));
  };

  const changeDisabilityStatus = (selected: string[]) => {
    setDraft((current) => ({
      ...current,
      criteria: { ...current.criteria, DISABILITY_STATUS: selected },
      numericRules: disabilityYesOptionId !== undefined && selected.includes(String(disabilityYesOptionId))
        ? current.numericRules
        : { ...current.numericRules, DISABILITY_PERCENT: { min: "", max: "" } },
    }));
  };

  const resetDraft = () => {
    setDraft(createInitialDraft());
    setShowPreview(false);
    setFormError(null);
    setSavedSchemeId(null);
  };

  const validateMetadata = () => {
    if (!draft.name.trim()) {
      setFormError(t("Enter a scheme name."));
      return false;
    }
    if (!draft.ministryId) {
      setFormError(t("Select a ministry."));
      return false;
    }
    if (draft.categoryIds.length === 0) {
      setFormError(t("Select at least one subject category."));
      setShowPreview(false);
      return false;
    }
    if (!draft.allIndia && draft.locationKeys.length === 0) {
      setFormError(t("Select at least one state or union territory, or choose All India."));
      setShowPreview(false);
      return false;
    }
    return true;
  };

  const onPreview = () => {
    if (!validateMetadata()) return;
    setFormError(null);
    setShowPreview(true);
  };

  const onCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateMetadata()) return;
    const requiredContent = [
      ["Details", draft.details],
      ["Benefits", draft.benefits],
      ["Eligibility information", draft.eligibilityInfo],
      ["Documents required", draft.documents],
    ] as const;
    const missingContent = requiredContent.find(([, content]) =>
      !content.items.some((item) => item.trim())
    );
    if (missingContent) {
      setFormError(t("Add at least one item to {section}.", { section: t(missingContent[0]).toLowerCase() }));
      return;
    }

    const enabledModes = (["online", "offline"] as const)
      .filter((modeName) => draft.applicationProcess[modeName].enabled);
    if (enabledModes.length === 0) {
      setFormError(t("Enable online or offline application and add at least one subsection."));
      return;
    }
    const invalidMode = enabledModes.find((modeName) => {
      const subsections = draft.applicationProcess[modeName].subsections;
      return subsections.length === 0 || subsections.some((subsection) =>
        !subsection.title.trim() || !subsection.steps.some((step) => step.trim())
      );
    });
    if (invalidMode) {
      setFormError(t("Complete each {mode} application subsection with a title and at least one step.", { mode: t(`${invalidMode} application`) }));
      return;
    }

    const invalidNumericRule = Object.entries(draft.numericRules).find(([, rule]) => {
      if (!rule.min && !rule.max) return false;
      const min = rule.min ? Number(rule.min) : null;
      const max = rule.max ? Number(rule.max) : null;
      return (min !== null && !Number.isFinite(min))
        || (max !== null && !Number.isFinite(max))
        || (min !== null && max !== null && min > max);
    });
    if (invalidNumericRule) {
      setFormError(t("Each numeric criterion must have valid bounds, with the minimum no greater than the maximum."));
      return;
    }

    const locationIds = (kind: "state" | "ut") => draft.locationKeys
      .filter((key) => key.startsWith(`${kind}:`))
      .map((key) => Number(key.slice(kind.length + 1)));
    const applicationMode = (modeName: "online" | "offline") => {
      const mode = draft.applicationProcess[modeName];
      return {
        enabled: mode.enabled,
        subsections: mode.enabled
          ? mode.subsections.map(({ title, format, steps }) => ({
            title: title.trim(),
            format,
            steps: steps.map((step) => step.trim()).filter(Boolean),
          }))
          : [],
      };
    };
    const payload: CreateSchemeInput = {
      name: draft.name.trim(),
      ...(draft.code.trim() ? { code: draft.code.trim() } : {}),
      ministryId: Number(draft.ministryId),
      categoryIds: draft.categoryIds.map(Number),
      coverage: {
        allIndia: draft.allIndia,
        stateIds: draft.allIndia ? [] : locationIds("state"),
        unionTerritoryIds: draft.allIndia ? [] : locationIds("ut"),
      },
      details: { ...draft.details, items: draft.details.items.map((item) => item.trim()).filter(Boolean) },
      benefits: { ...draft.benefits, items: draft.benefits.items.map((item) => item.trim()).filter(Boolean) },
      eligibilityInfo: {
        ...draft.eligibilityInfo,
        items: draft.eligibilityInfo.items.map((item) => item.trim()).filter(Boolean),
      },
      documents: { ...draft.documents, items: draft.documents.items.map((item) => item.trim()).filter(Boolean) },
      applicationProcess: {
        online: applicationMode("online"),
        offline: applicationMode("offline"),
      },
      criteria: Object.fromEntries(
        Object.entries(draft.criteria)
          .filter(([, ids]) => ids.length > 0)
          .map(([code, ids]) => [code, ids.map(Number)]),
      ),
      numericRules: Object.fromEntries(
        Object.entries(draft.numericRules)
          .filter(([, rule]) => Boolean(rule.min || rule.max))
          .map(([code, rule]) => [code, {
            min: rule.min ? Number(rule.min) : null,
            max: rule.max ? Number(rule.max) : null,
          }]),
      ),
    };

    setSaving(true);
    setFormError(null);
    setSavedSchemeId(null);
    try {
      const savedScheme = await createScheme(payload);
      setSavedSchemeId(savedScheme.id);
      setShowPreview(false);
    } catch (requestError: unknown) {
      setFormError(requestError instanceof Error ? requestError.message : t("Unable to save the scheme."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-50">
      <section className="bg-slate-900 py-12 text-white">
        <div className="container mx-auto px-4">
          <Badge variant="outline" className="mb-4 border-secondary text-secondary">
            {t("Public prototype")}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t("Create a scheme")}</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            {t("Add scheme information and eligibility criteria. This prototype saves the scheme to the backend.")}
          </p>
        </div>
      </section>

      <main className="container mx-auto max-w-5xl space-y-6 px-4 py-10">
        {loading && <p role="status" className="text-sm text-muted-foreground">{t("Loading ministries, locations, categories, and eligibility criteria…")}</p>}
        {error && (
          <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 sm:flex-row sm:items-center sm:justify-between">
            <p>{t("Could not load master data:")} {error}</p>
            <Button type="button" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
              {t("Retry")}
            </Button>
          </div>
        )}
        {savedSchemeId !== null && (
          <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-5 text-green-800">
            {t("Scheme created successfully (ID: {id}).", { id: savedSchemeId })}
          </div>
        )}

        <form onSubmit={onCreate} className="space-y-6">
          <Card className="bg-white">
            <CardHeader><CardTitle>{t("Scheme details")}</CardTitle></CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                {t("Scheme name")} <span className="text-red-600">*</span>
                <Input
                  required
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder={t("For example, Rural Tailoring Assistance")}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                {t("Scheme code")}
                <Input
                  value={draft.code}
                  onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
                  placeholder={t("Optional unique identifier")}
                />
              </label>
            </CardContent>
          </Card>

          <StructuredContentEditor
            title={t("Details")}
            description={t("Describe the scheme. Use paragraphs or format the details as a list.")}
            itemLabel={t("Detail")}
            content={draft.details}
            onChange={(content) => updateContent("details", content)}
          />

          <StructuredContentEditor
            title={t("Benefits")}
            description={t("Add one benefit per item and choose how the list should be presented.")}
            itemLabel={t("Benefit")}
            content={draft.benefits}
            onChange={(content) => updateContent("benefits", content)}
          />

          <StructuredContentEditor
            title={t("Eligibility information")}
            description={t("Add a readable explanation of the eligibility requirements. The selectable criteria are configured separately below.")}
            itemLabel={t("Eligibility point")}
            content={draft.eligibilityInfo}
            onChange={(content) => updateContent("eligibilityInfo", content)}
          />

          <ApplicationProcessEditor
            applicationProcess={draft.applicationProcess}
            onModeChange={updateApplicationMode}
          />

          <StructuredContentEditor
            title={t("Documents required")}
            description={t("List the documents applicants should prepare.")}
            itemLabel={t("Document")}
            content={draft.documents}
            onChange={(content) => updateContent("documents", content)}
          />

          <Card className="bg-white">
            <CardHeader><CardTitle>{t("Ministry and subject category")}</CardTitle></CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                {t("Ministry")} <span className="text-red-600">*</span>
                <select
                  required
                  value={draft.ministryId}
                  onChange={(event) => setDraft((current) => ({ ...current, ministryId: event.target.value }))}
                  disabled={loading || ministries.length === 0}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t("Select a ministry")}</option>
                  {ministries.map((ministry) => (
                    <option key={ministry.id} value={ministry.id}>{ministryName(ministry.ministry)}</option>
                  ))}
                </select>
                {ministries.length === 0 && !loading && <span className="block text-xs text-muted-foreground">{t("No active ministries are available.")}</span>}
              </label>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">{t("Subject categories")} <span className="text-red-600">*</span></legend>
                <p className="text-sm text-muted-foreground">{t("Choose one or more topics, such as education or housing.")}</p>
                {categories.length === 0 && !loading ? (
                  <p className="text-sm text-muted-foreground">{t("No active categories are available.")}</p>
                ) : (
                  <div className="grid max-h-48 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                    {categories.map((category) => (
                      <label key={category.id} htmlFor={`category-${category.id}`} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={draft.categoryIds.includes(String(category.id))}
                          onCheckedChange={(checked) => toggleCategory(String(category.id), checked === true)}
                        />
                        {categoryName(category.name)}
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader><CardTitle>{t("Geographic coverage")}</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-medium">
                <Checkbox
                  checked={draft.allIndia}
                  onCheckedChange={(checked) => setDraft((current) => ({
                    ...current,
                    allIndia: checked === true,
                    locationKeys: checked === true ? [] : current.locationKeys,
                  }))}
                />
                {t("Available across India")}
              </label>
              {!draft.allIndia && (
                <div className="grid gap-6 md:grid-cols-2">
                  {                  [{ label: t("States"), items: states }, { label: t("Union territories"), items: unionTerritories }].map((group) => (
                    <fieldset key={group.label} className="space-y-3">
                      <legend className="font-semibold">{group.label}</legend>
                      <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                        {group.items.map((location) => {
                          const key = locationKey(location);
                          return (
                            <label key={key} htmlFor={`location-${key}`} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                id={`location-${key}`}
                                checked={draft.locationKeys.includes(key)}
                                onCheckedChange={(checked) => toggleLocation(key, checked === true)}
                              />
                              {locationName(location.name)}
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle>{t("Eligibility criteria")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("Select multiple options within a criterion to allow any selected value. Different criteria are combined.")}
              </p>
            </CardHeader>
            <CardContent className="space-y-7">
              {criteriaDimensions
                .filter((dimension) => dimension.inputType !== "NUMERIC")
                .map((dimension) => {
                  if (dimension.code === "EMPLOYMENT_TYPE" && !isEmployedSelected) return null;
                  return (
                    <OptionChecklist
                      key={dimension.code}
                      id={dimension.code.toLowerCase()}
                      label={dimension.name}
                      options={dimension.options.map((option) => ({
                        value: String(option.id),
                        label: option.label,
                      }))}
                      selected={draft.criteria[dimension.code] ?? []}
                      onChange={
                        dimension.code === "WORK_STATUS"
                          ? changeWorkStatus
                          : dimension.code === "DISABILITY_STATUS"
                            ? changeDisabilityStatus
                            : (selected) => updateCriteria(dimension.code, selected)
                      }
                      helperText={dimension.code === "EMPLOYMENT_TYPE" ? t("Shown because employed is selected.") : undefined}
                    />
                  );
                })}

              <div className="grid gap-7 md:grid-cols-2">
                {criteriaDimensions
                  .filter((dimension) => dimension.inputType === "NUMERIC")
                  .filter((dimension) => dimension.code !== "DISABILITY_PERCENT" || isDisabilitySelected)
                  .map((dimension) => {
                    const details = NUMERIC_FIELD_DETAILS[dimension.code] ?? { unit: "value", step: "any" };
                    return (
                      <NumericRuleField
                        key={dimension.code}
                        code={dimension.code}
                        label={dimension.name}
                        unit={details.unit}
                        step={details.step}
                        max={details.max}
                        rule={draft.numericRules[dimension.code] ?? { min: "", max: "" }}
                        onChange={updateNumericRule}
                      />
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
            {formError && <p role="alert" className="self-center text-sm text-red-700">{formError}</p>}
            <Button type="button" variant="outline" onClick={resetDraft}>{t("Clear form")}</Button>
            <Button type="button" variant="outline" onClick={onPreview} disabled={loading || Boolean(error)}>
              {t("Preview configuration")}
            </Button>
            <Button type="submit" className="bg-primary" disabled={loading || saving || Boolean(error)}>
              {saving ? t("Saving scheme…") : t("Create scheme")}
            </Button>
          </div>
        </form>

        {showPreview && (
          <Card className="border-primary/20 bg-white">
            <CardHeader>
              <CardTitle>{t("Configuration preview")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("Review the configuration before creating the scheme.")}</p>
            </CardHeader>
            <CardContent className="grid gap-6 text-sm md:grid-cols-2">
              <div className="space-y-3">
                <PreviewRow label={t("Name")} value={draft.name} />
                <PreviewRow label={t("Code")} value={draft.code || t("Not set")} />
                <PreviewRow label={t("Ministry")} value={selectedMinistryName ? ministryName(selectedMinistryName) : t("Not selected")} />
                <PreviewRow label={t("Subject categories")} value={selectedCategoryNames.join(", ") || t("Not selected")} />
                <PreviewRow
                  label={t("Coverage")}
                  value={draft.allIndia
                    ? t("All India")
                    : selectedLocations.map((location) => locationName(location.name)).join(", ") || t("No locations selected")}
                />
              </div>
              <div className="space-y-3">
                {criteriaDimensions
                  .filter((dimension) => dimension.inputType !== "NUMERIC")
                  .map((dimension) => {
                    const selected = draft.criteria[dimension.code] ?? [];
                    if (selected.length === 0) return null;
                    const labels = dimension.options
                      .filter((option) => selected.includes(String(option.id)))
                      .map((option) => option.label);
                    return <PreviewRow key={dimension.code} label={dimension.name} value={labels.join(", ")} />;
                  })}
                {criteriaDimensions
                  .filter((dimension) => dimension.inputType === "NUMERIC")
                  .map((dimension) => {
                    const rule = draft.numericRules[dimension.code];
                    if (!rule?.min && !rule?.max) return null;
                    const unit = NUMERIC_FIELD_DETAILS[dimension.code]?.unit ?? "";
                    const prefix = unit === "₹" ? "₹" : "";
                    const suffix = unit && unit !== "₹" ? ` ${unit}` : "";
                    const min = rule.min ? `${prefix}${rule.min}${suffix}` : t("No minimum");
                    const max = rule.max ? `${prefix}${rule.max}${suffix}` : t("No maximum");
                    return <PreviewRow key={dimension.code} label={dimension.name} value={`${min} – ${max}`} />;
                  })}
              </div>
              <div className="space-y-5 md:col-span-2">
                <StructuredContentPreview title={t("Details")} content={draft.details} />
                <StructuredContentPreview title={t("Benefits")} content={draft.benefits} />
                <StructuredContentPreview title={t("Eligibility information")} content={draft.eligibilityInfo} />
                <ApplicationProcessPreview applicationProcess={draft.applicationProcess} />
                <StructuredContentPreview title={t("Documents required")} content={draft.documents} />
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function StructuredContentEditor({
  title,
  description,
  itemLabel,
  content,
  onChange,
}: {
  title: string;
  description: string;
  itemLabel: string;
  content: StructuredContent;
  onChange: (content: StructuredContent) => void;
}) {
  const { t } = useI18n();
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>{t(title)}</CardTitle>
        <p className="text-sm text-muted-foreground">{t(description)}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <ContentFormatSelect
          id={`format-${title.toLowerCase().replaceAll(" ", "-")}`}
          value={content.format}
          onChange={(format) => onChange({ ...content, format })}
        />
        <EditableItems
          label={itemLabel}
          items={content.items}
          onChange={(items) => onChange({ ...content, items })}
        />
      </CardContent>
    </Card>
  );
}

function ApplicationProcessEditor({
  applicationProcess,
  onModeChange,
}: {
  applicationProcess: SchemeDraft["applicationProcess"];
  onModeChange: (
    modeName: "online" | "offline",
    update: (mode: ApplicationMode) => ApplicationMode,
  ) => void;
}) {
  const { t } = useI18n();
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>{t("Application process")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("Enable each available method. Each method can contain titled subsections and formatted steps.")}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {([
          ["online", "Online application"],
          ["offline", "Offline application"],
        ] as const).map(([modeName, label]) => {
          const mode = applicationProcess[modeName];
          return (
            <section key={modeName} className="space-y-4 rounded-xl border border-slate-200 p-4">
              <label className="flex items-center gap-3 font-semibold">
                <Checkbox
                  checked={mode.enabled}
                  onCheckedChange={(checked) => onModeChange(modeName, (current) => ({
                    ...current,
                    enabled: checked === true,
                    subsections: checked === true && current.subsections.length === 0
                      ? [createApplicationSubsection()]
                      : current.subsections,
                  }))}
                />
                {t(label)}
              </label>

              {mode.enabled && (
                <div className="space-y-4">
                  {mode.subsections.map((subsection, subsectionIndex) => (
                    <div key={subsection.id} className="space-y-4 rounded-lg bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <label className="flex-1 space-y-2 text-sm font-medium">
                          {t("Subsection title")}
                          <Input
                            value={subsection.title}
                            onChange={(event) => onModeChange(modeName, (current) => ({
                              ...current,
                              subsections: current.subsections.map((item) =>
                                item.id === subsection.id ? { ...item, title: event.target.value } : item,
                              ),
                            }))}
                            placeholder={t("For example, {label} steps", { label: t(label) })}
                          />
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onModeChange(modeName, (current) => ({
                            ...current,
                            subsections: current.subsections.filter((item) => item.id !== subsection.id),
                          }))}
                        >
                          {t("Remove subsection")}
                        </Button>
                      </div>
                      <ContentFormatSelect
                        id={`format-${modeName}-${subsection.id}`}
                        value={subsection.format}
                        onChange={(format) => onModeChange(modeName, (current) => ({
                          ...current,
                          subsections: current.subsections.map((item) =>
                            item.id === subsection.id ? { ...item, format } : item,
                          ),
                        }))}
                      />
                      <EditableItems
                        label={t("Step")}
                        items={subsection.steps}
                        onChange={(steps) => onModeChange(modeName, (current) => ({
                          ...current,
                          subsections: current.subsections.map((item) =>
                            item.id === subsection.id ? { ...item, steps } : item,
                          ),
                        }))}
                      />
                      <p className="text-xs text-muted-foreground">{t("Subsection {number}", { number: subsectionIndex + 1 })}</p>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onModeChange(modeName, (current) => ({
                      ...current,
                      subsections: [...current.subsections, createApplicationSubsection()],
                    }))}
                  >
                    {t("Add subsection")}
                  </Button>
                </div>
              )}
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ContentFormatSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: ContentFormat;
  onChange: (format: ContentFormat) => void;
}) {
  const { t } = useI18n();
  return (
    <label htmlFor={id} className="flex flex-col gap-2 text-sm font-medium sm:max-w-sm">
      {t("Display format")}
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const format = CONTENT_FORMATS.find((option) => option.value === event.target.value);
          if (format) onChange(format.value);
        }}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {CONTENT_FORMATS.map((format) => (
          <option key={format.value} value={format.value}>{t(format.label)}</option>
        ))}
      </select>
    </label>
  );
}

function EditableItems({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const { t } = useI18n();
  const updateItem = (index: number, value: string) => {
    onChange(items.map((item, itemIndex) => itemIndex === index ? value : item));
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-3">
          <label className="flex-1 space-y-2 text-sm font-medium">
            {t(label)} {index + 1}
            <textarea
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={t("Enter {label}", { label: t(label).toLowerCase() })}
            />
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-7 shrink-0 text-muted-foreground"
            aria-label={t("Remove {label} {number}", { label: t(label).toLowerCase(), number: index + 1 })}
            onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
          >
            {t("Remove")}
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])}>
        {t("Add {label}", { label: t(label).toLowerCase() })}
      </Button>
    </div>
  );
}

function StructuredContentPreview({ title, content }: { title: string; content: StructuredContent }) {
  const { t } = useI18n();
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold">{t(title)}</h3>
      <FormattedContent format={content.format} items={content.items} />
    </section>
  );
}

function ApplicationProcessPreview({
  applicationProcess,
}: {
  applicationProcess: SchemeDraft["applicationProcess"];
}) {
  const { t } = useI18n();
  const modes = ([
    ["online", "Online application"],
    ["offline", "Offline application"],
  ] as const).filter(([modeName]) => applicationProcess[modeName].enabled);

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold">{t("Application process")}</h3>
      {modes.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("No application method selected.")}</p>
      ) : (
        <div className="mt-3 space-y-4">
          {modes.map(([modeName, label]) => (
            <div key={modeName}>
              <h4 className="font-medium">{t(label)}</h4>
              {applicationProcess[modeName].subsections.map((subsection) => (
                <div key={subsection.id} className="mt-2 rounded-lg bg-slate-50 p-3">
                  <h5 className="text-sm font-semibold">{subsection.title || t("Untitled subsection")}</h5>
                  <FormattedContent format={subsection.format} items={subsection.steps} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FormattedContent({ format, items }: { format: ContentFormat; items: string[] }) {
  const { t } = useI18n();
  const visibleItems = items.map((item) => item.trim()).filter(Boolean);
  if (visibleItems.length === 0) {
    return <p className="mt-2 text-sm italic text-muted-foreground">{t("No content entered.")}</p>;
  }

  if (format === "paragraphs") {
    return (
      <div className="mt-2 space-y-2 text-sm leading-relaxed">
        {visibleItems.map((item, index) => <p key={index}>{item}</p>)}
      </div>
    );
  }

  if (format === "steps") {
    return (
      <ol className="mt-2 space-y-2">
        {visibleItems.map((item, index) => (
          <li key={index} className="flex gap-3 text-sm">
            <span className="shrink-0 font-semibold text-primary">{t("Step {number}", { number: index + 1 })}</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    );
  }

  if (format === "numbered") {
    return (
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
        {visibleItems.map((item, index) => <li key={index}>{item}</li>)}
      </ol>
    );
  }

  if (format === "checklist") {
    return (
      <ul className="mt-2 space-y-2 text-sm">
        {visibleItems.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span aria-hidden="true" className="font-bold text-emerald-700">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
      {visibleItems.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
  );
}

function NumericRuleField({
  code,
  label,
  unit,
  step,
  max,
  rule,
  onChange,
}: {
  code: string;
  label: string;
  unit: string;
  step: string;
  max?: string;
  rule: NumericRule;
  onChange: (code: string, bound: keyof NumericRule, value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="space-y-3">
      <legend className="font-semibold">{label}</legend>
      <p className="text-sm text-muted-foreground">{t("Leave a bound empty if there is no limit.")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["min", "max"] as const).map((bound) => (
          <label key={bound} className="space-y-2 text-sm">
            <span className="font-medium">{t(bound === "min" ? "Minimum" : "Maximum")} ({unit === "years" ? t(unit) : unit})</span>
            <Input
              type="number"
              min="0"
              max={max}
              step={step}
              value={rule[bound]}
              onChange={(event) => onChange(code, bound, event.target.value)}
              placeholder={t("No limit")}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}
