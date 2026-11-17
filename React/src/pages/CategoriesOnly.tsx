import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layers, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchCategories, type Category } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function CategoriesOnly() {
  const { t, categoryName, categoryDescription } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchCategories(controller.signal)
      .then(setCategories)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load categories.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const activeCategories = categories.filter((category) => category.isActive);

  return (
    <div className="bg-slate-50">
      <section className="bg-slate-900 py-16 text-white">
        <div className="container mx-auto px-4">
          <Badge variant="outline" className="mb-5 border-secondary text-secondary">{t("Master data")}</Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{t("Categories")}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">
            {t("Categories are loaded from the master data database.")}
          </p>
        </div>
      </section>

      <main className="container mx-auto px-4 py-14">
        {loading && <p role="status" className="text-center text-muted-foreground">{t("Loading categories…")}</p>}
        {error && (
          <div role="alert" className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
            <p>{error}</p>
            <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" /> {t("Retry")}
            </Button>
          </div>
        )}

        {!loading && !error && activeCategories.length === 0 && (
          <div className="rounded-xl border border-dashed bg-white px-6 py-16 text-center text-muted-foreground">
            {t("No active categories are available yet.")}
          </div>
        )}

        {!loading && !error && activeCategories.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {activeCategories.map((category) => (
              <Card key={category.id} className="border-slate-200 bg-white transition-all hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="p-8">
                  {category.imageUrl ? (
                    <img src={category.imageUrl} alt="" className="mb-6 h-16 w-16 rounded-2xl object-cover" />
                  ) : (
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Layers className="h-8 w-8" />
                    </div>
                  )}
                  <h2 className="text-2xl font-bold">{categoryName(category.name)}</h2>
                  <p className="mt-2 max-w-md text-muted-foreground">{categoryDescription(category.description)}</p>
                  <Button asChild variant="outline" className="mt-8 border-primary text-primary hover:bg-primary hover:text-white">
                    <Link to={`/schemes?categoryId=${category.id}`}>{t("Show schemes")}</Link>
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
