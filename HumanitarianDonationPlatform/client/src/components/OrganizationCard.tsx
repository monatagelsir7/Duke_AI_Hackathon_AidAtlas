import { ExternalLink, CheckCircle, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TrustBadge from "./TrustBadge";

interface OrganizationCardProps {
  id: string;
  name: string;
  description: string;
  rating: number;
  verified: boolean;
  website?: string;
  onDonate: () => void;
}

export default function OrganizationCard({
  id,
  name,
  description,
  rating,
  verified,
  website,
  onDonate,
}: OrganizationCardProps) {
  return (
    <Card className="p-5 hover:shadow-xl transition-all duration-300 group hover:scale-[1.02] border-2 hover:border-primary/20" data-testid={`card-org-${name.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-base group-hover:text-primary transition-colors">{name}</h4>
            {verified && (
              <Badge variant="default" className="text-xs px-2 py-0.5 bg-chart-3 hover:bg-chart-3" data-testid="badge-verified">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 mb-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 transition-all ${
                  i < rating ? "fill-chart-2 text-chart-2" : "text-muted"
                }`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1 font-medium">{rating.toFixed(1)}</span>
          </div>
          <TrustBadge organizationId={id} variant="compact" />
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
        {description}
      </p>

      <div className="flex items-center gap-2">
        <Button
          onClick={onDonate}
          className="flex-1 bg-gradient-to-r from-primary to-chart-1 shadow-md"
          data-testid={`button-donate-${name.toLowerCase().replace(/\s+/g, '-')}`}
        >
          Donate
        </Button>
        {website && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.open(website, '_blank')}
            data-testid="button-website"
            className="hover:bg-primary/10 hover:border-primary/30"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
