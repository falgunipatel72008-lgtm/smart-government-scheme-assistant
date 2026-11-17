import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

const SCHEMES = [
  { title: "PM Scholarship Scheme", cat: "Education", benefit: "₹50,000 / year", status: "Active", applicants: "2.4M+" },
  { title: "National Health Mission", cat: "Healthcare", benefit: "Free Coverage", status: "Active", applicants: "15M+" },
  { title: "Kisan Samman Nidhi", cat: "Agriculture", benefit: "₹6,000 / year", status: "Open", applicants: "12M+" },
  { title: "Awas Yojana (Urban)", cat: "Housing", benefit: "Interest Subsidy", status: "Verified", applicants: "4.8M+" },
];

export default function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const searchSchemes = (searchTerm: string) => {
    const term = searchTerm.trim();
    const params = new URLSearchParams();
    if (term) params.set("search", term);
    const queryString = params.toString();
    navigate(`/schemes${queryString ? `?${queryString}` : ""}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    searchSchemes(query);
  };

  return (
    <>
    <section className="flex min-h-[calc(100vh-6.5rem)] items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-3xl text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
          {t("Government schemes, in one place")}
        </p>
        <h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-primary md:text-6xl">
          {t("Find support for you and your family.")}
        </h1>
        <p className="mx-auto mb-9 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {t("Search official government schemes by name, need or category. Each listing explains who can apply, what documents are needed and where to begin.")}
        </p>

        <form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-14 rounded-lg border-slate-200 bg-white pl-12 text-slate-900 shadow-sm"
              placeholder={t("Try “pension”, “farmer” or “scholarship”")}
              aria-label={t("Search schemes")}
            />
          </div>
          <Button type="submit" size="lg" className="h-14 rounded-lg bg-primary px-8 text-base font-semibold text-white hover:bg-primary/90">
            {t("Search schemes")}
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span>{t("Common searches:")}</span>
          {[
            ["pension", "pension"],
            ["education", "education"],
            ["healthcare", "healthcare"],
          ].map(([term, label]) => (
            <button
              key={term}
              type="button"
              onClick={() => searchSchemes(term)}
              className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
            >
              {t(label)}
            </button>
          ))}
        </div>
      </div>
    </section>
    <section className="bg-white py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold">{t("Schemes people often look for")}</h2>
          <p className="text-muted-foreground">{t("A few places to begin. Check each scheme’s details before applying.")}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {SCHEMES.map((scheme) => (
            <Card key={scheme.title} className="border-slate-200 transition-colors hover:border-primary/50">
              <CardHeader className="pb-4">
                <div className="mb-4 flex items-start justify-between gap-2">
                  <Badge variant="secondary" className="border-none bg-slate-100 text-slate-600">{t(scheme.cat)}</Badge>
                  <Badge className="border-none bg-blue-50 text-blue-600 hover:bg-blue-50">{t(scheme.status)}</Badge>
                </div>
                <CardTitle className="text-lg leading-snug">{t(scheme.title)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{t("Benefit")}</span>
                    <span className="text-right font-bold text-primary">{scheme.benefit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("Applicants")}</span>
                    <span className="font-bold">{scheme.applicants}</span>
                  </div>
                  <Button variant="outline" className="group mt-2 w-full border-primary text-primary transition-all hover:bg-primary hover:text-white">
                    {t("Check Eligibility")} <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
    </>
  );
}
