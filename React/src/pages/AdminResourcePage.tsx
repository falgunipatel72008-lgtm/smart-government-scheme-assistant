import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Database, Globe, Layers, LogOut, MapPin, PanelLeftClose, PanelLeftOpen, Pencil, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
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
  fetchGenders,
  fetchLocations,
  fetchMinistries,
  fetchSchemes,
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
} from "@/lib/api";

export type AdminResource = "schemes" | "categories" | "ministries" | "genders" | "locations";

function ResourceNav() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const signOut = () => {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    navigate("/admin/login", { replace: true });
  };
  const links: [string, string][] = [
    ["schemes", "Schemes"],
    ["categories", "Categories"],
    ["ministries", "Ministries"],
    ["genders", "Genders"],
    ["locations", "States & UTs"],
  ];

  return (
    <aside className={`shrink-0 border-r bg-white p-3 transition-all ${open ? "w-64" : "w-14"}`}>
      <div className={`flex items-center ${open ? "justify-between" : "justify-center"}`}>
        {open && <span className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin menu</span>}
        <Button type="button" variant="ghost" size="icon" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close admin navigation" : "Open admin navigation"}>
          {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </Button>
      </div>
      {open && <nav className="mt-4 space-y-1" aria-label="Admin navigation">
        <Link to="/admin" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary/5 hover:text-primary">Overview</Link>
        {links.map(([path, label]) => <Link key={path} to={`/admin/${path}`} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary/5 hover:text-primary">{label}</Link>)}
        <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"><LogOut className="h-4 w-4" /> Sign out</button>
      </nav>}
    </aside>
  );
}

function StatusButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return <Button type="button" size="sm" variant="outline" onClick={onClick}>{active && <Check className="mr-1 h-4 w-4" />}{active ? "Active" : "Inactive"}</Button>;
}

function ResourceCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <Card className="bg-white"><CardHeader><CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>;
}

