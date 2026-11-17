import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMinistries, type Ministry } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function Ministries() {
  const { t, ministryName } = useI18n();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchMinistries(controller.signal)
      .then(setMinistries)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load ministries.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const activeMinistries = ministries.filter((ministry) => ministry.isActive);

  return (
    <div className="bg-slate-50">
      <section className="bg-slate-900 py-16 text-white">
        <div className="container mx-auto px-4">
          <Badge variant="outline" className="mb-5 border-secondary text-secondary">{t("Master data")}</Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{t("Ministries")}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">
            {t("Ministry records loaded from the database.")}
          </p>
        </div>
      </section>

      <main className="container mx-auto px-4 py-14">
        {loading && <p role="status" className="text-center text-muted-foreground">{t("Loading ministries…")}</p>}
        {error && (
          <div role="alert" className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
            <p>{error}</p>
            <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>{t("Retry")}</Button>
          </div>
        )}
        {!loading && !error && activeMinistries.length === 0 && (
          <div className="rounded-xl border border-dashed bg-white px-6 py-16 text-center text-muted-foreground">
            {t("No active ministries are available.")}
          </div>
        )}
        {!loading && !error && activeMinistries.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {activeMinistries.map((ministry) => (
              <Card key={ministry.id} className="bg-white">
                <CardHeader><CardTitle className="text-lg">{ministryName(ministry.ministry)}</CardTitle></CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {ministry.description && <p className="text-sm leading-relaxed text-muted-foreground">{ministry.description}</p>}
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/schemes?ministryId=${ministry.id}`}>{t("Show schemes")}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
