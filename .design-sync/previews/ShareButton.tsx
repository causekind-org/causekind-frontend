import { ShareButton } from "causekind-next";

export function Default() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Share this campaign</span>
      <ShareButton title="Clean Water for Rural Schools" path="/campaigns/clean-water-rural-schools" />
    </div>
  );
}
