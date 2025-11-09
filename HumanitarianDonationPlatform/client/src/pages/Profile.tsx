import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Award, Heart, DollarSign, Target, Share2, Sparkles, Crown, Star, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Donation } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";

interface UnlockedBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  glowing?: boolean;
}

interface RecentActivity {
  id: string;
  type: 'donation' | 'challenge' | 'badge';
  title: string;
  description: string;
  xp?: number;
  time: string;
}

const ALL_BADGES: Omit<UnlockedBadge, 'unlocked' | 'glowing'>[] = [
  { id: 'first-step', name: 'First Step', description: 'Make your first donation', icon: 'Heart', color: 'from-pink-500 to-rose-500' },
  { id: 'generous-giver', name: 'Generous Giver', description: 'Donate $100 or more', icon: 'DollarSign', color: 'from-green-500 to-emerald-500' },
  { id: 'action-hero', name: 'Action Hero', description: 'Participate in 10 actions', icon: 'Zap', color: 'from-yellow-500 to-orange-500' },
  { id: 'peace-dove', name: 'Peace Dove', description: 'Complete all daily challenges', icon: 'Trophy', color: 'from-purple-500 to-pink-500' },
  { id: 'streak-master', name: 'Streak Master', description: 'Donate for 7 consecutive days', icon: 'Target', color: 'from-blue-500 to-cyan-500' },
  { id: 'world-changer', name: 'World Changer', description: 'Support 10+ conflicts', icon: 'Crown', color: 'from-indigo-500 to-purple-500' },
];

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [badges, setBadges] = useState<UnlockedBadge[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [showSharePopup, setShowSharePopup] = useState(false);

  const { data: donations = [] } = useQuery<Donation[]>({
    queryKey: ['/api/donations'],
    enabled: !!user,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ['/api/impact/stats'],
    enabled: !!user,
  });

  // Load XP and badges from localStorage
  useEffect(() => {
    const savedXP = localStorage.getItem('user-xp');
    if (savedXP) {
      const xpValue = parseInt(savedXP);
      setXP(xpValue);
      setLevel(Math.floor(xpValue / 500) + 1);
    }

    const savedBadges = localStorage.getItem('unlocked-badges');
    const unlockedIds = savedBadges ? JSON.parse(savedBadges) : [];
    
    const badgeList = ALL_BADGES.map(badge => ({
      ...badge,
      unlocked: unlockedIds.includes(badge.id),
      glowing: false,
    }));
    setBadges(badgeList);

    const savedActivity = localStorage.getItem('recent-activity');
    if (savedActivity) {
      setRecentActivity(JSON.parse(savedActivity));
    }
  }, []);

  // Listen for new donations and challenges
  useEffect(() => {
    const handleDonation = (event: CustomEvent) => {
      const newActivity: RecentActivity = {
        id: Date.now().toString(),
        type: 'donation',
        title: 'Donation Made',
        description: `$${event.detail?.amount || 0} donated`,
        xp: Math.floor((event.detail?.amount || 0) * 10),
        time: new Date().toISOString(),
      };
      
      addActivity(newActivity);
    };

    const handleChallenge = (event: CustomEvent) => {
      const newActivity: RecentActivity = {
        id: Date.now().toString(),
        type: 'challenge',
        title: 'Challenge Completed',
        description: event.detail?.title || 'Daily challenge',
        xp: event.detail?.xp || 0,
        time: new Date().toISOString(),
      };
      
      addActivity(newActivity);
    };

    window.addEventListener('donation-made', handleDonation as EventListener);
    window.addEventListener('challenge-completed', handleChallenge as EventListener);

    return () => {
      window.removeEventListener('donation-made', handleDonation as EventListener);
      window.removeEventListener('challenge-completed', handleChallenge as EventListener);
    };
  }, [recentActivity]);

  const addActivity = (activity: RecentActivity) => {
    const updated = [activity, ...recentActivity].slice(0, 10);
    setRecentActivity(updated);
    localStorage.setItem('recent-activity', JSON.stringify(updated));
  };

  const handleShareStreak = () => {
    setShowSharePopup(true);
    setTimeout(() => setShowSharePopup(false), 3000);
    
    toast({
      title: "Link Copied!",
      description: "Your profile link has been copied to clipboard",
    });
  };

  const currentLevelXP = (level - 1) * 500;
  const nextLevelXP = level * 500;
  const progressToNextLevel = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  const xpNeeded = nextLevelXP - xp;

  const donationsToNextBadge = Math.max(0, 100 - (stats?.totalDonated || 0));

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-12 px-6 max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">Your Profile</h1>
            <p className="text-muted-foreground">Log in or sign up to view your profile and track your impact</p>
          </div>
          
          <Card className="p-6">
            <div className="space-y-4">
              <Link href="/login">
                <Button className="w-full bg-gradient-to-r from-primary to-chart-1" data-testid="button-go-login">
                  Log In
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline" className="w-full" data-testid="button-go-signup">
                  Create Account
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/20 dark:via-blue-950/20 to-background">
      <Navigation />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Gradient Header */}
          <Card className="mb-8 overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 border-0 shadow-2xl">
            <div className="p-8 text-white">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30 shadow-xl">
                    <Crown className="h-12 w-12 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-display font-bold mb-2">{user.name}</h1>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                        Level {level}
                      </Badge>
                      <Badge className="bg-yellow-400/90 text-yellow-900 border-0 shadow-lg">
                        <Star className="h-3 w-3 mr-1" />
                        {xp} XP
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="secondary"
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
                  onClick={handleShareStreak}
                  data-testid="button-share-streak"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share My Streak
                </Button>
              </div>

              {/* XP Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Level {level}</span>
                  <span>Level {level + 1}</span>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full h-4 overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-500 ease-out shadow-lg"
                    style={{ width: `${progressToNextLevel}%` }}
                  />
                </div>
                <p className="text-sm text-white/90">{xpNeeded} XP until next level</p>
              </div>
            </div>
          </Card>

          {/* Next Goal Section */}
          <Card className="mb-8 p-6 bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950/20 border-2 border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Next Goal</h3>
                <p className="text-muted-foreground mb-3">
                  ${donationsToNextBadge.toFixed(2)} more in donations to unlock the <strong>Generous Giver</strong> badge
                </p>
                <Progress value={((stats?.totalDonated || 0) / 100) * 100} className="h-2" />
              </div>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Impact Stats */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Impact Stats
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 rounded-xl">
                  <Heart className="h-8 w-8 mx-auto mb-2 text-pink-500" />
                  <div className="text-2xl font-bold">${stats?.totalDonated?.toFixed(2) || '0.00'}</div>
                  <div className="text-xs text-muted-foreground">Total Donated</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-xl">
                  <Target className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{donations.length}</div>
                  <div className="text-xs text-muted-foreground">Donations</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl">
                  <Award className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{badges.filter(b => b.unlocked).length}</div>
                  <div className="text-xs text-muted-foreground">Badges</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">{stats?.conflictsSupported || 0}</div>
                  <div className="text-xs text-muted-foreground">Conflicts Supported</div>
                </div>
              </div>
            </Card>

            {/* Badge Collection */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-500" />
                Badge Collection
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {badges.map((badge) => {
                  const isLocked = !badge.unlocked;
                  
                  return (
                    <div
                      key={badge.id}
                      className={`relative text-center p-4 rounded-xl transition-all duration-300 ${
                        isLocked 
                          ? 'opacity-40 grayscale' 
                          : `bg-gradient-to-br ${badge.color} shadow-lg hover:scale-105 ${badge.glowing ? 'animate-pulse' : ''}`
                      }`}
                      data-testid={`badge-${badge.id}`}
                      style={{
                        animation: badge.glowing ? 'glow 1s ease-in-out infinite' : 'none'
                      }}
                    >
                      {isLocked && (
                        <div className="absolute inset-0 bg-gray-900/50 rounded-xl flex items-center justify-center">
                          <div className="text-white text-2xl">🔒</div>
                        </div>
                      )}
                      <div className="text-4xl mb-2">{isLocked ? '🔒' : badge.icon === 'Heart' ? '❤️' : badge.icon === 'Trophy' ? '🏆' : badge.icon === 'DollarSign' ? '💰' : badge.icon === 'Zap' ? '⚡' : badge.icon === 'Target' ? '🎯' : '👑'}</div>
                      <div className={`text-xs font-semibold ${isLocked ? 'text-gray-500' : 'text-white'}`}>
                        {badge.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Recent Activity
            </h2>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg hover:shadow-md transition-shadow"
                    data-testid={`activity-${activity.id}`}
                  >
                    <div className={`p-2 rounded-full ${
                      activity.type === 'donation' ? 'bg-pink-500' :
                      activity.type === 'challenge' ? 'bg-purple-500' :
                      'bg-green-500'
                    } text-white shadow-lg`}>
                      {activity.type === 'donation' && <Heart className="h-4 w-4" />}
                      {activity.type === 'challenge' && <Target className="h-4 w-4" />}
                      {activity.type === 'badge' && <Award className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{activity.title}</h4>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.time && format(new Date(activity.time), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    {activity.xp && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0">
                        +{activity.xp} XP
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recent activity yet. Start making donations and completing challenges!</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Share Popup */}
      {showSharePopup && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <Card className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 text-white border-0 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Link Copied!</p>
                <p className="text-sm text-white/90">Share your impact with friends</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <style>{`
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
          }
          50% {
            box-shadow: 0 0 40px rgba(168, 85, 247, 0.8);
          }
        }
      `}</style>
    </div>
  );
}
