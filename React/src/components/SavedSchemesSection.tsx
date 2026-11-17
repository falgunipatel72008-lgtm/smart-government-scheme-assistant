import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { fetchScheme, type SchemeRecord } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useSavedSchemes } from "@/lib/savedSchemes";
import SavedSchemeButton from "@/components/SavedSchemeButton";

export default function SavedSchemesSection() {
  const { t, categoryName, ministryName, schemeName } = useI18n();
  const { ids, error: storageError } = useSavedSchemes();
  const [schemes, setSchemes] = useState<SchemeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (ids.length === 0) {
      setSchemes([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all(ids.map((id) => fetchScheme(String(id), controller.signal)))
      .then(setSchemes)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load saved schemes.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [ids, reloadKey]);

  return (
    <main id="saved-schemes" className="min-h-[calc(100vh-6.5rem)] bg-slate-50 py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">{t("Saved schemes")}</h2>
          <p className="mt-2 text-muted-foreground">{t("Keep schemes you are interested in handy here.")}</p>
        </div>

        {storageError && <p role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{t(storageError)}</p>}
        {loading && <p role="status" className="py-10 text-center text-sm text-muted-foreground">{t("Loading saved schemes…")}</p>}
        {error && (
          <div role="alert" className="mb-6 flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 sm:flex-row sm:items-center sm:justify-between">
            <p>{t("Unable to load saved schemes.")} {error}</p>
            <Button type="button" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" /> {t("Retry")}
            </Button>
          </div>
        )}
        {!loading && !error && ids.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="font-semibold">{t("No saved schemes yet.")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("Save a scheme to find it here later.")}</p>
            <Button asChild variant="outline" className="mt-5 border-primary text-primary">
              <Link to="/schemes">{t("Find schemes")}</Link>
            </Button>
          </div>
        )}
        {!loading && !error && schemes.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            {schemes.map((scheme) => (
              <Card key={scheme.id} className="border-slate-200 bg-white">
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
                  <h3 className="text-xl font-semibold tracking-tight">{schemeName(scheme.code, scheme.name)}</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{ministryName(scheme.ministry.name)}</p>
                  {scheme.benefits.items[0] && (
                    <p className="mt-3 text-sm font-medium text-primary">{scheme.benefits.items[0]}</p>
                  )}
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Button asChild variant="outline" className="border-primary text-primary">
                      <Link to={`/schemes/${scheme.id}`}>{t("View scheme details")}</Link>
                    </Button>
                    <SavedSchemeButton schemeId={scheme.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
