import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Schemes from "./pages/Schemes";
import SchemeDetails from "./pages/SchemeDetails";
import CreateScheme from "./pages/CreateScheme";
import Categories from "./pages/CategoriesOnly";
import Ministries from "./pages/Ministries";
import Locations from "./pages/Locations";
import InfoPage from "./pages/InfoPage";
import SavedSchemesSection from "./components/SavedSchemesSection";
import Login from "./pages/Login";
import AdminDashboard, { AdminRoute } from "./pages/AdminDashboard";
import AdminResourcePage from "./pages/AdminResourcePage";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import PortalHeader from "./components/PortalHeader";
import { Button } from "@/components/ui/button";
import { Globe, Phone } from "lucide-react";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { SavedSchemesProvider } from "@/lib/savedSchemes";

const AppContent = () => {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <AppShell />
    </Router>
  );
};

const AppShell = () => {
  const { t } = useI18n();
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith("/admin");

  return (
      <div className={`flex min-h-screen flex-col ${isAdminArea ? "subpixel-antialiased" : ""}`}>
        {!isAdminArea && <PortalHeader />}

        {/* Main Content */}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/schemes" element={<Schemes />} />
            <Route path="/schemes/:id" element={<SchemeDetails />} />
            <Route path="/create-scheme" element={<AdminRoute><CreateScheme /></AdminRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/schemes/new" element={<AdminRoute><CreateScheme /></AdminRoute>} />
            <Route path="/admin/schemes/:id/edit" element={<AdminRoute><CreateScheme /></AdminRoute>} />
            <Route path="/admin/schemes" element={<AdminRoute><AdminResourcePage resource="schemes" /></AdminRoute>} />
            <Route path="/admin/categories" element={<AdminRoute><AdminResourcePage resource="categories" /></AdminRoute>} />
            <Route path="/admin/ministries" element={<AdminRoute><AdminResourcePage resource="ministries" /></AdminRoute>} />
            <Route path="/admin/genders" element={<AdminRoute><AdminResourcePage resource="genders" /></AdminRoute>} />
            <Route path="/admin/locations" element={<AdminRoute><AdminResourcePage resource="locations" /></AdminRoute>} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/ministries" element={<Ministries />} />
            <Route path="/saved-schemes" element={<SavedSchemesSection />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/how-it-works" element={<InfoPage kind="how-it-works" />} />
            <Route path="/help" element={<InfoPage kind="help" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        {/* Footer */}
        {!isAdminArea && <footer id="footer" className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
              <div className="col-span-1 md:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-3 mb-6">
                  <Globe className="w-8 h-8 text-white" />
                  <span className="text-2xl font-bold text-white tracking-tight">GovScheme</span>
                </div>
                <p className="text-sm leading-relaxed mb-6">
                  {t("A centralized platform for citizens to discover and apply for government schemes efficiently. Empowerment through direct digital access.")}
                </p>
                <div className="flex gap-4">
                  <Button variant="ghost" size="icon" className="bg-white/5 hover:bg-white/10 text-white rounded-full">
                    <i className="fa-brands fa-x-twitter"></i>
                  </Button>
                  <Button variant="ghost" size="icon" className="bg-white/5 hover:bg-white/10 text-white rounded-full">
                    <i className="fa-brands fa-facebook-f"></i>
                  </Button>
                  <Button variant="ghost" size="icon" className="bg-white/5 hover:bg-white/10 text-white rounded-full">
                    <i className="fa-brands fa-linkedin-in"></i>
                  </Button>
                </div>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-6">{t("Quick Links")}</h4>
                <ul className="space-y-4 text-sm">
                  <li><Link to="#" className="hover:text-white transition-colors">{t("About Portal")}</Link></li>
                  <li><Link to="#" className="hover:text-white transition-colors">{t("Central Schemes")}</Link></li>
                  <li><Link to="#" className="hover:text-white transition-colors">{t("State Schemes")}</Link></li>
                  <li><Link to="#" className="hover:text-white transition-colors">{t("UT Schemes")}</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-6">{t("Resources")}</h4>
                <ul className="space-y-4 text-sm">
                  <li><Link to="#" className="hover:text-white transition-colors">{t("Privacy Policy")}</Link></li>
                  <li><Link to="#" className="hover:text-white transition-colors">{t("Terms of Service")}</Link></li>
                  <li><Link to="#" className="hover:text-white transition-colors">{t("User Manual")}</Link></li>
                  <li><Link to="#" className="hover:text-white transition-colors">{t("FAQs")}</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-6">{t("Support")}</h4>
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-secondary mt-1" />
                    <div>
                      <p className="text-white font-medium">{t("Toll Free Helpline")}</p>
                      <p>1800-123-4567</p>
                    </div>
                  </div>
                  <p>{t("National Portal of Bharat, MeitY, New Delhi - 110003")}</p>
                </div>
              </div>
            </div>
            
            <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
              <p>{t("© 2024 National e-Governance Division. All Rights Reserved.")}</p>
              <div className="flex gap-6">
                <Link to="#" className="hover:text-white">{t("Accessibility Statement")}</Link>
                <Link to="#" className="hover:text-white">{t("Site Map")}</Link>
              </div>
            </div>
          </div>
        </footer>}
      </div>
  );
};

const App = () => (
  <I18nProvider>
    <SavedSchemesProvider>
      <AppContent />
    </SavedSchemesProvider>
  </I18nProvider>
);

export default App;