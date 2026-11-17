import { LoaderCircle } from "lucide-react";

export default function AdminLoadingSkeleton({ label = "Loading admin data…" }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="flex min-h-[50vh] items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}
