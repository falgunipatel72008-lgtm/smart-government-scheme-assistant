import { Link, NavLink, useLocation } from "react-router-dom";
import { Globe, Languages, Menu, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n, type Language } from "@/lib/i18n";
import { ADMIN_TOKEN_KEY } from "@/lib/api";

const NAV_ITEMS: { label: string; to: string }[] = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Schemes", to: "/schemes" },
  { label: "Categories", to: "/categories" },
  { label: "Ministries", to: "/ministries" },
  { label: "States & UTs", to: "/locations" },
  { label: "How it Works", to: "/how-it-works" },
  { label: "Saved schemes", to: "/saved-schemes" },
  { label: "Help & Support", to: "/help" },
];

export default function PortalHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const location = useLocation();
  const { language, setLanguage, t } = useI18n();

  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    setIsAdminLoggedIn(Boolean(window.localStorage.getItem(ADMIN_TOKEN_KEY)));
  }, [location.pathname]);

  return (
    <header id="header" className="sticky top-0 z-50 border-b border-border bg-white">
      <div className="bg-primary py-1 text-xs text-primary-foreground">
        <div className="container mx-auto flex items-center justify-between px-4">
          <span className="flex items-center gap-2"><Globe className="h-3 w-3" /> {t("Government services portal")}</span>
          <div className="hidden items-center gap-4 sm:flex">
            <button className="hover:underline">{t("Screen Reader Access")}</button>
            <div className="flex gap-2"><button className="border border-primary-foreground/30 px-1 hover:bg-white/10">A-</button><button className="border border-primary-foreground/30 px-1 hover:bg-white/10">A</button><button className="border border-primary-foreground/30 px-1 hover:bg-white/10">A+</button></div>
          </div>
        </div>
      </div>
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" onClick={closeMenu} className="flex items-center gap-2"><div className="rounded-lg bg-primary/10 p-1.5"><Globe className="h-7 w-7 text-primary" /></div><div><h1 className="text-lg font-bold leading-none tracking-tight text-primary">GovScheme</h1><p className="mt-0.5 text-[9px] font-medium uppercase tracking-widest text-muted-foreground">{t("Find public support")}</p></div></Link>
        <div className="hidden items-center gap-4 text-sm font-medium lg:flex">{NAV_ITEMS.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? "flex items-center border-b-2 border-primary py-5 text-primary" : "flex items-center py-5 text-muted transition-colors hover:text-primary"}>{t(item.label)}</NavLink>)}</div>
        <div className="flex items-center gap-2 sm:gap-3">
          <label className="flex items-center gap-2 rounded-md border border-primary/20 bg-white px-2 text-sm font-medium text-slate-800 focus-within:ring-2 focus-within:ring-primary">
            <Languages className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="sr-only">{t("Language")}</span>
            <select
              id="language-preference"
              aria-label={t("Language")}
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              className="h-8 w-12 bg-transparent text-xs font-semibold focus:outline-none"
            >
              <option value="en">EN</option>
              <option value="hi">HI</option>
              <option value="gu">GU</option>
            </select>
          </label>
          {isAdminLoggedIn && <Button asChild variant="outline" className="hidden gap-2 border-primary/20 sm:flex"><Link to="/admin"><ShieldCheck className="h-4 w-4" /> Admin panel</Link></Button>}
          <Button asChild size="sm" className="hidden bg-primary px-3 text-xs text-white shadow-lg shadow-primary/20 hover:bg-primary/90 sm:inline-flex"><Link to="/schemes">{t("Find a scheme")}</Link></Button>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMenuOpen((open) => !open)} aria-label={t(isMenuOpen ? "Close navigation menu" : "Open navigation menu")}>{isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</Button>
        </div>
      </nav>
      {isMenuOpen && <div className="border-t border-border bg-white px-4 py-4 shadow-lg lg:hidden"><div className="container mx-auto flex flex-col gap-1">{NAV_ITEMS.map((item) => <NavLink key={item.to} to={item.to} onClick={closeMenu} className={({ isActive }) => `rounded-lg px-4 py-3 text-sm font-medium ${isActive ? "bg-primary/5 text-primary" : "text-muted hover:bg-slate-50 hover:text-primary"}`}>{t(item.label)}</NavLink>)}</div></div>}
    </header>
  );
}