import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, CheckCircle2, CircleCheck, FileCheck2, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import SavedSchemeButton from "@/components/SavedSchemeButton";
import { fetchScheme, type DocumentRequirement, type SchemeRecord, type StructuredSchemeContent } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const DETAIL_SECTIONS = [
  ["details", "Details"],
  ["benefits", "Benefits"],
  ["eligibility", "Eligibility"],
  ["application-process", "Application Process"],
  ["documents", "Documents Required"],
] as const;

function FormattedContent({ content }: { content: StructuredSchemeContent }) {
  const { t } = useI18n();
  if (content.items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("No information has been added.")}</p>;
  }
  if (content.format === "paragraphs") {
    return (
      <div className="space-y-4 text-sm leading-7 text-slate-700">
        {content.items.map((item, index) => <p key={`${index}-${item}`}>{item}</p>)}
      </div>
    );
  }

  const numbered = content.format === "numbered" || content.format === "steps";
  const List = numbered ? "ol" : "ul";
  const style = numbered ? "list-decimal" : content.format === "checklist" ? "list-none" : "list-disc";
  return (
    <List className={`space-y-3 pl-6 text-sm leading-6 text-slate-700 ${style}`}>
      {content.items.map((item, index) => (
        <li
          key={`${index}-${item}`}
          className={content.format === "checklist"
            ? "relative pl-1 before:absolute before:-left-5 before:text-emerald-600 before:content-['✓']"
            : undefined}
        >
          {item}
        </li>
      ))}
    </List>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-slate-200 py-8 last:border-b-0">
      <h2 className="mb-5 text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function locationNames(
  scheme: SchemeRecord,
  t: (text: string) => string,
  locationName: (name: string) => string,
) {
  if (scheme.coverage.type === "ALL_INDIA") return t("All India");
  return [
    ...scheme.coverage.states.map((location) => locationName(location.name)),
    ...scheme.coverage.unionTerritories.map((location) => locationName(location.name)),
  ].join(", ") || t("Selected locations");
}

function numericValue(code: string, value: number | null, t: (text: string) => string) {
  if (value === null) return null;
  if (code === "FAMILY_INCOME") return `₹${value.toLocaleString("en-IN")}`;
  if (code === "DISABILITY_PERCENT") return `${value}%`;
  if (code === "AGE") return `${value} ${t("years")}`;
  return String(value);
}

