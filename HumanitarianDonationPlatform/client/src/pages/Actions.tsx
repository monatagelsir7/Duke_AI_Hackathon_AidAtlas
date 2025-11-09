import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, MapPinIcon, Users, FileText, Calendar, Clock, CheckCircle2, Heart } from "lucide-react";
import { format } from "date-fns";
import type { Action } from "@shared/schema";
import Navigation from "@/components/Navigation";

export default function Actions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [activeTab, setActiveTab] = useState<string>("recommended");
  const [personalMessage, setPersonalMessage] = useState("");

  const { data: actions = [], isLoading, isError: actionsError } = useQuery<Action[]>({
    queryKey: ["/api/actions"],
    enabled: !!user,
  });

  const { data: participatedActions = [], isError: participatedError } = useQuery<Action[]>({
    queryKey: ["/api/actions/user/participated"],
    enabled: !!user,
  });

  // Fetch recommended actions with match scores
  interface RecommendedAction extends Action {
    matchScore?: number;
    matchReasons?: string[];
  }

  const { data: recommendedActions = [], isError: recommendedError } = useQuery<RecommendedAction[]>({
    queryKey: ["/api/actions/recommended"],
    enabled: !!user,
  });

  // Show error toast if queries fail
  useEffect(() => {
    if (actionsError || participatedError || recommendedError) {
      toast({
        title: "Error loading actions",
        description: "Failed to load actions. Please try again later.",
        variant: "destructive",
      });
    }
  }, [actionsError, participatedError, recommendedError, toast]);

  const participateMutation = useMutation({
    mutationFn: async ({ actionId, participationType }: { actionId: string; participationType: string }) => {
      const res = await apiRequest('POST', `/api/actions/${actionId}/participate`, {
        participationType,
        personalMessage: personalMessage || null,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Participation recorded!",
        description: "You've successfully joined this action.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions/user/participated"] });
      setSelectedAction(null);
      setPersonalMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to participate in action",
        variant: "destructive",
      });
    },
  });

  const filteredActions = activeTab === "all" 
    ? actions.filter(a => a.status === "active")
    : activeTab === "recommended"
    ? recommendedActions
    : activeTab === "participated"
    ? participatedActions
    : actions.filter(a => a.type === activeTab && a.status === "active");

  const getActionIcon = (type: string) => {
    switch (type) {
      case "protest":
        return <Users className="w-4 h-4" />;
      case "petition":
        return <FileText className="w-4 h-4" />;
      case "advocacy":
        return <Heart className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getActionTypeColor = (type: string) => {
    switch (type) {
      case "protest":
        return "bg-red-500";
      case "petition":
        return "bg-blue-500";
      case "advocacy":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const isParticipating = (actionId: string) => {
    return participatedActions.some(a => a.id === actionId);
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-muted-foreground">Loading actions...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Take Action</h1>
          <p className="text-muted-foreground text-lg">
            Join protests, sign petitions, and participate in advocacy campaigns for humanitarian causes
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="recommended" data-testid="tab-recommended">For You</TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all">All Actions</TabsTrigger>
            <TabsTrigger value="protest" data-testid="tab-protest">Protests</TabsTrigger>
            <TabsTrigger value="petition" data-testid="tab-petition">Petitions</TabsTrigger>
            <TabsTrigger value="advocacy" data-testid="tab-advocacy">Advocacy</TabsTrigger>
            <TabsTrigger value="participated" data-testid="tab-participated">My Actions</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredActions.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground text-lg">No actions found for this category.</p>
            </div>
          ) : (
            filteredActions.map((action) => (
              <Card 
                key={action.id} 
                className="hover-elevate cursor-pointer transition-all"
                onClick={() => setSelectedAction(action)}
                data-testid={`action-card-${action.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="secondary" className="capitalize">
                      <span className="flex items-center gap-1">
                        {getActionIcon(action.type)}
                        {action.type}
                      </span>
                    </Badge>
                    {isParticipating(action.id) && (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Joined
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="line-clamp-2">{action.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {action.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Show match score and reasons for recommended actions */}
                  {activeTab === "recommended" && 'matchScore' in action && (action as RecommendedAction).matchScore !== undefined && (
                    <div className="mb-4 p-3 bg-primary/10 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4 text-primary fill-primary" />
                          <span className="font-semibold text-sm text-primary">
                            {(action as RecommendedAction).matchScore}% Match
                          </span>
                        </div>
                      </div>
                      {(action as RecommendedAction).matchReasons && (action as RecommendedAction).matchReasons!.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(action as RecommendedAction).matchReasons!.map((reason: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    {action.organizerName && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{action.organizerName}</span>
                      </div>
                    )}
                    
                    {action.startTime && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{format(new Date(action.startTime), "MMM d, yyyy h:mm a")}</span>
                      </div>
                    )}
                    
                    {action.address && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPinIcon className="w-4 h-4" />
                        <span className="line-clamp-1">{action.address}</span>
                      </div>
                    )}

                    {action.type === "petition" && action.signatureCount !== null && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="w-4 h-4" />
                        <span>{action.signatureCount.toLocaleString()} signatures</span>
                      </div>
                    )}

                    {action.type === "protest" && action.currentAttendance !== null && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{action.currentAttendance} attending</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedAction && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="capitalize">
                    <span className="flex items-center gap-1">
                      {getActionIcon(selectedAction.type)}
                      {selectedAction.type}
                    </span>
                  </Badge>
                  {isParticipating(selectedAction.id) && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      You're participating
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-2xl">{selectedAction.title}</DialogTitle>
                <DialogDescription className="text-base">
                  {selectedAction.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedAction.organizerName && (
                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Organizer</p>
                        <p className="text-sm text-muted-foreground">{selectedAction.organizerName}</p>
                      </div>
                    </div>
                  )}

                  {selectedAction.startTime && (
                    <div className="flex items-start gap-3">
                      <CalendarIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Start Time</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(selectedAction.startTime), "MMMM d, yyyy")}
                          <br />
                          {format(new Date(selectedAction.startTime), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedAction.endTime && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">End Time</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(selectedAction.endTime), "MMMM d, yyyy")}
                          <br />
                          {format(new Date(selectedAction.endTime), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedAction.address && (
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Location</p>
                        <p className="text-sm text-muted-foreground">{selectedAction.address}</p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedAction.tags && selectedAction.tags.length > 0 && (
                  <div>
                    <p className="font-medium text-sm mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAction.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAction.type === "petition" && selectedAction.signatureCount !== null && (
                  <div>
                    <p className="font-medium text-sm mb-1">Petition Progress</p>
                    <p className="text-2xl font-bold text-primary">
                      {selectedAction.signatureCount.toLocaleString()} signatures
                    </p>
                  </div>
                )}

                {selectedAction.type === "protest" && selectedAction.currentAttendance !== null && (
                  <div>
                    <p className="font-medium text-sm mb-1">Attendance</p>
                    <p className="text-2xl font-bold text-primary">
                      {selectedAction.currentAttendance} people attending
                    </p>
                  </div>
                )}

                {!isParticipating(selectedAction.id) && (
                  <div>
                    <p className="font-medium text-sm mb-2">Add a personal message (optional)</p>
                    <Textarea
                      placeholder="Share why this action matters to you..."
                      value={personalMessage}
                      onChange={(e) => setPersonalMessage(e.target.value)}
                      className="min-h-[100px]"
                      data-testid="input-personal-message"
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedAction(null)}
                  data-testid="button-cancel"
                >
                  Close
                </Button>
                {!isParticipating(selectedAction.id) && (
                  <Button
                    onClick={() => 
                      participateMutation.mutate({
                        actionId: selectedAction.id,
                        participationType: "committed",
                      })
                    }
                    disabled={participateMutation.isPending}
                    data-testid="button-participate"
                  >
                    {participateMutation.isPending ? "Joining..." : "Join This Action"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