export default function AdminResourcePage({ resource }: { resource: AdminResource }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [schemes, setSchemes] = useState<SchemeRecord[]>([]);
  const [draft, setDraft] = useState({ first: "", second: "" });
  const [editing, setEditing] = useState<{ id: number; kind: "category" | "ministry" | "gender" | "location"; first: string; second: string; isActive: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    const request = resource === "categories" ? fetchCategories().then(setCategories)
      : resource === "ministries" ? fetchMinistries().then(setMinistries)
        : resource === "genders" ? fetchGenders().then(setGenders)
          : resource === "locations" ? fetchLocations().then(setLocations)
            : fetchSchemes({ page: 1, pageSize: 50 }).then((data) => setSchemes(data.schemes));
    Promise.all([
      request,
      new Promise<void>((resolve) => window.setTimeout(resolve, 500)),
    ]).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Unable to load records.")).finally(() => setLoading(false));
  };

  useEffect(() => {
    setDraft({ first: "", second: "" });
    setEditing(null);
    load();
  }, [resource]);

  const action = async (operation: () => Promise<void>) => {
    setError("");
    try {
      await operation();
      load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The admin action failed.");
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (resource === "categories") return void action(async () => { await saveCategory({ name: draft.first, description: draft.second }); setDraft({ first: "", second: "" }); });
    if (resource === "ministries") return void action(async () => { await saveMinistry({ ministry: draft.first, description: draft.second }); setDraft({ first: "", second: "" }); });
    if (resource === "genders") return void action(async () => { await saveGender(draft.first); setDraft({ first: "", second: "" }); });
    const kind = draft.second === "ut" ? "union-territory" : "state";
    void action(async () => { await saveLocation(kind, draft.first); setDraft({ first: "", second: "" }); });
  };

  const remove = (label: string, operation: () => Promise<void>) => {
    if (window.confirm(`Delete this ${label}? This may fail if it is used by a scheme.`)) void action(operation);
  };

  const saveEdit = () => {
    if (!editing) return;
    if (!editing.first.trim()) {
      setError("Name is required.");
      return;
    }
    void action(async () => {
      if (editing.kind === "category") {
        await updateCategory(editing.id, {
          name: editing.first.trim(),
          description: editing.second.trim(),
        });
      } else if (editing.kind === "ministry") {
        await updateMinistry(editing.id, {
          ministry: editing.first.trim(),
          description: editing.second.trim(),
        });
      } else if (editing.kind === "gender") {
        await updateGender(editing.id, { gender: editing.first.trim() });
      } else {
        await updateLocation(
          editing.id,
          editing.second === "ut" ? "union-territory" : "state",
          editing.first.trim(),
          editing.isActive,
        );
      }
      setEditing(null);
    });
  };

  const renderMasterRows = () => {
    if (resource === "categories") return categories.map((item) => editing?.kind === "category" && editing.id === item.id
      ? <div key={item.id} className="grid gap-3 border-b p-3 md:grid-cols-[1fr_1.5fr_auto]"><Input value={editing.first} onChange={(event) => setEditing({ ...editing, first: event.target.value })} placeholder="Category name" /><Input value={editing.second} onChange={(event) => setEditing({ ...editing, second: event.target.value })} placeholder="Description" /><div className="flex gap-2"><Button size="sm" onClick={saveEdit}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button></div></div>
      : <div key={item.id} className="flex items-center justify-between gap-3 border-b p-3"><div><span className="font-medium">{item.name}</span>{item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}</div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setEditing({ id: item.id, kind: "category", first: item.name, second: item.description, isActive: item.isActive })}><Pencil className="mr-1 h-4 w-4" /> Edit</Button><StatusButton active={item.isActive} onClick={() => void action(() => updateCategory(item.id, { isActive: !item.isActive }).then(() => undefined))} /><Button variant="ghost" size="icon" onClick={() => remove("category", () => deleteCategory(item.id))}><Trash2 className="h-4 w-4 text-red-600" /></Button></div></div>);
    if (resource === "ministries") return ministries.map((item) => editing?.kind === "ministry" && editing.id === item.id
      ? <div key={item.id} className="grid gap-3 border-b p-3 md:grid-cols-[1fr_1.5fr_auto]"><Input value={editing.first} onChange={(event) => setEditing({ ...editing, first: event.target.value })} placeholder="Ministry name" /><Input value={editing.second} onChange={(event) => setEditing({ ...editing, second: event.target.value })} placeholder="Description" /><div className="flex gap-2"><Button size="sm" onClick={saveEdit}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button></div></div>
      : <div key={item.id} className="flex items-center justify-between gap-3 border-b p-3"><div><span className="font-medium">{item.ministry}</span>{item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}</div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setEditing({ id: item.id, kind: "ministry", first: item.ministry, second: item.description, isActive: item.isActive })}><Pencil className="mr-1 h-4 w-4" /> Edit</Button><StatusButton active={item.isActive} onClick={() => void action(() => updateMinistry(item.id, { isActive: !item.isActive }).then(() => undefined))} /><Button variant="ghost" size="icon" onClick={() => remove("ministry", () => deleteMinistry(item.id))}><Trash2 className="h-4 w-4 text-red-600" /></Button></div></div>);
    if (resource === "genders") return genders.map((item) => editing?.kind === "gender" && editing.id === item.id
      ? <div key={item.id} className="flex items-center gap-3 border-b p-3"><Input value={editing.first} onChange={(event) => setEditing({ ...editing, first: event.target.value })} placeholder="Gender" /><div className="ml-auto flex gap-2"><Button size="sm" onClick={saveEdit}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button></div></div>
      : <div key={item.id} className="flex items-center justify-between gap-3 border-b p-3"><span className="font-medium">{item.gender}</span><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setEditing({ id: item.id, kind: "gender", first: item.gender, second: "", isActive: item.isActive })}><Pencil className="mr-1 h-4 w-4" /> Edit</Button><StatusButton active={item.isActive} onClick={() => void action(() => updateGender(item.id, { isActive: !item.isActive }).then(() => undefined))} /><Button variant="ghost" size="icon" onClick={() => remove("gender", () => deleteGender(item.id))}><Trash2 className="h-4 w-4 text-red-600" /></Button></div></div>);
    return locations.map((item) => {
      const kind = item.isUnionTerritory ? "union-territory" : "state";
      return editing?.kind === "location" && editing.id === item.id
        ? <div key={`${kind}-${item.id}`} className="grid gap-3 border-b p-3 md:grid-cols-[1fr_220px_auto]"><Input value={editing.first} onChange={(event) => setEditing({ ...editing, first: event.target.value })} placeholder="State or union territory" /><select value={editing.second} onChange={(event) => setEditing({ ...editing, second: event.target.value })} className="h-10 rounded-md border px-3 text-sm"><option value="state">State</option><option value="ut">Union territory</option></select><div className="flex gap-2"><Button size="sm" onClick={saveEdit}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button></div></div>
        : <div key={`${kind}-${item.id}`} className="flex items-center justify-between gap-3 border-b p-3"><span className="font-medium">{item.name}</span><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setEditing({ id: item.id, kind: "location", first: item.name, second: item.isUnionTerritory ? "ut" : "state", isActive: item.isActive })}><Pencil className="mr-1 h-4 w-4" /> Edit</Button><StatusButton active={item.isActive} onClick={() => void action(() => updateLocation(item.id, kind, item.name, !item.isActive).then(() => undefined))} /><Button variant="ghost" size="icon" onClick={() => remove(kind, () => deleteLocation(item.id, kind))}><Trash2 className="h-4 w-4 text-red-600" /></Button></div></div>;
    });
  };

  const title = resource === "locations" ? "States and union territories" : resource[0].toUpperCase() + resource.slice(1);
  const signOut = () => {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    navigate("/admin/login", { replace: true });
  };
  if (loading) return <AdminLoadingSkeleton label={`Loading ${title.toLowerCase()}…`} />;

  return <div className="min-h-screen bg-slate-50">
    <section className="bg-slate-950 py-10 text-white">
      <div className="container mx-auto flex flex-col gap-5 px-4 md:flex-row md:items-end md:justify-between">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-secondary">Admin console</p><h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Manage {title}</h1><p className="mt-2 text-slate-300">Maintain this area of the GovScheme public portal.</p></div>
        <div className="flex gap-2"><Button asChild variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10"><Link to="/"><Globe className="mr-2 h-4 w-4" /> Public site</Link></Button><Button asChild className="bg-secondary text-slate-950 hover:bg-secondary/90"><Link to="/admin/schemes/new"><Plus className="mr-2 h-4 w-4" /> Add scheme</Link></Button><Button variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10" onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> Sign out</Button></div>
      </div>
    </section>
    <div className="flex min-h-[calc(100vh-11rem)]"><ResourceNav /><main className="min-w-0 flex-1 p-6 lg:p-10"><div className="mx-auto max-w-5xl space-y-6">{error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {resource === "schemes" ? <ResourceCard title="Schemes" icon={<Layers className="h-5 w-5 text-primary" />}><div className="mb-4 flex justify-end"><Button asChild><Link to="/admin/schemes/new"><Plus className="mr-2 h-4 w-4" /> Add scheme</Link></Button></div><div className="divide-y rounded border">{schemes.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 p-4"><div><p className="font-semibold">{item.name}</p><p className="text-sm text-muted-foreground">{item.ministry.name}</p></div><div className="flex items-center gap-2"><Button asChild size="sm" variant="outline"><Link to={`/admin/schemes/${item.id}/edit`}><Pencil className="mr-1 h-4 w-4" /> Edit</Link></Button><StatusButton active={item.isActive} onClick={() => void action(() => updateSchemeStatus(item.id, !item.isActive))} /></div></div>)}</div></ResourceCard>
      : <ResourceCard title={title} icon={resource === "categories" ? <Database className="h-5 w-5 text-primary" /> : resource === "ministries" ? <ShieldCheck className="h-5 w-5 text-primary" /> : resource === "genders" ? <Users className="h-5 w-5 text-primary" /> : <MapPin className="h-5 w-5 text-primary" />}><form onSubmit={submit} className="mb-5 grid gap-3 md:grid-cols-[1fr_1.5fr_auto]"><Label className="sr-only" htmlFor="resource-name">Name</Label><Input id="resource-name" value={draft.first} onChange={(event) => setDraft({ ...draft, first: event.target.value })} placeholder={resource === "categories" ? "Category name" : resource === "ministries" ? "Ministry name" : resource === "genders" ? "Gender" : "State or union territory"} required />{resource === "categories" || resource === "ministries" ? <Input value={draft.second} onChange={(event) => setDraft({ ...draft, second: event.target.value })} placeholder="Description" required={resource === "categories"} /> : resource === "locations" ? <select value={draft.second} onChange={(event) => setDraft({ ...draft, second: event.target.value })} className="h-10 rounded-md border px-3 text-sm"><option value="state">State</option><option value="ut">Union territory</option></select> : <span /> }<Button><Plus className="mr-1 h-4 w-4" /> Add</Button></form><div className="rounded border">{renderMasterRows()}</div></ResourceCard>}
  </div></main></div></div>;
}
