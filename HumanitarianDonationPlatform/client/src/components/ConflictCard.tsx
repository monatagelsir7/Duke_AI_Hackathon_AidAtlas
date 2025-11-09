import { Heart, MapPin, Users, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ConflictCardProps {
  country: string;
  region: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  affectedGroups: string[];
  severityLevel: string;
  onSupport: () => void;
  onDetails: () => void;
  onPass: () => void;
}

export default function ConflictCard({
  country,
  region,
  title,
  summary,
  imageUrl,
  affectedGroups,
  severityLevel,
  onSupport,
  onDetails,
  onPass,
}: ConflictCardProps) {
  // Severity-based visual identity (respectful, muted colors)
  const severityStyles = {
    critical: {
      background: "bg-gradient-to-br from-red-900 to-red-950",
      badge: "bg-red-700 text-white border-red-600",
    },
    high: {
      background: "bg-gradient-to-br from-orange-800 to-orange-950",
      badge: "bg-orange-600 text-white border-orange-500",
    },
    moderate: {
      background: "bg-gradient-to-br from-amber-700 to-amber-900",
      badge: "bg-amber-600 text-white border-amber-500",
    },
  };

  const severity = severityLevel.toLowerCase() as keyof typeof severityStyles;
  const styles = severityStyles[severity] || severityStyles.moderate;

  return (
    <div className="w-full max-w-md mx-auto perspective-1000">
      <Card className="overflow-hidden shadow-2xl hover:shadow-primary/20 transition-all duration-500 hover:scale-[1.02] border-2" data-testid="card-conflict">
        <div className={`relative h-96 group ${styles.background}`}>
          {/* Subtle overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Large country name overlay for visual identity */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <h2 className="text-8xl font-bold text-white font-display uppercase tracking-tight">
              {country.split('/')[0].split(' ')[0]}
            </h2>
          </div>
          
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
            <Badge className={`${styles.badge} shadow-lg border`} data-testid="badge-severity">
              <AlertCircle className="h-3 w-3 mr-1" />
              {severityLevel} Priority
            </Badge>
            <div className="flex items-center gap-1 text-white text-xs bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/30">
              <MapPin className="h-3 w-3" />
              {country}
            </div>
          </div>

          <div className="absolute bottom-6 left-6 right-6 text-white">
            <p className="text-xs uppercase tracking-widest opacity-90 mb-2 font-medium">{region}</p>
            <h3 className="text-3xl font-bold mb-2 font-display leading-tight drop-shadow-2xl">{title}</h3>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-b from-card to-background">
          <p className="text-base text-foreground leading-relaxed mb-5 line-clamp-3">
            {summary}
          </p>
          
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <Users className="h-4 w-4" />
              <span>Most Affected:</span>
            </div>
            {affectedGroups.slice(0, 3).map((group) => (
              <Badge key={group} variant="secondary" className="text-xs shadow-sm" data-testid={`badge-group-${group}`}>
                {group}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={onPass}
              className="flex-1 group/btn"
              data-testid="button-pass"
            >
              <span className="group-hover/btn:scale-110 transition-transform inline-block">Next</span>
            </Button>
            <Button
              variant="secondary"
              size="default"
              onClick={onDetails}
              className="flex-1"
              data-testid="button-details"
            >
              Details
            </Button>
            <Button
              variant="default"
              size="default"
              onClick={onSupport}
              className="flex-1 bg-gradient-to-r from-primary to-chart-1 shadow-lg shadow-primary/30"
              data-testid="button-support"
            >
              <Heart className="h-4 w-4 mr-2" />
              Support
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