function SchemeEligibility({ scheme }: { scheme: SchemeRecord }) {
  const { t } = useI18n();
  const hasCriteria = scheme.genders.length > 0
    || scheme.criteria.length > 0
    || scheme.numericRules.length > 0;

  return (
    <div className="space-y-6">
      <FormattedContent content={scheme.eligibilityInfo} />
      {hasCriteria ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="mb-4 font-semibold text-slate-900">{t("Selected eligibility criteria")}</h3>
          <dl className="space-y-3 text-sm">
            {scheme.genders.length > 0 && (
              <div>
                <dt className="font-medium text-slate-800">{t("Gender")}</dt>
                <dd className="mt-1 text-slate-600">{scheme.genders.map((gender) => gender.name).join(", ")}</dd>
              </div>
            )}
            {scheme.criteria.map((dimension) => (
              <div key={dimension.id}>
                <dt className="font-medium text-slate-800">{dimension.name}</dt>
                <dd className="mt-1 text-slate-600">
                  {dimension.options.map((option) => option.label).join(", ")}
                </dd>
              </div>
            ))}
            {scheme.numericRules.map((rule) => (
              <div key={rule.dimensionId}>
                <dt className="font-medium text-slate-800">{rule.name}</dt>
                <dd className="mt-1 text-slate-600">
                  {numericValue(rule.code, rule.min, t) ?? t("No minimum")}
                  {" – "}
                  {numericValue(rule.code, rule.max, t) ?? t("No maximum")}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("No additional selectable eligibility criteria are listed.")}</p>
      )}
    </div>
  );
}

function ApplicationProcess({ scheme }: { scheme: SchemeRecord }) {
  const { t } = useI18n();
  const modes = (["online", "offline"] as const)
    .filter((modeName) => scheme.applicationProcess[modeName].enabled);

  if (modes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("Application process information is not available.")}</p>;
  }

  return (
    <div className="space-y-6">
      {modes.map((modeName) => (
        <div key={modeName}>
          <h3 className="mb-3 text-lg font-semibold capitalize text-slate-900">{t(`${modeName} application`)}</h3>
          {scheme.applicationProcess[modeName].subsections.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("Steps will be provided by the scheme administrator.")}</p>
          ) : (
            <div className="space-y-5">
              {scheme.applicationProcess[modeName].subsections.map((subsection, index) => (
                <div key={`${subsection.title}-${index}`} className="rounded-xl bg-slate-50 p-5">
                  <h4 className="mb-3 font-medium text-slate-900">{subsection.title}</h4>
                  <FormattedContent content={{ format: subsection.format, items: subsection.steps }} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const DOCUMENT_PROGRESS_PREFIX = "govscheme-document-progress:";

function documentItems(scheme: SchemeRecord): DocumentRequirement[] {
  if (!("items" in scheme.documents) || scheme.documents.items.length === 0) return [];
  if (typeof scheme.documents.items[0] !== "object") {
    return (scheme.documents.items as string[]).map((name) => ({
      name,
      description: "Listed in this scheme record; confirm the current official guidelines before applying.",
      requirement: /additional|if requested|current guidelines/i.test(name)
        ? "conditional" as const
        : "mandatory" as const,
    }));
  }
  return scheme.documents.items as DocumentRequirement[];
}

function isUnverifiedDocumentMessage(name: string) {
  return name.toLowerCase().includes("check the current official guidelines");
}

function isDocumentChecklist(scheme: SchemeRecord): scheme is SchemeRecord & { documents: Extract<SchemeRecord["documents"], { verified?: boolean }> } {
  return typeof scheme.documents.items[0] === "object";
}

function DocumentsChecklist({ scheme }: { scheme: SchemeRecord }) {
  const { t } = useI18n();
  const items = documentItems(scheme);
  const [collected, setCollected] = useState<Record<string, boolean>>({});
  const [storageError, setStorageError] = useState(false);
  const storageKey = `${DOCUMENT_PROGRESS_PREFIX}${scheme.id}`;
  const hasVerifiedChecklist = isDocumentChecklist(scheme) && scheme.documents.verified === true;
  const isFallback = items.length === 0 || items.some((item) => isUnverifiedDocumentMessage(item.name));
  const mandatoryItems = items.filter((item) => item.requirement === "mandatory");
  const collectedMandatory = mandatoryItems.filter((item) => collected[item.name]).length;
  const percentage = mandatoryItems.length === 0
    ? 0
    : Math.round((collectedMandatory / mandatoryItems.length) * 100);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) {
        setCollected({});
        return;
      }
      const parsed: unknown = JSON.parse(saved);
      setCollected(
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? Object.fromEntries(
            Object.entries(parsed).filter(([, value]) => typeof value === "boolean"),
          )
          : {},
      );
      setStorageError(false);
    } catch {
      setCollected({});
      setStorageError(true);
    }
  }, [storageKey]);

  const toggleDocument = (name: string) => {
    const next = { ...collected, [name]: !collected[name] };
    setCollected(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  };

  if (isFallback) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h3 className="font-semibold text-slate-900">{t("Document checklist not available")}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {t("The document requirements for this scheme or component have not been verified here. Please check the current official guidelines before applying.")}
            </p>
            {items.length > 0 && !isUnverifiedDocumentMessage(items[0].name) && (
              <p className="mt-3 text-sm text-slate-700">{items[0].name}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-primary">{t("Document readiness")}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {collectedMandatory} {t("out of")} {mandatoryItems.length} {t("mandatory documents ready")}
            </p>
          </div>
          <span className="text-2xl font-bold text-primary">{percentage}%</span>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-primary/10" aria-label={`${percentage}% complete`}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {percentage}% {t("complete")} · {t("Only mandatory documents count toward this progress.")}
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <label
            key={item.name}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-primary/40 has-[:checked]:border-emerald-300 has-[:checked]:bg-emerald-50/40"
          >
            <input
              type="checkbox"
              checked={Boolean(collected[item.name])}
              onChange={() => toggleDocument(item.name)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary accent-primary"
            />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                {item.name}
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  item.requirement === "mandatory"
                    ? "bg-red-50 text-red-700"
                    : item.requirement === "optional"
                      ? "bg-slate-100 text-slate-600"
                      : "bg-amber-50 text-amber-700"
                }`}>
                  {t(item.requirement)}
                </span>
              </span>
              {item.description && <span className="mt-1 block text-sm leading-5 text-muted-foreground">{item.description}</span>}
            </span>
            {collected[item.name] && <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />}
          </label>
        ))}
      </div>

      {hasVerifiedChecklist && scheme.documents.sourceNote && (
        <p className="text-xs leading-5 text-muted-foreground">{scheme.documents.sourceNote}</p>
      )}
      {storageError && (
        <p role="alert" className="text-sm text-amber-700">
          {t("Your document progress could not be saved in this browser.")}
        </p>
      )}
      {mandatoryItems.length > 0 && percentage === 100 && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <CircleCheck className="h-5 w-5" />
          {t("Great work — all mandatory documents are marked ready.")}
        </div>
      )}
    </div>
  );
}

export default function SchemeDetails() {
  const { t, categoryName, locationName, ministryName, schemeName } = useI18n();
  const { id = "" } = useParams();
  const [scheme, setScheme] = useState<SchemeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setScheme(null);
    fetchScheme(id, controller.signal)
      .then(setScheme)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load scheme details.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  if (loading) {
    return <main className="container mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground" role="status">{t("Loading scheme details…")}</main>;
  }

  if (error || !scheme) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <Card className="bg-white">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold">{t(error ? "Unable to load scheme" : "Scheme not found")}</h1>
            <p role={error ? "alert" : undefined} className="mt-3 text-muted-foreground">
              {error ?? t("This scheme may have been removed or is no longer available.")}
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/schemes"><ArrowLeft className="mr-2 h-4 w-4" /> {t("Back to schemes")}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const keywords = [
    ...scheme.categories.map((category) => categoryName(category.name)),
    ...scheme.criteria.flatMap((dimension) => dimension.options.map((option) => option.label)),
    ...scheme.genders.map((gender) => gender.name),
  ].filter((keyword, index, list) => list.indexOf(keyword) === index);

  return (
    <div className="min-h-full bg-slate-50">
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <Button asChild variant="ghost" className="mb-5 -ml-3 text-primary">
          <Link to="/schemes"><ArrowLeft className="mr-2 h-4 w-4" /> {t("Back to schemes")}</Link>
        </Button>

        <Card className="overflow-hidden border-slate-200 bg-white">
          <div className="h-2 bg-primary" />
          <CardHeader className="p-6 md:p-9">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <Building2 className="h-4 w-4" /> {ministryName(scheme.ministry.name)}
            </p>
            <div className="mt-2 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{schemeName(scheme.code, scheme.name)}</h1>
                {scheme.code && <p className="mt-2 text-sm text-muted-foreground">{t("Scheme code:")} {scheme.code}</p>}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <SavedSchemeButton schemeId={scheme.id} />
                <Button asChild className="shrink-0 bg-primary">
                  <a href="#eligibility"><CheckCircle2 className="mr-2 h-4 w-4" /> {t("Review eligibility")}</a>
                </Button>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {keywords.slice(0, 10).map((keyword) => (
                <Badge key={keyword} variant="secondary" className="bg-primary/5 text-primary">{keyword}</Badge>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:gap-8">
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {locationNames(scheme, t, locationName)}</p>
              {scheme.genders.length > 0 && (
                <p className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> {scheme.genders.map((gender) => gender.name).join(", ")}</p>
              )}
            </div>
          </CardHeader>
        </Card>

        <nav aria-label={t("Scheme information sections")} className="sticky top-20 z-20 mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex min-w-max">
            {DETAIL_SECTIONS.map(([sectionId, label]) => (
              <a
                key={sectionId}
                href={`#${sectionId}`}
                className="border-b-2 border-transparent px-5 py-4 text-sm font-medium text-slate-600 transition-colors hover:border-primary hover:text-primary"
              >
                {t(label)}
              </a>
            ))}
          </div>
        </nav>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card className="bg-white">
            <CardContent className="px-6 py-2 md:px-9">
              <Section id="details" title={t("Details")}>
                <FormattedContent content={scheme.details} />
              </Section>
              <Section id="benefits" title={t("Benefits")}>
                <FormattedContent content={scheme.benefits} />
              </Section>
              <Section id="eligibility" title={t("Eligibility")}>
                <SchemeEligibility scheme={scheme} />
              </Section>
              <Section id="application-process" title={t("Application Process")}>
                <ApplicationProcess scheme={scheme} />
              </Section>
              <Section id="documents" title={t("Documents Required")}>
                <DocumentsChecklist scheme={scheme} />
              </Section>
            </CardContent>
          </Card>

          <aside className="space-y-5">
            <Card className="bg-white lg:sticky lg:top-40">
              <CardHeader className="pb-3">
                <h2 className="text-lg font-semibold">{t("Scheme at a glance")}</h2>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("Ministry")}</p>
                  <p className="mt-1 font-medium">{ministryName(scheme.ministry.name)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("Categories")}</p>
                  <p className="mt-1 font-medium">{scheme.categories.map((category) => categoryName(category.name)).join(", ") || t("Not specified")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("Geographic coverage")}</p>
                  <p className="mt-1 font-medium">{locationNames(scheme, t, locationName)}</p>
                </div>
                <Button asChild variant="outline" className="w-full border-primary text-primary">
                  <a href="#eligibility">{t("View eligibility requirements")}</a>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
