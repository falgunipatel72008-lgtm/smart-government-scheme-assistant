import { ArrowRight, Globe, LockKeyhole, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { ADMIN_TOKEN_KEY, loginAdmin, verifyAdminSession } from "@/lib/api";
import AdminLoadingSkeleton from "@/components/AdminLoadingSkeleton";

export default function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!window.localStorage.getItem(ADMIN_TOKEN_KEY)) {
      setCheckingSession(false);
      return;
    }

    verifyAdminSession()
      .then(() => navigate("/admin", { replace: true }))
      .catch(() => {
        window.localStorage.removeItem(ADMIN_TOKEN_KEY);
        setCheckingSession(false);
      });
  }, [navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const result = await loginAdmin(
        String(formData.get("id") || ""),
        String(formData.get("password") || ""),
      );
      window.localStorage.setItem(ADMIN_TOKEN_KEY, result.token);
      navigate("/admin", { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : t("Unable to sign in."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingSession) {
    return <AdminLoadingSkeleton label="Checking admin session…" />;
  }

  return (
    <div className="flex min-h-[calc(100vh-11rem)] items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md border-none shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">{t("Welcome back")}</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">{t("Admin access only.")}</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="id">{t("Admin ID")}</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="id" name="id" type="text" autoComplete="username" placeholder={t("Enter your admin ID")} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("Password")}</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" name="password" type="password" autoComplete="current-password" placeholder={t("Enter your password")} className="pl-10" required />
              </div>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white hover:bg-primary/90">
              {isSubmitting ? t("Signing in…") : t("Sign In")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="font-semibold text-primary hover:underline">{t("Return to public portal")}</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}