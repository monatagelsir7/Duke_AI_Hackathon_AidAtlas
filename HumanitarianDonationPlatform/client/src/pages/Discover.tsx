import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import ConflictCard from "@/components/ConflictCard";
import DonationModal from "@/components/DonationModal";
import ConflictDetailsModal from "@/components/ConflictDetailsModal";
import PreferenceQuiz from "@/components/PreferenceQuiz";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Conflict, Organization } from "@shared/schema";

interface PreferenceData {
  causes: string[];
  regions: string[];
  donationRange: string;
}

export default function Discover() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showQuiz, setShowQuiz] = useState(() => {
    // If user is authenticated, use onboardingCompleted status
    if (user) {
      return !user.onboardingCompleted;
    }
    // For anonymous users, check localStorage to persist quiz dismissal
    const anonymousQuizCompleted = localStorage.getItem('anonymousQuizCompleted');
    return anonymousQuizCompleted !== 'true';
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const { toast } = useToast();
  const cardViewStartTime = useRef<number>(Date.now());

  // Use personalized endpoint if user is logged in
  const { data: conflicts = [], isLoading, isError, error } = useQuery<Conflict[]>({
    queryKey: user ? ['/api/conflicts/personalized'] : ['/api/conflicts'],
    enabled: !showQuiz,
    retry: 3, // Retry failed requests 3 times
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Track event mutation
  const trackEventMutation = useMutation({
    mutationFn: async (eventData: {
      conflictId?: string;
      organizationId?: string;
      eventType: string;
      eventData?: any;
    }) => {
      const res = await apiRequest('POST', '/api/events/track', eventData);
      return await res.json();
    },
  });

  const filteredConflicts = conflicts.filter((conflict: Conflict) => {
    if (!user?.preferences) return true;
    
    const matchesRegion = user.preferences.regions.length === 0 || 
      user.preferences.regions.includes(conflict.region);
    
    return matchesRegion;
  });

  const displayConflicts = filteredConflicts.length > 0 ? filteredConflicts : conflicts;
  const currentConflict = displayConflicts[currentIndex];

  useEffect(() => {
    if (user && !user.onboardingCompleted) {
      setShowQuiz(true);
    }
  }, [user]);

  useEffect(() => {
    if (currentIndex >= displayConflicts.length && displayConflicts.length > 0) {
      setCurrentIndex(0);
    }
  }, [displayConflicts.length, currentIndex]);

  // Reset timer when card changes
  useEffect(() => {
    cardViewStartTime.current = Date.now();
  }, [currentIndex]);

  // Show warning toast if refresh fails but we have cached data
  useEffect(() => {
    if (isError && conflicts.length > 0) {
      toast({
        title: "Using cached data",
        description: "Couldn't refresh conflicts. Showing previously loaded data.",
        variant: "default",
      });
    }
  }, [isError, conflicts.length, toast]);

  const calculateTimeSpent = () => {
    return Math.floor((Date.now() - cardViewStartTime.current) / 1000);
  };

  const { data: organizations = [], isLoading: orgsLoading, isError: orgsError } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
    enabled: !!currentConflict,
    retry: 3, // Retry failed requests 3 times
    retryDelay: 1000, // Wait 1 second between retries
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: PreferenceData) => {
      const res = await apiRequest('PATCH', '/api/user/preferences', { preferences });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      if (user) {
        user.preferences = data.preferences;
        user.onboardingCompleted = true;
      }
      setShowQuiz(false);
      toast({
        title: "Preferences saved!",
        description: "We'll show you causes that match your interests.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createDonationMutation = useMutation({
    mutationFn: async ({ organizationId, amount }: { organizationId: string; amount: number }) => {
      const res = await apiRequest('POST', '/api/donations', {
        organizationId,
        conflictId: currentConflict ? currentConflict.id : '',
        amount: amount.toString(),
        type: 'one-time',
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/donations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/impact'] });
    },
  });

  const trackSwipe = (direction: 'up' | 'pass' | 'down') => {
    if (!currentConflict) return;
    
    const timeSpent = calculateTimeSpent();
    trackEventMutation.mutate({
      conflictId: currentConflict.id,
      eventType: `swipe_${direction}`,
      eventData: {
        swipeDirection: direction,
        timeSpent,
      },
    });
  };

  const handleQuizComplete = (preferences: any) => {
    // If user is not authenticated, just close the quiz and let them browse anonymously
    if (!user) {
      setShowQuiz(false);
      localStorage.setItem('anonymousQuizCompleted', 'true'); // Persist quiz dismissal
      toast({
        title: "Browsing anonymously",
        description: "Sign up to save your preferences and track your impact!",
      });
      return;
    }
    
    const preferenceData: PreferenceData = {
      causes: preferences.causes || [],
      regions: preferences.regions || [],
      donationRange: preferences.donationRange || '',
    };
    savePreferencesMutation.mutate(preferenceData);
  };

  // Show quiz first if needed (before checking conflicts)
  if (showQuiz) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-12">
          <PreferenceQuiz onComplete={handleQuizComplete} />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-12 px-6 flex items-center justify-center">
          <p className="text-muted-foreground">Loading conflicts...</p>
        </div>
      </div>
    );
  }

  // Error boundary: Only block if we have NO data at all (first load failure)
  // If we have cached data, continue showing it with a toast warning (handled in useEffect above)
  if (isError && conflicts.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-12 px-6 text-center max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-4">Unable to Load Conflicts</h2>
          <p className="text-muted-foreground mb-6">
            We're having trouble loading humanitarian causes right now. This could be a temporary network issue.
          </p>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: user ? ['/api/conflicts/personalized'] : ['/api/conflicts'] })}
            data-testid="button-retry-load"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!currentConflict || displayConflicts.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-12 px-6 text-center max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-4">No Conflicts Available</h2>
          <p className="text-muted-foreground">
            No conflicts match your current region preferences. Try adjusting your preferences or check back later.
          </p>
        </div>
      </div>
    );
  }

  const handleSupport = () => {
    trackSwipe('up');
    // Navigate to Support page for this country
    navigate(`/support/${encodeURIComponent(currentConflict.country)}`);
  };

  const handleDonationComplete = async (amount: number, orgIds: string[]) => {
    const perOrgAmount = amount / orgIds.length;
    
    try {
      await Promise.all(
        orgIds.map((orgId) =>
          createDonationMutation.mutateAsync({
            organizationId: orgId,
            amount: perOrgAmount,
          })
        )
      );
      
      // Track donation event
      trackEventMutation.mutate({
        conflictId: currentConflict.id,
        eventType: 'donate',
        eventData: {
          donationAmount: amount,
          organizationIds: orgIds,
        },
      });
      
      toast({
        title: "Thank you for your donation!",
        description: `$${amount} donated to ${orgIds.length} organization(s)`,
      });
      handleNext();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process donation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < displayConflicts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast({
        title: "You've seen all conflicts!",
        description: "More causes will be added soon.",
      });
    }
  };

  const handlePass = () => {
    trackSwipe('pass');
    handleNext();
  };

  const handleDetails = () => {
    // Track view details event
    if (currentConflict) {
      trackEventMutation.mutate({
        conflictId: currentConflict.id,
        eventType: 'view_details',
        eventData: {
          timeSpent: calculateTimeSpent(),
        },
      });
    }
    
    setSelectedConflict(currentConflict);
    setDetailsModalOpen(true);
  };

  const handleDetailsSupport = () => {
    // Navigate to Support page for AI-researched nonprofits
    const target = selectedConflict ?? currentConflict;
    if (target) {
      setDetailsModalOpen(false);
      navigate(`/support/${encodeURIComponent(target.country)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-12 px-6 min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block mb-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <p className="text-sm font-medium text-primary">Personalized for you</p>
            </div>
            <h1 className="text-5xl font-display font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Discover Causes
            </h1>
            <p className="text-lg text-muted-foreground mb-2">
              Swipe through humanitarian crises and choose where to make an impact
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              {displayConflicts.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentIndex 
                      ? "w-8 bg-primary" 
                      : idx < currentIndex 
                        ? "w-1.5 bg-chart-2" 
                        : "w-1.5 bg-muted"
                  }`}
                  data-testid={`progress-dot-${idx}`}
                />
              ))}
            </div>
          </div>

          <ConflictCard
            {...currentConflict}
            onSupport={handleSupport}
            onDetails={handleDetails}
            onPass={handlePass}
          />

          <div className="text-center mt-8">
            <Button
              variant="outline"
              onClick={() => setShowQuiz(true)}
              data-testid="button-update-preferences"
              className="backdrop-blur-sm"
            >
              Update Preferences
            </Button>
          </div>
        </div>
      </div>

      {selectedConflict && (
        <>
          <DonationModal
            open={donationModalOpen}
            onClose={() => setDonationModalOpen(false)}
            conflictTitle={selectedConflict.title}
            organizations={organizations.filter(org => 
              org.countriesActive.includes(selectedConflict.country)
            )}
            onComplete={handleDonationComplete}
          />

          <ConflictDetailsModal
            conflict={selectedConflict}
            isOpen={detailsModalOpen}
            onClose={() => setDetailsModalOpen(false)}
            onSupport={handleDetailsSupport}
          />
        </>
      )}
    </div>
  );
}
