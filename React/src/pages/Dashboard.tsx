import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Layers, MapPin, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchCategories,
  fetchLocations,
  fetchMinistries,
  type Category,
  type Location,
  type Ministry,
} from "@/lib/api";

type DashboardData = {
  categories: Category[];
  locations: Location[];
  ministries: Ministry[];
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      fetchCategories(controller.signal),
      fetchLocations(controller.signal),
      fetchMinistries(controller.signal),
    ])
      .then(([categories, locations, ministries]) => setData({ categories, locations, ministries }))
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load master data.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const categories = (data?.categories ?? []).filter((category) => category.isActive).slice(0, 3);
  const ministries = (data?.ministries ?? []).filter((ministry) => ministry.isActive).slice(0, 3);
  const locations = (data?.locations ?? []).filter((location) => location.isActive);
  const areas = [
    ...locations.filter((location) => !location.isUnionTerritory).slice(0, 2),
    ...locations.filter((location) => location.isUnionTerritory).slice(0, 2),
  ];

  return (
    <div className="bg-slate-50">
      <section className="bg-primary py-14 text-white">
        <div className="container mx-auto flex flex-col justify-between gap-8 px-4 md:flex-row md:items-end">
          <div>
            <Badge variant="outline" className="mb-4 border-secondary text-secondary">Master data</Badge>
            <h1 className="text-4xl font-bold tracking-tight">Explore master data.</h1>
            <p className="mt-3 max-w-xl text-primary-foreground/75">
              Browse categories, ministries, states, and union territories.
            </p>
          </div>
          <Button asChild className="bg-secondary text-white hover:bg-secondary/90">
            <Link to="/categories">View categories <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <main className="container mx-auto space-y-8 px-4 py-10">
        {loading && <p role="status" className="text-muted-foreground">Loading master data…</p>}
        {error && (
          <div role="alert" className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 sm:flex-row sm:items-center sm:justify-between">
            <p>{error}</p>
            <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </div>
        )}

        {data && !error && (
          <>
            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Categories</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Active category master data.</p>
                </div>
                <Button asChild variant="link" className="shrink-0">
                  <Link to="/categories">View all categories <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
              {categories.length ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {categories.map((category) => (
                    <Card key={category.id} className="bg-white">
                      <CardContent className="flex items-start gap-4 p-5">
                        {category.imageUrl ? (
                          <img src={category.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <Layers className="mt-1 h-5 w-5 shrink-0 text-primary" />
                        )}
                        <div>
                          <h3 className="font-semibold">{category.name}</h3>
                          {category.description && <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>}
                        </div>
                      </CardContent>
                      <CardContent className="pt-0">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/schemes?categoryId=${category.id}`}>Show schemes</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : <p className="rounded-xl border border-dashed bg-white p-6 text-sm text-muted-foreground">No active categories are available.</p>}
            </section>

            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Ministries</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Active ministry master data.</p>
                </div>
                <Button asChild variant="link" className="shrink-0">
                  <Link to="/ministries">View all ministries <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
              {ministries.length ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {ministries.map((ministry) => (
                    <Card key={ministry.id} className="bg-white">
                      <CardHeader><CardTitle className="text-lg">{ministry.ministry}</CardTitle></CardHeader>
                      <CardContent className="space-y-4 pt-0">
                        {ministry.description && <p className="text-sm text-muted-foreground">{ministry.description}</p>}
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/schemes?ministryId=${ministry.id}`}>Show schemes</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : <p className="rounded-xl border border-dashed bg-white p-6 text-sm text-muted-foreground">No active ministries are available.</p>}
            </section>

            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">States and union territories</h2>
                  <p className="mt-1 text-sm text-muted-foreground">A sample of active areas.</p>
                </div>
                <Button asChild variant="link" className="shrink-0">
                  <Link to="/locations">View all areas <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
              {areas.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {areas.map((location) => (
                    <Card key={`${location.isUnionTerritory ? "ut" : "state"}-${location.id}`} className="bg-white">
                      <CardContent className="flex items-center gap-3 p-5">
                        <MapPin className="h-5 w-5 shrink-0 text-primary" />
                        <div>
                          <p className="font-semibold">{location.name}</p>
                          <p className="text-sm text-muted-foreground">{location.isUnionTerritory ? "Union Territory" : "State"}</p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link to={location.isUnionTerritory
                            ? `/schemes?unionTerritoryId=${location.id}`
                            : `/schemes?stateId=${location.id}`}>
                            Show schemes
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : <p className="rounded-xl border border-dashed bg-white p-6 text-sm text-muted-foreground">No active areas are available.</p>}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
