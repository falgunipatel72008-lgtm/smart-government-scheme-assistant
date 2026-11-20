import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, CheckCircle2, FileCheck2, MapPin, Users } from "lucide-react";
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
  const { t, schemeText } = useI18n();
  if (content.items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("No information has been added.")}</p>;
  }
  if (content.format === "paragraphs") {
    return (
      <div className="space-y-4 text-sm leading-7 text-slate-700">
        {content.items.map((item, index) => <p key={`${index}-${item}`}>{schemeText(item)}</p>)}
      </div>
    );
  }

  const displayFormat = content.format === "checklist" ? "bullets" : content.format;
  const numbered = displayFormat === "numbered" || displayFormat === "steps";
  const List = numbered ? "ol" : "ul";
  const style = numbered ? "list-decimal" : "list-disc";
  return (
    <List className={`space-y-3 pl-6 text-sm leading-6 text-slate-700 ${style}`}>
      {content.items.map((item, index) => (
        <li key={`${index}-${item}`}>{schemeText(item)}</li>
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
  const { t, schemeText } = useI18n();
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
                <dd className="mt-1 text-slate-600">{scheme.genders.map((gender) => schemeText(gender.name)).join(", ")}</dd>
              </div>
            )}
            {scheme.criteria.map((dimension) => (
              <div key={dimension.id}>
                <dt className="font-medium text-slate-800">{schemeText(dimension.name)}</dt>
                <dd className="mt-1 text-slate-600">
                  {dimension.options.map((option) => schemeText(option.label)).join(", ")}
                </dd>
              </div>
            ))}
            {scheme.numericRules.map((rule) => (
              <div key={rule.dimensionId}>
                <dt className="font-medium text-slate-800">{schemeText(rule.name)}</dt>
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
  const { t, schemeText } = useI18n();
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
                  <h4 className="mb-3 font-medium text-slate-900">{schemeText(subsection.title)}</h4>
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

function documentItems(scheme: SchemeRecord): DocumentRequirement[] {
  if (!("items" in scheme.documents) || scheme.documents.items.length === 0) return [];
  return scheme.documents.items.flatMap((item) => {
    if (typeof item === "string") {
      const name = item.trim();
      if (!name) return [];
      if (isUnverifiedDocumentMessage(name)) return [];
      return [{
        name,
        requirement: /additional|if requested|current guidelines/i.test(name)
          ? "conditional" as const
          : "unspecified" as const,
      }];
    }
    if (!item || typeof item !== "object" || typeof item.name !== "string") return [];
    const name = item.name.trim();
    if (!name) return [];
    return [{
      name,
      description: item.description?.trim() || undefined,
      requirement: item.requirement ?? "unspecified",
    }];
  });
}

function isUnverifiedDocumentMessage(name: string) {
  return name.toLowerCase().includes("check the current official guidelines");
}


function DocumentsList({ scheme }: { scheme: SchemeRecord }) {
  const { t, schemeText } = useI18n();
  const items = documentItems(scheme);
  const hasUnverifiedGuidance = "items" in scheme.documents
    && scheme.documents.items.some((item) =>
      typeof item === "string" && isUnverifiedDocumentMessage(item)
    );
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h3 className="font-semibold text-slate-900">{t("Document list not available")}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {t("The document requirements for this scheme or component have not been verified here. Please check the current official guidelines before applying.")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ul className="list-disc space-y-3 pl-6 text-sm leading-6 text-slate-700">
        {items.map((item) => (
          <li key={item.name}>
            <span className="font-medium text-slate-900">{schemeText(item.name)}</span>
            {item.description && (
              <span className="mt-1 block text-sm leading-5 text-slate-600">{schemeText(item.description)}</span>
            )}
          </li>
        ))}
      </ul>
      {hasUnverifiedGuidance && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          {t("Confirm the exact document requirements with the current official guidelines before applying.")}
        </p>
      )}
    </div>
  );
}

export default function SchemeDetails() {
  const { t, categoryName, locationName, ministryName, schemeName, schemeText } = useI18n();
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
    ...scheme.criteria.flatMap((dimension) => dimension.options.map((option) => schemeText(option.label))),
    ...scheme.genders.map((gender) => schemeText(gender.name)),
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
                <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{schemeText(schemeName(scheme.code, scheme.name))}</h1>
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
                <p className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> {scheme.genders.map((gender) => schemeText(gender.name)).join(", ")}</p>
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
                <DocumentsList scheme={scheme} />
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
