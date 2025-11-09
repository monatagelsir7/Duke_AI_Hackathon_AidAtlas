import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Star, Flame, Target, TrendingUp, Award, Zap, Calendar, Coins } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { Donation } from "@shared/schema";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import DonationGlobe, { type DonationArc } from "@/components/DonationGlobe";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface ImpactStats {
  totalDonated: number;
  peopleHelped: number;
  organizationsSupported: number;
  conflictsSupported: number;
}

interface UserBadge {
  id: string;
  userId: string;
  badgeType: string;
  badgeName: string;
  badgeIcon: string;
  badgeDescription: string;
  earnedAt: string;
}

interface UserPoints {
  id: string;
  userId: string;
  totalPoints: number;
  level: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  rewardPoints: number;
  startDate: string;
  endDate: string;
  userProgress?: number;
  completed?: boolean;
}

interface MonthlyReport {
  userId: string;
  month: string;
  totalDonated: number;
  donationCount: number;
  currentStreak: number;
  momChange: number;
  topCountries: Array<{ country: string; total: number }>;
  topCauses: Array<{ cause: string; total: number }>;
  newMilestones: string[];
}

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Impact() {
  const { user, loading: authLoading } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<ImpactStats>({
    queryKey: ['/api/impact/stats'],
    enabled: !!user,
  });

  const { data: badges = [], isLoading: badgesLoading } = useQuery<UserBadge[]>({
    queryKey: ['/api/badges'],
    enabled: !!user,
  });

  const { data: points, isLoading: pointsLoading } = useQuery<UserPoints>({
    queryKey: ['/api/points'],
    enabled: !!user,
  });

  const { data: challenges = [], isLoading: challengesLoading } = useQuery<Challenge[]>({
    queryKey: ['/api/challenges'],
    enabled: !!user,
  });

  const { data: report, isLoading: reportLoading } = useQuery<MonthlyReport>({
    queryKey: ['/api/reports'],
    enabled: !!user,
  });

  const { data: donations = [], isLoading: donationsLoading } = useQuery<Donation[]>({
    queryKey: ['/api/donations'],
    enabled: !!user,
  });

  const { data: donationGeography = [], isLoading: geographyLoading } = useQuery<DonationArc[]>({
    queryKey: ['/api/donations/geography'],
    enabled: !!user,
  });

  const isLoading = authLoading || statsLoading || badgesLoading || pointsLoading || challengesLoading || reportLoading || donationsLoading || geographyLoading;

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || Trophy;
  };

  const donationsByMonth = donations.reduce((acc, d) => {
    if (!d.createdAt) return acc;
    const month = format(parseISO(d.createdAt), 'MMM yyyy');
    if (!acc[month]) acc[month] = 0;
    acc[month] += parseFloat(d.amount);
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(donationsByMonth).map(([month, amount]) => ({
    month,
    amount
  })).slice(-6);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-12 px-6 flex items-center justify-center">
          <p className="text-muted-foreground">Loading your impact...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-12 px-6 text-center">
          <p className="text-muted-foreground">Please log in to view your impact.</p>
        </div>
      </div>
    );
  }

  const impactStats = stats || {
    totalDonated: 0,
    peopleHelped: 0,
    organizationsSupported: 0,
    conflictsSupported: 0,
  };

  const userPoints = points || { totalPoints: 0, level: 1 };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-display font-bold mb-2" data-testid="text-page-title">Your Impact Dashboard</h1>
            <p className="text-muted-foreground">
              Track your contributions, earn badges, and see the difference you're making
            </p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6" data-testid="tabs-impact">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="badges" data-testid="tab-badges">Badges</TabsTrigger>
              <TabsTrigger value="challenges" data-testid="tab-challenges">Challenges</TabsTrigger>
              <TabsTrigger value="report" data-testid="tab-report">Monthly Report</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card data-testid="card-global-impact">
                <CardHeader>
                  <CardTitle>Good Actions Around the World</CardTitle>
                  <CardDescription>
                    Visualizing your global humanitarian impact across borders
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <ErrorBoundary
                    fallback={
                      <div 
                        className="flex items-center justify-center bg-card rounded-lg border"
                        style={{ 
                          width: Math.min(800, typeof window !== 'undefined' ? window.innerWidth - 100 : 800), 
                          height: 600 
                        }}
                        data-testid="globe-error"
                      >
                        <div className="text-center text-muted-foreground p-6">
                          <p className="font-medium">3D Globe Visualization Unavailable</p>
                          <p className="text-sm mt-2">
                            Your browser or environment doesn't support WebGL visualization.
                          </p>
                          <p className="text-sm mt-1">
                            Your donations are making a global impact across {donationGeography.length} locations!
                          </p>
                        </div>
                      </div>
                    }
                  >
                    <DonationGlobe 
                      donations={donationGeography} 
                      width={Math.min(800, typeof window !== 'undefined' ? window.innerWidth - 100 : 800)}
                      height={600}
                    />
                  </ErrorBoundary>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card data-testid="card-total-donated">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Donated</CardTitle>
                    <Coins className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-donated">${impactStats.totalDonated.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Your total contributions</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-people-helped">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">People Helped</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-people-helped">{impactStats.peopleHelped.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Lives impacted</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-points">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Impact Points</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-points">{userPoints.totalPoints}</div>
                    <p className="text-xs text-muted-foreground">Level {userPoints.level}</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-streak">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                    <Flame className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-streak">{report?.currentStreak || 0}</div>
                    <p className="text-xs text-muted-foreground">Months active</p>
                  </CardContent>
                </Card>
              </div>

              <Card data-testid="card-donation-chart">
                <CardHeader>
                  <CardTitle>Donation Trend</CardTitle>
                  <CardDescription>Your donations over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="amount" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No donation data yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {report && report.topCauses && report.topCauses.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card data-testid="card-top-countries">
                    <CardHeader>
                      <CardTitle>Top Countries</CardTitle>
                      <CardDescription>Where you've made the most impact</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {report.topCountries.slice(0, 5).map((item, index) => (
                          <div key={item.country} data-testid={`country-${index}`}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span>{item.country}</span>
                              <span className="text-muted-foreground">${item.total.toFixed(2)}</span>
                            </div>
                            <Progress value={(item.total / report.totalDonated) * 100} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-top-causes">
                    <CardHeader>
                      <CardTitle>Top Causes</CardTitle>
                      <CardDescription>Your focus areas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {report.topCauses.slice(0, 5).map((item, index) => (
                          <div key={item.cause} data-testid={`cause-${index}`}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span>{item.cause}</span>
                              <span className="text-muted-foreground">${item.total.toFixed(2)}</span>
                            </div>
                            <Progress value={(item.total / report.totalDonated) * 100} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="badges" className="space-y-6">
              <Card data-testid="card-badges">
                <CardHeader>
                  <CardTitle>Your Badges</CardTitle>
                  <CardDescription>
                    {badges.length > 0 ? `You've earned ${badges.length} badge${badges.length !== 1 ? 's' : ''}!` : 'Start donating to earn badges'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {badges.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {badges.map((badge, index) => {
                        const IconComponent = getIconComponent(badge.badgeIcon);
                        return (
                          <Card key={badge.id} className="p-4" data-testid={`badge-${index}`}>
                            <div className="flex items-start gap-4">
                              <div className="p-3 bg-primary/10 rounded-full">
                                <IconComponent className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold mb-1">{badge.badgeName}</h4>
                                <p className="text-sm text-muted-foreground">{badge.badgeDescription}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Earned {format(parseISO(badge.earnedAt), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No badges earned yet. Keep making donations to unlock achievements!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="challenges" className="space-y-6">
              <Card data-testid="card-challenges">
                <CardHeader>
                  <CardTitle>Active Challenges</CardTitle>
                  <CardDescription>Complete challenges to earn bonus points</CardDescription>
                </CardHeader>
                <CardContent>
                  {challenges.length > 0 ? (
                    <div className="space-y-4">
                      {challenges.map((challenge, index) => {
                        const progress = ((challenge.userProgress || 0) / challenge.targetValue) * 100;
                        return (
                          <Card key={challenge.id} className="p-4" data-testid={`challenge-${index}`}>
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold">{challenge.title}</h4>
                                <p className="text-sm text-muted-foreground">{challenge.description}</p>
                              </div>
                              <Badge variant={challenge.completed ? "default" : "secondary"}>
                                {challenge.rewardPoints} pts
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <Progress value={progress} />
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{challenge.userProgress || 0} / {challenge.targetValue}</span>
                                <span>{progress.toFixed(0)}% complete</span>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No active challenges at the moment. Check back soon!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="report" className="space-y-6">
              {report ? (
                <>
                  <Card data-testid="card-monthly-summary">
                    <CardHeader>
                      <CardTitle>Monthly Summary - {format(parseISO(report.month), 'MMMM yyyy')}</CardTitle>
                      <CardDescription>Your impact this month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <div className="text-2xl font-bold">${report.totalDonated.toFixed(2)}</div>
                          <p className="text-sm text-muted-foreground">Total Donated</p>
                          {report.momChange !== 0 && (
                            <p className={`text-xs mt-1 ${report.momChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {report.momChange > 0 ? '+' : ''}{report.momChange.toFixed(1)}% vs last month
                            </p>
                          )}
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{report.donationCount}</div>
                          <p className="text-sm text-muted-foreground">Donations Made</p>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{report.currentStreak}</div>
                          <p className="text-sm text-muted-foreground">Month Streak</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {report.newMilestones && report.newMilestones.length > 0 && (
                    <Card data-testid="card-milestones">
                      <CardHeader>
                        <CardTitle>New Milestones</CardTitle>
                        <CardDescription>Achievements unlocked this month</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {report.newMilestones.map((milestone, index) => (
                            <div key={index} className="flex items-center gap-2" data-testid={`milestone-${index}`}>
                              <Award className="h-4 w-4 text-primary" />
                              <span className="text-sm">{milestone}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No monthly report available yet. Start donating to generate your first report!</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
