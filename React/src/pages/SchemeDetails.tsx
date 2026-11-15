import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, CheckCircle2, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { fetchScheme, type SchemeRecord, type StructuredSchemeContent } from "@/lib/api";

const DETAIL_SECTIONS = [
  ["details", "Details"],
  ["benefits", "Benefits"],
  ["eligibility", "Eligibility"],
  ["application-process", "Application Process"],
  ["documents", "Documents Required"],
] as const;

function FormattedContent({ content }: { content: StructuredSchemeContent }) {
  if (content.items.length === 0) {
    return <p className="text-sm text-muted-foreground">No information has been added.</p>;
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

function locationNames(scheme: SchemeRecord) {
  if (scheme.coverage.type === "ALL_INDIA") return "All India";
  return [
    ...scheme.coverage.states.map((location) => location.name),
    ...scheme.coverage.unionTerritories.map((location) => location.name),
  ].join(", ") || "Selected locations";
}

function numericValue(code: string, value: number | null) {
  if (value === null) return null;
  if (code === "FAMILY_INCOME") return `₹${value.toLocaleString("en-IN")}`;
  if (code === "DISABILITY_PERCENT") return `${value}%`;
  if (code === "AGE") return `${value} years`;
  return String(value);
}

function SchemeEligibility({ scheme }: { scheme: SchemeRecord }) {
  const hasCriteria = scheme.genders.length > 0
    || scheme.criteria.length > 0
    || scheme.numericRules.length > 0;

  return (
    <div className="space-y-6">
      <FormattedContent content={scheme.eligibilityInfo} />
      {hasCriteria ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="mb-4 font-semibold text-slate-900">Selected eligibility criteria</h3>
          <dl className="space-y-3 text-sm">
            {scheme.genders.length > 0 && (
              <div>
                <dt className="font-medium text-slate-800">Gender</dt>
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
                  {numericValue(rule.code, rule.min) ?? "No minimum"}
                  {" – "}
                  {numericValue(rule.code, rule.max) ?? "No maximum"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No additional selectable eligibility criteria are listed.</p>
      )}
    </div>
  );
}

function ApplicationProcess({ scheme }: { scheme: SchemeRecord }) {
  const modes = (["online", "offline"] as const)
    .filter((modeName) => scheme.applicationProcess[modeName].enabled);

  if (modes.length === 0) {
    return <p className="text-sm text-muted-foreground">Application process information is not available.</p>;
  }

  return (
    <div className="space-y-6">
      {modes.map((modeName) => (
        <div key={modeName}>
          <h3 className="mb-3 text-lg font-semibold capitalize text-slate-900">{modeName} application</h3>
          {scheme.applicationProcess[modeName].subsections.length === 0 ? (
            <p className="text-sm text-muted-foreground">Steps will be provided by the scheme administrator.</p>
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

export default function SchemeDetails() {
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
    return <main className="container mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground" role="status">Loading scheme details…</main>;
  }

  if (error || !scheme) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <Card className="bg-white">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold">{error ? "Unable to load scheme" : "Scheme not found"}</h1>
            <p role={error ? "alert" : undefined} className="mt-3 text-muted-foreground">
              {error ?? "This scheme may have been removed or is no longer available."}
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/schemes"><ArrowLeft className="mr-2 h-4 w-4" /> Back to schemes</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const keywords = [
    ...scheme.categories.map((category) => category.name),
    ...scheme.criteria.flatMap((dimension) => dimension.options.map((option) => option.label)),
    ...scheme.genders.map((gender) => gender.name),
  ].filter((keyword, index, list) => list.indexOf(keyword) === index);

  return (
    <div className="min-h-full bg-slate-50">
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <Button asChild variant="ghost" className="mb-5 -ml-3 text-primary">
          <Link to="/schemes"><ArrowLeft className="mr-2 h-4 w-4" /> Back to schemes</Link>
        </Button>

        <Card className="overflow-hidden border-slate-200 bg-white">
          <div className="h-2 bg-primary" />
          <CardHeader className="p-6 md:p-9">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <Building2 className="h-4 w-4" /> {scheme.ministry.name}
            </p>
            <div className="mt-2 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{scheme.name}</h1>
                {scheme.code && <p className="mt-2 text-sm text-muted-foreground">Scheme code: {scheme.code}</p>}
              </div>
              <Button asChild className="shrink-0 bg-primary">
                <a href="#eligibility"><CheckCircle2 className="mr-2 h-4 w-4" /> Review eligibility</a>
              </Button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {keywords.slice(0, 10).map((keyword) => (
                <Badge key={keyword} variant="secondary" className="bg-primary/5 text-primary">{keyword}</Badge>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:gap-8">
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {locationNames(scheme)}</p>
              {scheme.genders.length > 0 && (
                <p className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> {scheme.genders.map((gender) => gender.name).join(", ")}</p>
              )}
            </div>
          </CardHeader>
        </Card>

        <nav aria-label="Scheme information sections" className="sticky top-20 z-20 mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex min-w-max">
            {DETAIL_SECTIONS.map(([sectionId, label]) => (
              <a
                key={sectionId}
                href={`#${sectionId}`}
                className="border-b-2 border-transparent px-5 py-4 text-sm font-medium text-slate-600 transition-colors hover:border-primary hover:text-primary"
              >
                {label}
              </a>
            ))}
          </div>
        </nav>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card className="bg-white">
            <CardContent className="px-6 py-2 md:px-9">
              <Section id="details" title="Details">
                <FormattedContent content={scheme.details} />
              </Section>
              <Section id="benefits" title="Benefits">
                <FormattedContent content={scheme.benefits} />
              </Section>
              <Section id="eligibility" title="Eligibility">
                <SchemeEligibility scheme={scheme} />
              </Section>
              <Section id="application-process" title="Application Process">
                <ApplicationProcess scheme={scheme} />
              </Section>
              <Section id="documents" title="Documents Required">
                <FormattedContent content={scheme.documents} />
              </Section>
            </CardContent>
          </Card>

          <aside className="space-y-5">
            <Card className="bg-white lg:sticky lg:top-40">
              <CardHeader className="pb-3">
                <h2 className="text-lg font-semibold">Scheme at a glance</h2>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Ministry</p>
                  <p className="mt-1 font-medium">{scheme.ministry.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Categories</p>
                  <p className="mt-1 font-medium">{scheme.categories.map((category) => category.name).join(", ") || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Geographic coverage</p>
                  <p className="mt-1 font-medium">{locationNames(scheme)}</p>
                </div>
                <Button asChild variant="outline" className="w-full border-primary text-primary">
                  <a href="#eligibility">View eligibility requirements</a>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
