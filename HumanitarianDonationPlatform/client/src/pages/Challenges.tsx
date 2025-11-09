import { useState, useEffect, useRef, useCallback } from "react";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Zap, Heart, Target, Users, DollarSign, Award, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Challenge {
  id: string;
  title: string;
  description: string;
  xp: number;
  icon: React.ComponentType<any>;
  target: number;
  current: number;
  type: 'donation' | 'action' | 'streak';
}

const DAILY_CHALLENGES: Omit<Challenge, 'current'>[] = [
  {
    id: 'daily-donation',
    title: 'Make a Donation',
    description: 'Support a cause today',
    xp: 50,
    icon: Heart,
    target: 1,
    type: 'donation'
  },
  {
    id: 'daily-action',
    title: 'Take Action',
    description: 'Join a protest or sign a petition',
    xp: 30,
    icon: Users,
    target: 1,
    type: 'action'
  },
  {
    id: 'daily-generous',
    title: 'Generous Giver',
    description: 'Donate $10 or more',
    xp: 75,
    icon: DollarSign,
    target: 10,
    type: 'donation'
  },
  {
    id: 'daily-streak',
    title: 'Keep the Streak',
    description: 'Donate for 3 consecutive days',
    xp: 100,
    icon: Target,
    target: 3,
    type: 'streak'
  }
];

