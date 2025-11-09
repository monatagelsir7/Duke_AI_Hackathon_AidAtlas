import { Shield, Star, AlertTriangle, Info, Trophy, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";

interface TrustScore {
  score: number;
  verificationLevel: number;
  breakdown: {
    financialTransparency: number;
    impactReporting: number;
    thirdPartyVerification: number;
    operationalTransparency: number;
    accountability: number;
    communityReputation: number;
  };
}

interface TrustBadgeProps {
  organizationId: string;
  variant?: "full" | "compact" | "mini";
}

function getTrustLevel(score: number): { 
  level: string; 
  badgeClasses: string; 
  glowClasses: string;
  icon: typeof Shield;
  gradient: string;
} {
  if (score >= 80) {
    return {
      level: "Excellent",
      badgeClasses: "bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/20",
      glowClasses: "ring-2 ring-emerald-400/30",
      icon: Trophy,
      gradient: "from-emerald-400 to-emerald-600",
    };
  } else if (score >= 60) {
    return {
      level: "Good",
      badgeClasses: "bg-gradient-to-br from-blue-400/20 to-blue-600/20 text-blue-700 dark:text-blue-300 border-2 border-blue-500/40 shadow-lg shadow-blue-500/20",
      glowClasses: "ring-2 ring-blue-400/30",
      icon: Award,
      gradient: "from-blue-400 to-blue-600",
    };
  } else if (score >= 40) {
    return {
      level: "Fair",
      badgeClasses: "bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 text-yellow-700 dark:text-yellow-300 border-2 border-yellow-500/40 shadow-md shadow-yellow-500/10",
      glowClasses: "ring-1 ring-yellow-400/20",
      icon: Shield,
      gradient: "from-yellow-400 to-yellow-600",
    };
  } else {
    return {
      level: "Limited",
      badgeClasses: "bg-gradient-to-br from-orange-400/20 to-orange-600/20 text-orange-700 dark:text-orange-300 border-2 border-orange-500/40 shadow-md shadow-orange-500/10",
      glowClasses: "ring-1 ring-orange-400/20",
      icon: AlertTriangle,
      gradient: "from-orange-400 to-orange-600",
    };
  }
}

function getVerificationStars(level: number) {
  return Array.from({ length: 3 }, (_, i) => i < level);
}

export default function TrustBadge({ organizationId, variant = "full" }: TrustBadgeProps) {
  const { data: trustScore, isLoading } = useQuery<TrustScore>({
    queryKey: ["/api/organizations", organizationId, "trust-score"],
  });

  if (isLoading || !trustScore) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
      </div>
    );
  }

  const { level, badgeClasses, glowClasses, icon: Icon, gradient } = getTrustLevel(trustScore.score);
  const stars = getVerificationStars(trustScore.verificationLevel);

  if (variant === "mini") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              className={`text-xs px-2 py-1 font-bold ${badgeClasses} ${glowClasses}`}
              data-testid={`badge-trust-mini-${organizationId}`}
            >
              <Icon className="h-3 w-3 mr-1" />
              {trustScore.score}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs p-4 bg-card border-2">
            <div className="space-y-2">
              <div className="font-bold text-sm">Trust Score: {trustScore.score}/100</div>
              <div className="text-xs text-muted-foreground">
                This organization has a <strong className="text-foreground">{level}</strong> trust rating based on verified data.
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 flex-wrap" data-testid={`trust-badge-compact-${organizationId}`}>
        <Badge 
          className={`text-xs px-2.5 py-1 font-bold ${badgeClasses}`}
        >
          <Icon className="h-3.5 w-3.5 mr-1.5" />
          <span className="font-extrabold">{trustScore.score}</span>
          <span className="opacity-70 ml-0.5">/100</span>
        </Badge>
        <div className="flex items-center gap-0.5">
          {stars.map((filled, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 transition-transform hover:scale-110 ${
                filled ? "fill-amber-400 text-amber-400 drop-shadow-sm" : "text-muted-foreground/40"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid={`trust-badge-full-${organizationId}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge 
            className={`px-3 py-1.5 font-extrabold text-sm ${badgeClasses}`}
          >
            <Icon className="h-4 w-4 mr-2" />
            Trust: <span className="text-base ml-1">{trustScore.score}</span>
            <span className="opacity-60">/100</span>
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-all hover:scale-110">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm p-4 bg-card border-2" data-testid="tooltip-trust-breakdown">
                <div className="space-y-3">
                  <div className="font-bold text-sm border-b-2 pb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    Trust Score Breakdown
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Financial Transparency</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${gradient} rounded-full`}
                            style={{ width: `${(trustScore.breakdown.financialTransparency / 25) * 100}%` }}
                          />
                        </div>
                        <span className="font-bold w-10 text-right">{trustScore.breakdown.financialTransparency}/25</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Impact Reporting</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${gradient} rounded-full`}
                            style={{ width: `${(trustScore.breakdown.impactReporting / 20) * 100}%` }}
                          />
                        </div>
                        <span className="font-bold w-10 text-right">{trustScore.breakdown.impactReporting}/20</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Third-party Verification</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${gradient} rounded-full`}
                            style={{ width: `${(trustScore.breakdown.thirdPartyVerification / 20) * 100}%` }}
                          />
                        </div>
                        <span className="font-bold w-10 text-right">{trustScore.breakdown.thirdPartyVerification}/20</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Operational Transparency</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${gradient} rounded-full`}
                            style={{ width: `${(trustScore.breakdown.operationalTransparency / 15) * 100}%` }}
                          />
                        </div>
                        <span className="font-bold w-10 text-right">{trustScore.breakdown.operationalTransparency}/15</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Accountability</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${gradient} rounded-full`}
                            style={{ width: `${(trustScore.breakdown.accountability / 10) * 100}%` }}
                          />
                        </div>
                        <span className="font-bold w-10 text-right">{trustScore.breakdown.accountability}/10</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Community Reputation</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${gradient} rounded-full`}
                            style={{ width: `${(trustScore.breakdown.communityReputation / 10) * 100}%` }}
                          />
                        </div>
                        <span className="font-bold w-10 text-right">{trustScore.breakdown.communityReputation}/10</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Verified:</span>
          {stars.map((filled, i) => (
            <Star
              key={i}
              className={`h-4 w-4 transition-all ${
                filled ? "fill-amber-400 text-amber-400 drop-shadow-md" : "text-muted-foreground/30"
              }`}
              data-testid={`star-verification-${i}`}
            />
          ))}
        </div>
      </div>
      
      <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-700 ease-out shadow-lg`}
          style={{ width: `${trustScore.score}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      </div>
    </div>
  );
}
