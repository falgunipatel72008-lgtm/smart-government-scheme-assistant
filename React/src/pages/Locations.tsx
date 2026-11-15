import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchLocations, type Location } from "@/lib/api";

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchLocations(controller.signal)
      .then(setLocations)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load states and union territories.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const activeLocations = locations.filter((location) => location.isActive);
  const states = activeLocations.filter((location) => !location.isUnionTerritory);
  const unionTerritories = activeLocations.filter((location) => location.isUnionTerritory);

  const renderLocations = (items: Location[]) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((location) => (
        <Card key={`${location.isUnionTerritory ? "ut" : "state"}-${location.id}`} className="bg-white">
          <CardContent className="flex items-center gap-4 p-5">
            <MapPin className="h-5 w-5 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 truncate font-semibold">{location.name}</p>
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
  );

  return (
    <div className="bg-slate-50">
      <section className="bg-slate-900 py-16 text-white">
        <div className="container mx-auto px-4">
          <Badge variant="outline" className="mb-5 border-secondary text-secondary">Master data</Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">States and union territories</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">
            Location records loaded from the database.
          </p>
        </div>
      </section>

      <main className="container mx-auto space-y-10 px-4 py-14">
        {loading && <p role="status" className="text-center text-muted-foreground">Loading states and union territories…</p>}
        {error && (
          <div role="alert" className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
            <p>{error}</p>
            <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>Retry</Button>
          </div>
        )}
        {!loading && !error && activeLocations.length === 0 && (
          <div className="rounded-xl border border-dashed bg-white px-6 py-16 text-center text-muted-foreground">
            No active states or union territories are available.
          </div>
        )}
        {!loading && !error && activeLocations.length > 0 && (
          <>
            <section>
              <h2 className="mb-5 text-2xl font-bold">States</h2>
              {states.length ? renderLocations(states) : <p className="text-sm text-muted-foreground">No active states are available.</p>}
            </section>
            <section>
              <h2 className="mb-5 text-2xl font-bold">Union territories</h2>
              {unionTerritories.length ? renderLocations(unionTerritories) : <p className="text-sm text-muted-foreground">No active union territories are available.</p>}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
