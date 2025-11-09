import { X, MapPin, AlertCircle, Calendar, Users, Heart, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

interface ConflictDetailsModalProps {
  conflict: {
    id: string;
    country: string;
    region: string;
    title: string;
    summary: string;
    severityLevel: string;
    affectedGroups: string[];
    lastUpdated: Date | null;
    source: string | null;
    // New statistics fields
    peopleAffected: string | null;
    internallyDisplaced: string | null;
    refugeesAbroad: string | null;
    crisisStartYear: string | null;
    primaryNeeds: string[] | null;
    detailsLastUpdated: Date | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSupport: () => void;
}

export default function ConflictDetailsModal({
  conflict,
  isOpen,
  onClose,
  onSupport,
}: ConflictDetailsModalProps) {
  if (!conflict) return null;

  // Map source identifiers to human-readable names
  const getSourceName = (source: string | null): string => {
    if (!source) return "Data unavailable";
    const sourceMap: Record<string, string> = {
      reliefweb: "UN OCHA ReliefWeb",
      acled: "ACLED (Armed Conflict Location & Event Data Project)",
      unhcr: "UNHCR (UN Refugee Agency)",
      icrc: "ICRC (International Committee of the Red Cross)",
      manual: "Verified Manual Entry",
    };
    return sourceMap[source.toLowerCase()] || source.charAt(0).toUpperCase() + source.slice(1);
  };

  // Severity styling (match ConflictCard styles)
  const getSeverityStyles = (level: string) => {
    const normalized = level.toLowerCase();
    if (normalized.includes('critical')) {
      return {
        badge: "bg-red-700 text-white border-red-600",
        text: "text-red-700 dark:text-red-400",
      };
    }
    if (normalized.includes('high')) {
      return {
        badge: "bg-orange-600 text-white border-orange-500",
        text: "text-orange-600 dark:text-orange-400",
      };
    }
    return {
      badge: "bg-amber-600 text-white border-amber-500",
      text: "text-amber-600 dark:text-amber-400",
    };
  };

  const styles = getSeverityStyles(conflict.severityLevel);

  // Format date safely
  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return "Data unavailable";
    try {
      return format(new Date(date), "MMMM d, yyyy");
    } catch {
      return "Data unavailable";
    }
  };

  // Limit summary to first 2-3 sentences for overview
  const getOverview = (summary: string): string => {
    const sentences = summary.match(/[^.!?]+[.!?]+/g) || [summary];
    return sentences.slice(0, 3).join(" ").trim();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-3xl max-h-[95vh] overflow-y-auto p-0 gap-0"
        data-testid="modal-conflict-details"
        aria-describedby="conflict-overview"
      >
        {/* Header */}
        <DialogHeader className="p-6 pb-4 space-y-3 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <DialogTitle className="text-3xl font-bold font-display leading-tight" data-testid="text-conflict-title">
                {conflict.country}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs" data-testid="badge-region">
                  <MapPin className="h-3 w-3 mr-1" />
                  {conflict.region}
                </Badge>
                <Badge className={`${styles.badge} border shadow-sm`} data-testid="badge-severity-level">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {conflict.severityLevel} Priority
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0"
              data-testid="button-close-modal"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Crisis Overview */}
          <section>
            <h3 className="text-lg font-semibold mb-3 font-display" data-testid="heading-overview">
              Crisis Overview
            </h3>
            <p id="conflict-overview" className="text-base leading-relaxed text-foreground" data-testid="text-overview">
              {getOverview(conflict.summary)}
            </p>
          </section>

          {/* Key Statistics */}
          <section>
            <h3 className="text-lg font-semibold mb-4 font-display" data-testid="heading-statistics">
              Key Statistics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* People Affected */}
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${styles.text} bg-muted`}>
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-2">People Affected</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total in need:</span>
                        <span className={conflict.peopleAffected ? "font-medium" : "text-muted-foreground italic"} data-testid="stat-total-affected">
                          {conflict.peopleAffected || "Data unavailable"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Internally displaced:</span>
                        <span className={conflict.internallyDisplaced ? "font-medium" : "text-muted-foreground italic"} data-testid="stat-displaced">
                          {conflict.internallyDisplaced || "Data unavailable"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Refugees abroad:</span>
                        <span className={conflict.refugeesAbroad ? "font-medium" : "text-muted-foreground italic"} data-testid="stat-refugees">
                          {conflict.refugeesAbroad || "Data unavailable"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Timeline */}
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${styles.text} bg-muted`}>
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-2">Timeline</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Crisis began:</span>
                        <span className={conflict.crisisStartYear ? "font-medium" : "text-muted-foreground italic"} data-testid="stat-crisis-start">
                          {conflict.crisisStartYear || "Data unavailable"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Current status:</span>
                        <Badge variant="secondary" className="text-xs" data-testid="stat-status">
                          Ongoing emergency
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Primary Needs */}
              <Card className="p-4 md:col-span-2">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${styles.text} bg-muted`}>
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-3">Primary Humanitarian Needs</h4>
                    {conflict.primaryNeeds && conflict.primaryNeeds.length > 0 ? (
                      <div className="flex flex-wrap gap-2" data-testid="stat-primary-needs">
                        {conflict.primaryNeeds.map((need) => (
                          <Badge 
                            key={need} 
                            variant="secondary" 
                            className="text-xs"
                            data-testid={`badge-primary-need-${need.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            {need}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic" data-testid="stat-primary-needs">
                        Data unavailable
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              {/* Most Vulnerable Groups */}
              <Card className="p-4 md:col-span-2">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${styles.text} bg-muted`}>
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-3">Most Vulnerable Groups</h4>
                    <div className="flex flex-wrap gap-2">
                      {conflict.affectedGroups.length > 0 ? (
                        conflict.affectedGroups.map((group) => (
                          <Badge 
                            key={group} 
                            variant="secondary" 
                            className="text-xs"
                            data-testid={`badge-affected-group-${group.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            {group}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Data unavailable</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Source Attribution */}
          <section className="pt-4 border-t">
            <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  <span>Source: <span className="font-medium" data-testid="text-source">{getSourceName(conflict.source)}</span></span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Last updated: <span className="font-medium" data-testid="text-last-updated">{formatDate(conflict.lastUpdated)}</span></span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 p-6 pt-4 border-t bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={onClose}
              className="flex-1"
              data-testid="button-back"
            >
              ← Back
            </Button>
            <Button
              variant="default"
              size="default"
              onClick={onSupport}
              className="flex-1 bg-gradient-to-r from-primary to-chart-1 shadow-lg shadow-primary/30"
              data-testid="button-support-modal"
            >
              <Heart className="h-4 w-4 mr-2" />
              Support
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
