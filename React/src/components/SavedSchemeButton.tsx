import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useSavedSchemes } from "@/lib/savedSchemes";

type SavedSchemeButtonProps = {
  schemeId: number;
  className?: string;
};

export default function SavedSchemeButton({ schemeId, className }: SavedSchemeButtonProps) {
  const { t } = useI18n();
  const { ids, error, toggleSavedScheme } = useSavedSchemes();
  const isSaved = ids.includes(schemeId);
  const label = isSaved ? "Remove from saved schemes" : "Save scheme";
  const Icon = isSaved ? BookmarkCheck : Bookmark;

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={isSaved ? "secondary" : "outline"}
        className={className}
        aria-label={t(label)}
        aria-pressed={isSaved}
        onClick={() => toggleSavedScheme(schemeId)}
      >
        <Icon className="mr-2 h-4 w-4" />
        {t(label)}
      </Button>
      {error && <p role="alert" className="text-sm text-red-700">{t(error)}</p>}
    </div>
  );
}