export default function Challenges() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<Challenge[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [showPeaceDove, setShowPeaceDove] = useState(false);

  // Refs to hold current state for event listeners
  const challengesRef = useRef<Challenge[]>([]);
  const completedChallengesRef = useRef<Challenge[]>([]);
  const totalXPRef = useRef<number>(0);

  // Update refs when state changes
  useEffect(() => {
    challengesRef.current = challenges;
  }, [challenges]);

  useEffect(() => {
    completedChallengesRef.current = completedChallenges;
  }, [completedChallenges]);

  useEffect(() => {
    totalXPRef.current = totalXP;
  }, [totalXP]);

  // Load challenges and XP from localStorage on mount
  useEffect(() => {
    const savedXP = localStorage.getItem('user-xp');
    if (savedXP) {
      setTotalXP(parseInt(savedXP));
    }

    const savedProgress = localStorage.getItem('challenge-progress');
    const savedCompleted = localStorage.getItem('challenges-completed-today');
    const lastReset = localStorage.getItem('challenges-last-reset');
    const today = new Date().toDateString();

    // Reset daily challenges if it's a new day
    if (lastReset !== today) {
      localStorage.setItem('challenges-last-reset', today);
      localStorage.removeItem('challenge-progress');
      localStorage.removeItem('challenges-completed-today');
    }

    const progressData = savedProgress ? JSON.parse(savedProgress) : {};
    const completedIds = savedCompleted ? JSON.parse(savedCompleted) : [];

    const activeChallenges = DAILY_CHALLENGES
      .filter(c => !completedIds.includes(c.id))
      .map(c => ({
        ...c,
        current: progressData[c.id] || 0
      }));

    const completedList = DAILY_CHALLENGES
      .filter(c => completedIds.includes(c.id))
      .map(c => ({
        ...c,
        current: c.target
      }));

    setChallenges(activeChallenges);
    setCompletedChallenges(completedList);
  }, []);

  // Stable complete challenge function using refs
  const completeChallenge = useCallback((challenge: Challenge) => {
    // Use functional update to get latest XP
    setTotalXP(prevXP => {
      const newXP = prevXP + challenge.xp;
      localStorage.setItem('user-xp', newXP.toString());
      return newXP;
    });

    // Use functional update for completed challenges
    setCompletedChallenges(prev => {
      const updated = [...prev, { ...challenge, current: challenge.target }];
      const completedIds = updated.map(c => c.id);
      localStorage.setItem('challenges-completed-today', JSON.stringify(completedIds));
      
      // Check if all challenges are complete
      if (updated.length >= DAILY_CHALLENGES.length) {
        setTimeout(() => {
          setShowPeaceDove(true);
          const badges = JSON.parse(localStorage.getItem('unlocked-badges') || '[]');
          if (!badges.includes('peace-dove')) {
            badges.push('peace-dove');
            localStorage.setItem('unlocked-badges', JSON.stringify(badges));
          }
        }, 500);
      }
      
      return updated;
    });

    // Show toast
    toast({
      title: "Challenge Completed! 🎉",
      description: `+${challenge.xp} XP earned`,
    });

    // Dispatch event for Profile page
    window.dispatchEvent(new CustomEvent('challenge-completed', {
      detail: {
        title: challenge.title,
        xp: challenge.xp,
      }
    }));
  }, [toast]);

  // Update challenge progress
  const updateChallengeProgress = useCallback((type: string, value: number) => {
    setChallenges(prev => {
      const updated = prev.map(challenge => {
        if (challenge.type === type) {
          const newCurrent = type === 'donation' 
            ? challenge.current + value 
            : challenge.current + 1;
          
          return { ...challenge, current: Math.min(newCurrent, challenge.target) };
        }
        return challenge;
      });

      // Save progress
      const progressData = updated.reduce((acc, c) => {
        acc[c.id] = c.current;
        return acc;
      }, {} as Record<string, number>);
      localStorage.setItem('challenge-progress', JSON.stringify(progressData));

      // Check for completions using refs to avoid stale data
      updated.forEach(challenge => {
        if (challenge.current >= challenge.target) {
          const alreadyCompleted = completedChallengesRef.current.find(c => c.id === challenge.id);
          if (!alreadyCompleted) {
            completeChallenge(challenge);
          }
        }
      });

      return updated.filter(c => c.current < c.target);
    });
  }, [completeChallenge]);

  // Listen for donation and action events - stable listeners
  useEffect(() => {
    const handleDonation = (event: CustomEvent) => {
      const amount = event.detail?.amount || 0;
      updateChallengeProgress('donation', amount);
    };

    const handleAction = () => {
      updateChallengeProgress('action', 1);
    };

    window.addEventListener('donation-made', handleDonation as EventListener);
    window.addEventListener('action-completed', handleAction as EventListener);

    return () => {
      window.removeEventListener('donation-made', handleDonation as EventListener);
      window.removeEventListener('action-completed', handleAction as EventListener);
    };
  }, [updateChallengeProgress]);

  const closePeaceDovePopup = () => {
    setShowPeaceDove(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-12 px-6 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-12 px-6 text-center">
          <p className="text-muted-foreground">Please log in to view challenges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/20 dark:via-purple-950/20 to-background">
      <Navigation />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full mb-4">
              <Trophy className="h-5 w-5" />
              <span className="font-semibold">{totalXP} XP</span>
            </div>
            <h1 className="text-4xl font-display font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Daily Challenges
            </h1>
            <p className="text-muted-foreground">Complete challenges to earn XP and unlock badges</p>
          </div>

          {/* Active Challenges */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Active Challenges
            </h2>
            <div className="grid gap-4">
              {challenges.map((challenge, index) => {
                const Icon = challenge.icon;
                const progress = (challenge.current / challenge.target) * 100;
                
                return (
                  <Card 
                    key={challenge.id} 
                    className="p-6 bg-gradient-to-br from-white to-purple-50/50 dark:from-gray-900 dark:to-purple-950/20 border-2 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 hover:shadow-lg hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50"
                    data-testid={`challenge-${index}`}
                    style={{
                      animation: `fadeIn 0.${3 + index}s ease-out`
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{challenge.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{challenge.description}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{challenge.current} / {challenge.target}</span>
                          </div>
                        </div>
                      </div>
                      <Badge 
                        className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0 shadow-md"
                        data-testid={`badge-xp-${index}`}
                      >
                        +{challenge.xp} XP
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <Progress 
                        value={progress} 
                        className="h-3 bg-purple-100 dark:bg-purple-950"
                        style={{
                          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      />
                      <Button 
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                        data-testid={`button-start-${index}`}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Start Challenge
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Completed Today */}
          {completedChallenges.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-green-500" />
                Completed Today 🎉
              </h2>
              <div className="grid gap-4">
                {completedChallenges.map((challenge, index) => {
                  const Icon = challenge.icon;
                  
                  return (
                    <Card 
                      key={challenge.id} 
                      className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-300 dark:border-green-700"
                      data-testid={`completed-${index}`}
                      style={{
                        animation: 'slideIn 0.5s ease-out'
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{challenge.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{challenge.description}</p>
                            <Badge className="bg-green-500 text-white border-0">
                              ✓ Completed
                            </Badge>
                          </div>
                        </div>
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0 shadow-md">
                          +{challenge.xp} XP
                        </Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Peace Dove Unlocked Popup */}
      {showPeaceDove && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300"
          onClick={closePeaceDovePopup}
        >
          <Card 
            className="max-w-md p-8 bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950 text-center relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'popIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 animate-pulse" />
            <div className="relative">
              <div className="mb-6 inline-block p-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-2xl animate-bounce">
                <Award className="h-16 w-16 text-white" />
              </div>
              <h2 className="text-3xl font-display font-bold mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Peace Dove Unlocked!
              </h2>
              <p className="text-muted-foreground mb-6">
                You've completed all daily challenges! This badge has been added to your profile.
              </p>
              <Button 
                onClick={closePeaceDovePopup}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
              >
                Awesome!
              </Button>
            </div>
          </Card>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
