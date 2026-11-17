import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ArrowRight, CheckCircle2, Clock3, FileText, HelpCircle, Landmark, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Index() {
  const { t } = useI18n();
  const [income, setIncome] = useState([450000]);
  const [dependents, setDependents] = useState([2]);

  const estimatedBenefit = Math.max(0, Math.floor((income[0] < 800000 ? 50000 : 0) + (dependents[0] * 12000)));

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden bg-primary py-20 text-white md:py-28">
        <div className="absolute -right-20 -top-32 h-96 w-96 rounded-full border border-white/10" aria-hidden="true" />
        <div className="absolute -right-8 -top-20 h-72 w-72 rounded-full border border-white/10" aria-hidden="true" />
        <div className="container relative mx-auto px-4">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-primary-foreground/90">
              <Landmark className="h-4 w-4 text-secondary" />
              {t("Your guide to government support")}
            </div>
            <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl">
              {t("Welcome to GovScheme")}
            </h1>
            <p className="mb-9 max-w-2xl text-lg leading-relaxed text-primary-foreground/80 md:text-xl">
              {t("Discover government schemes, benefits, eligibility and how to apply—all in one place.")}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 rounded-lg bg-secondary px-7 text-base font-semibold text-white hover:bg-secondary/90">
                <Link to="/schemes">{t("Explore schemes")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="mt-10 flex items-center gap-3 text-sm text-primary-foreground/75">
              <ShieldCheck className="h-5 w-5 shrink-0 text-secondary" />
              <span>{t("Clear information to help you take your next step with confidence.")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Practical tools */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Benefit Estimator */}
            <Card className="shadow-2xl shadow-slate-200 border-none overflow-hidden">
              <div className="bg-primary p-8 text-white">
                <CardTitle className="mb-2 text-2xl">{t("A quick eligibility guide")}</CardTitle>
                <CardDescription className="text-primary-foreground/70">{t("Use your household details to get a starting point. Final eligibility is decided by the scheme office.")}</CardDescription>
              </div>
              <CardContent className="p-8 space-y-10">
                <div className="space-y-6">
                  <div className="flex justify-between mb-4">
                    <Label className="text-base font-semibold">{t("Annual Family Income")}</Label>
                    <span className="text-primary font-bold">₹{income[0].toLocaleString()}</span>
                  </div>
                  <Slider 
                    value={income} 
                    onValueChange={setIncome} 
                    max={2000000} 
                    step={10000} 
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>₹0</span>
                    <span>₹2,000,000</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between mb-4">
                    <Label className="text-base font-semibold">{t("Number of Dependents")}</Label>
                    <span className="text-primary font-bold">{dependents[0]}</span>
                  </div>
                  <Slider 
                    value={dependents} 
                    onValueChange={setDependents} 
                    max={10} 
                    step={1} 
                    className="py-4"
                  />
                </div>

                <div className="bg-emerald-50 rounded-2xl p-6 flex items-center justify-between border border-emerald-100">
                  <div>
                    <p className="mb-1 text-sm font-medium uppercase tracking-wider text-emerald-800">{t("Possible yearly support")}</p>
                    <p className="text-3xl font-black text-emerald-700">₹{estimatedBenefit.toLocaleString()}</p>
                  </div>
                  <CheckCircle2 className="h-10 w-10 text-emerald-500/50" />
                </div>
                
                <Button className="h-14 w-full bg-primary text-lg font-bold">{t("View suitable schemes")}</Button>
              </CardContent>
            </Card>

            {/* Help people choose their next step */}
            <div className="flex flex-col gap-8">
              <Card className="border-none shadow-lg">
                <CardHeader className="pb-5">
                  <div>
                    <CardTitle className="text-xl">{t("Not sure where to start?")}</CardTitle>
                    <CardDescription>{t("These simple guides can point you in the right direction.")}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <Button variant="outline" className="h-auto justify-start gap-3 whitespace-normal p-4 text-left"><FileText className="h-5 w-5 shrink-0 text-primary" /><span><strong className="block">{t("Check documents")}</strong><small className="font-normal text-muted-foreground">{t("Know what to keep ready")}</small></span></Button>
                  <Button variant="outline" className="h-auto justify-start gap-3 whitespace-normal p-4 text-left"><HelpCircle className="h-5 w-5 shrink-0 text-primary" /><span><strong className="block">{t("Understand the process")}</strong><small className="font-normal text-muted-foreground">{t("See how applications work")}</small></span></Button>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">{t("Application steps")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-emerald-100 p-3">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="flex-grow">
                      <p className="font-bold text-slate-800">{t("Find a scheme")}</p>
                      <p className="text-sm text-muted-foreground">{t("Use your needs and category to search.")}</p>
                    </div>
                    <span className="text-sm font-medium text-emerald-600">1</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-amber-100 p-3">
                      <Clock3 className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="flex-grow">
                      <p className="font-bold text-slate-800">{t("Check eligibility")}</p>
                      <p className="text-sm text-muted-foreground">{t("Read the requirements and keep documents ready.")}</p>
                    </div>
                    <span className="text-sm font-medium text-amber-600">2</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-slate-100 p-3">
                      <ArrowRight className="h-6 w-6 text-slate-500" />
                    </div>
                    <div className="flex-grow">
                      <p className="font-bold text-slate-800">{t("Apply through the official channel")}</p>
                      <p className="text-sm text-muted-foreground">{t("Submit online or visit the office listed.")}</p>
                    </div>
                    <span className="text-sm font-medium text-slate-500">3</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}