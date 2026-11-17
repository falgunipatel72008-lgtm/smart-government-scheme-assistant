import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Database,
  Globe,
  Layers,
  LogOut,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AdminLoadingSkeleton from "@/components/AdminLoadingSkeleton";
import {
  ADMIN_TOKEN_KEY,
  deleteCategory,
  deleteGender,
  deleteLocation,
  deleteMinistry,
  fetchCategories,
  fetchLocations,
  fetchMinistries,
  fetchSchemes,
  fetchGenders,
  saveCategory,
  saveGender,
  saveLocation,
  saveMinistry,
  type Category,
  type Gender,
  type Location,
  type Ministry,
  type SchemeRecord,
  updateCategory,
  updateGender,
  updateLocation,
  updateMinistry,
  updateSchemeStatus,
  verifyAdminSession,
} from "@/lib/api";

type AdminRouteProps = { children: ReactNode };

export function AdminRoute({ children }: AdminRouteProps) {
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    verifyAdminSession()
      .then(() => setStatus("allowed"))
      .catch(() => setStatus("denied"));
  }, []);

  if (status === "checking") {
    return <AdminLoadingSkeleton label="Checking admin session…" />;
  }
  if (status === "denied") return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function SectionCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function StatusButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <Button type="button" size="sm" variant="outline" onClick={onClick}>
      {active ? <Check className="mr-1 h-4 w-4" /> : null}{active ? "Active" : "Inactive"}
    </Button>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [schemes, setSchemes] = useState<SchemeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [categoryDraft, setCategoryDraft] = useState({ name: "", description: "" });
  const [ministryDraft, setMinistryDraft] = useState({ ministry: "", description: "" });
  const [genderDraft, setGenderDraft] = useState("");
  const [stateDraft, setStateDraft] = useState("");
  const [utDraft, setUtDraft] = useState("");
  const [isNavOpen, setIsNavOpen] = useState(true);
  const statCards = [
    { label: "Schemes", count: schemes.length, Icon: Layers },
    { label: "Categories", count: categories.length, Icon: Database },
    { label: "Ministries", count: ministries.length, Icon: ShieldCheck },
    { label: "Genders", count: genders.length, Icon: Users },
    { label: "Locations", count: locations.length, Icon: MapPin },
  ];

  const loadData = () => {
    setLoading(true);
    setError("");
    Promise.all([
      Promise.all([
        fetchCategories(),
        fetchMinistries(),
        fetchGenders(),
        fetchLocations(),
        fetchSchemes({ page: 1, pageSize: 50 }),
      ]),
      new Promise<void>((resolve) => window.setTimeout(resolve, 500)),
    ])
      .then(([[nextCategories, nextMinistries, nextGenders, nextLocations, nextSchemes]]) => {
        setCategories(nextCategories);
        setMinistries(nextMinistries);
        setGenders(nextGenders);
        setLocations(nextLocations);
        setSchemes(nextSchemes.schemes);
      })
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Unable to load admin data."))
      .finally(() => setLoading(false));
  };

  useEffect(loadData, []);

  const runAction = async (key: string, action: () => Promise<void>) => {
    setSaving(key);
    setError("");
    try {
      await action();
      loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The admin action failed.");
    } finally {
      setSaving("");
    }
  };

  const submitCategory = (event: FormEvent) => {
    event.preventDefault();
    runAction("category", async () => {
      await saveCategory(categoryDraft);
      setCategoryDraft({ name: "", description: "" });
    });
  };

  const submitMinistry = (event: FormEvent) => {
    event.preventDefault();
    runAction("ministry", async () => {
      await saveMinistry(ministryDraft);
      setMinistryDraft({ ministry: "", description: "" });
    });
  };

  const submitGender = (event: FormEvent) => {
    event.preventDefault();
    runAction("gender", async () => {
      await saveGender(genderDraft.trim());
      setGenderDraft("");
    });
  };

  const submitLocation = (kind: "state" | "union-territory", value: string, reset: () => void) => (event: FormEvent) => {
    event.preventDefault();
    runAction(kind, async () => {
      await saveLocation(kind, value.trim());
      reset();
    });
  };

  const remove = (label: string, action: () => Promise<void>) => {
    if (window.confirm(`Delete this ${label}? This may fail if it is used by a scheme.`)) runAction(`delete-${label}`, action);
  };

  const toggleCategory = (category: Category) => runAction(`category-${category.id}`, async () => {
    await updateCategory(category.id, { isActive: !category.isActive });
  });
  const toggleMinistry = (ministry: Ministry) => runAction(`ministry-${ministry.id}`, async () => {
    await updateMinistry(ministry.id, { isActive: !ministry.isActive });
  });
  const toggleGender = (gender: Gender) => runAction(`gender-${gender.id}`, async () => {
    await updateGender(gender.id, { isActive: !gender.isActive });
  });
  const toggleLocation = (location: Location) => {
    const kind = location.isUnionTerritory ? "union-territory" : "state";
    return runAction(`location-${location.id}-${kind}`, async () => {
      await updateLocation(location.id, kind, location.name, !location.isActive);
    });
  };
  const toggleScheme = (scheme: SchemeRecord) => runAction(`scheme-${scheme.id}`, async () => {
    await updateSchemeStatus(scheme.id, !scheme.isActive);
  });

  const signOut = () => {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    navigate("/admin/login", { replace: true });
  };

  if (loading) {
    return <AdminLoadingSkeleton label="Loading admin dashboard…" />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-slate-950 py-10 text-white">
        <div className="container mx-auto flex flex-col gap-5 px-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="outline" className="mb-4 border-secondary text-secondary"><ShieldCheck className="mr-1 h-3 w-3" /> Admin console</Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Manage GovScheme</h1>
            <p className="mt-2 text-slate-300">Create and maintain schemes and the master data used by the public portal.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10"><Link to="/"><Globe className="mr-2 h-4 w-4" /> Public site</Link></Button>
            <Button asChild className="bg-secondary text-slate-950 hover:bg-secondary/90"><Link to="/admin/schemes/new"> <Plus className="mr-2 h-4 w-4" /> Add scheme</Link></Button>
            <Button variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10" onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> Sign out</Button>
          </div>
        </div>
      </section>

      <main className="flex min-h-[calc(100vh-11rem)]">
        <aside className={`shrink-0 border-r bg-white p-3 transition-all duration-200 ${isNavOpen ? "w-64" : "w-14"}`}>
          <div className={`flex items-center ${isNavOpen ? "justify-between" : "justify-center"}`}>
            {isNavOpen && <span className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin menu</span>}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsNavOpen((open) => !open)}
              aria-label={isNavOpen ? "Close admin navigation" : "Open admin navigation"}
            >
              {isNavOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>
          </div>
          {isNavOpen && (
            <nav className="mt-4 space-y-1" aria-label="Admin navigation">
              <a href="#overview" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary/5 hover:text-primary">Overview</a>
              <Link to="/admin/schemes" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary/5 hover:text-primary">Schemes</Link>
              <Link to="/admin/categories" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary/5 hover:text-primary">Categories</Link>
              <Link to="/admin/ministries" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary/5 hover:text-primary">Ministries</Link>
              <Link to="/admin/genders" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary/5 hover:text-primary">Genders</Link>
              <Link to="/admin/locations" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary/5 hover:text-primary">States & UTs</Link>
              <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"><LogOut className="h-4 w-4" /> Sign out</button>
            </nav>
          )}
        </aside>

        <div id="overview" className="min-w-0 flex-1 space-y-8 bg-slate-50 p-6 lg:p-10">
        {error && <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button></div>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {statCards.map(({ label, count, Icon }) => (
            <Card key={String(label)}><CardContent className="flex items-center gap-3 p-5"><Icon className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{count}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>
          ))}
        </div>

        <div id="schemes"><SectionCard title="Schemes" icon={<Layers className="h-5 w-5 text-primary" />}>
          <div className="mb-4 flex justify-end"><Button asChild variant="outline"><Link to="/admin/schemes/new">Add detailed scheme <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
          <div className="divide-y rounded-lg border">
            {schemes.map((scheme) => <div key={scheme.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{scheme.name}</p><p className="text-sm text-muted-foreground">{scheme.ministry.name} · ID {scheme.id}</p></div><StatusButton active={scheme.isActive} onClick={() => toggleScheme(scheme)} /></div>)}
            {schemes.length === 0 && <p className="p-5 text-sm text-muted-foreground">No active schemes found.</p>}
          </div>
        </SectionCard></div>

        {false && <div id="master-data" className="grid gap-8 xl:grid-cols-2">
          <SectionCard title="Categories" icon={<Database className="h-5 w-5 text-primary" />}>
            <form onSubmit={submitCategory} className="mb-5 grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
              <Input value={categoryDraft.name} onChange={(event) => setCategoryDraft({ ...categoryDraft, name: event.target.value })} placeholder="Category name" required />
              <Input value={categoryDraft.description} onChange={(event) => setCategoryDraft({ ...categoryDraft, description: event.target.value })} placeholder="Description" required />
              <Button disabled={saving === "category"}><Plus className="mr-1 h-4 w-4" /> Add</Button>
            </form>
            <div className="divide-y rounded-lg border">{categories.map((category) => <div key={category.id} className="flex items-center justify-between gap-3 p-3"><span className="min-w-0 truncate text-sm font-medium">{category.name}</span><div className="flex shrink-0 gap-2"><StatusButton active={category.isActive} onClick={() => toggleCategory(category)} /><Button type="button" size="sm" variant="ghost" onClick={() => remove("category", () => deleteCategory(category.id))}><Trash2 className="h-4 w-4 text-red-600" /></Button></div></div>)}</div>
          </SectionCard>

          <SectionCard title="Ministries" icon={<ShieldCheck className="h-5 w-5 text-primary" />}>
            <form onSubmit={submitMinistry} className="mb-5 grid gap-3">
              <Input value={ministryDraft.ministry} onChange={(event) => setMinistryDraft({ ...ministryDraft, ministry: event.target.value })} placeholder="Ministry name" required />
              <div className="flex gap-3"><Input value={ministryDraft.description} onChange={(event) => setMinistryDraft({ ...ministryDraft, description: event.target.value })} placeholder="Description (optional)" /><Button disabled={saving === "ministry"}><Plus className="mr-1 h-4 w-4" /> Add</Button></div>
            </form>
            <div className="divide-y rounded-lg border">{ministries.map((ministry) => <div key={ministry.id} className="flex items-center justify-between gap-3 p-3"><span className="min-w-0 truncate text-sm font-medium">{ministry.ministry}</span><div className="flex shrink-0 gap-2"><StatusButton active={ministry.isActive} onClick={() => toggleMinistry(ministry)} /><Button type="button" size="sm" variant="ghost" onClick={() => remove("ministry", () => deleteMinistry(ministry.id))}><Trash2 className="h-4 w-4 text-red-600" /></Button></div></div>)}</div>
          </SectionCard>

          <SectionCard title="Genders" icon={<Users className="h-5 w-5 text-primary" />}>
            <form onSubmit={submitGender} className="mb-5 flex gap-3"><Input value={genderDraft} onChange={(event) => setGenderDraft(event.target.value)} placeholder="Gender value" required /><Button disabled={saving === "gender"}><Plus className="mr-1 h-4 w-4" /> Add</Button></form>
            <div className="divide-y rounded-lg border">{genders.map((gender) => <div key={gender.id} className="flex items-center justify-between gap-3 p-3"><span className="text-sm font-medium">{gender.gender}</span><div className="flex gap-2"><StatusButton active={gender.isActive} onClick={() => toggleGender(gender)} /><Button type="button" size="sm" variant="ghost" onClick={() => remove("gender", () => deleteGender(gender.id))}><Trash2 className="h-4 w-4 text-red-600" /></Button></div></div>)}</div>
          </SectionCard>

          <SectionCard title="States and union territories" icon={<MapPin className="h-5 w-5 text-primary" />}>
            <div className="grid gap-5 md:grid-cols-2">
              <form onSubmit={submitLocation("state", stateDraft, () => setStateDraft(""))} className="flex gap-2"><Label className="sr-only" htmlFor="new-state">State</Label><Input id="new-state" value={stateDraft} onChange={(event) => setStateDraft(event.target.value)} placeholder="New state" required /><Button disabled={saving === "state"}><Plus className="h-4 w-4" /></Button></form>
              <form onSubmit={submitLocation("union-territory", utDraft, () => setUtDraft(""))} className="flex gap-2"><Label className="sr-only" htmlFor="new-ut">Union territory</Label><Input id="new-ut" value={utDraft} onChange={(event) => setUtDraft(event.target.value)} placeholder="New union territory" required /><Button disabled={saving === "union-territory"}><Plus className="h-4 w-4" /></Button></form>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">{locations.map((location) => <div key={`${location.isUnionTerritory ? "ut" : "state"}-${location.id}`} className="flex items-center justify-between gap-2 rounded border p-2"><span className="truncate text-sm">{location.name}</span><div className="flex gap-1"><StatusButton active={location.isActive} onClick={() => toggleLocation(location)} /><Button type="button" size="sm" variant="ghost" onClick={() => remove(location.isUnionTerritory ? "union territory" : "state", () => deleteLocation(location.id, location.isUnionTerritory ? "union-territory" : "state"))}><Trash2 className="h-4 w-4 text-red-600" /></Button></div></div>)}</div>
          </SectionCard>
        </div>}
        </div>
      </main>
    </div>
  );
}
