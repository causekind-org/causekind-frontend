import Link from "next/link";
import type { Campaign } from "@/lib/api";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Target } from "lucide-react";

type Props = { campaign: Campaign };

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function CampaignCard({ campaign }: Props) {
  const pct = Math.min(
    100,
    Math.round((campaign.amountRaised / campaign.targetAmount) * 100)
  );

  return (
    <Card className="flex flex-col h-full py-0 overflow-hidden">
      <CardHeader className="pt-5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base line-clamp-2">{campaign.title}</CardTitle>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {campaign.category}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
          <MapPin className="size-3.5 shrink-0" />
          {campaign.city}, {campaign.state}
        </p>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {campaign.description}
        </p>
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{formatINR(campaign.amountRaised)}</span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Target className="size-3.5" /> {formatINR(campaign.targetAmount)}
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{pct}% funded</p>
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-5">
        <Button className="w-full" size="sm" asChild>
          <Link href={`/campaigns/${campaign.id}`}>View &amp; Donate</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
