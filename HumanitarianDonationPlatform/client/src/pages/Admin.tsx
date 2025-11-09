import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ConflictApproval } from "@shared/schema";
import { PlayCircle, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function Admin() {
  const { toast } = useToast();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const { data: approvals = [], isLoading } = useQuery<ConflictApproval[]>({
    queryKey: ['/api/admin/approvals/pending'],
  });

  const runPipelineMutation = useMutation({
    mutationFn: async ({ daysBack = 7 }: { daysBack?: number }) => {
      const res = await apiRequest('POST', '/api/pipeline/run', { daysBack });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approvals/pending'] });
      toast({
        title: "Pipeline Complete!",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "Pipeline Failed",
        description: "Failed to run content pipeline",
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await apiRequest('POST', `/api/admin/approvals/${id}/approve`, { notes });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approvals/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
      toast({
        title: "Conflict Approved!",
        description: "The conflict profile has been published.",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await apiRequest('POST', `/api/admin/approvals/${id}/reject`, { notes });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/approvals/pending'] });
      toast({
        title: "Conflict Rejected",
        description: "The conflict profile has been rejected.",
      });
    },
  });

  const handleApprove = (approvalId: string) => {
    approveMutation.mutate({ 
      id: approvalId, 
      notes: reviewNotes[approvalId] 
    });
  };

  const handleReject = (approvalId: string) => {
    rejectMutation.mutate({ 
      id: approvalId, 
      notes: reviewNotes[approvalId] 
    });
  };

  const handleRunPipeline = () => {
    runPipelineMutation.mutate({ daysBack: 7 });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-display font-bold mb-2">Content Pipeline</h1>
                <p className="text-muted-foreground">
                  Review and approve AI-generated conflict profiles from trusted humanitarian sources
                </p>
              </div>
              
              <Button 
                onClick={handleRunPipeline} 
                disabled={runPipelineMutation.isPending}
                size="lg"
                data-testid="button-run-pipeline"
              >
                {runPipelineMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-5 w-5" />
                    Run Pipeline
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Pending Review</CardDescription>
                  <CardTitle className="text-3xl">{approvals.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Source</CardDescription>
                  <CardTitle className="text-lg">UN OCHA ReliefWeb</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Last Run</CardDescription>
                  <CardTitle className="text-lg">Manual Trigger</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : approvals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No pending approvals</p>
                <p className="text-muted-foreground mb-4">
                  Run the pipeline to scrape and process new humanitarian crisis data
                </p>
                <Button onClick={handleRunPipeline} variant="outline">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Run Pipeline Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Pending Approvals</h2>
              
              {approvals.map((approval) => {
                const content = approval.generatedContent as any;
                return (
                  <Card key={approval.id} data-testid={`approval-card-${approval.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{content?.title || 'Untitled Conflict'}</CardTitle>
                          <CardDescription className="mt-2">
                            {content?.country} • {content?.region}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">{content?.severityLevel || 'moderate'}</Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Summary</h4>
                        <p className="text-sm text-muted-foreground">
                          {content?.summary || 'No summary available'}
                        </p>
                      </div>

                      {content?.affectedGroups && content.affectedGroups.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Affected Groups</h4>
                          <div className="flex flex-wrap gap-2">
                            {content.affectedGroups.map((group: string, idx: number) => (
                              <Badge key={idx} variant="secondary">{group}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="font-medium mb-2">Source</h4>
                        <Badge>{content?.source || 'reliefweb'}</Badge>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Review Notes (Optional)</h4>
                        <Textarea
                          placeholder="Add notes about this conflict profile..."
                          value={reviewNotes[approval.id] || ''}
                          onChange={(e) => setReviewNotes(prev => ({
                            ...prev,
                            [approval.id]: e.target.value
                          }))}
                          data-testid={`textarea-notes-${approval.id}`}
                        />
                      </div>
                    </CardContent>

                    <CardFooter className="flex gap-3">
                      <Button
                        variant="default"
                        onClick={() => handleApprove(approval.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        data-testid={`button-approve-${approval.id}`}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve & Publish
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleReject(approval.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        data-testid={`button-reject-${approval.id}`}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
