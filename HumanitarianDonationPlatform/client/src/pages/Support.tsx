import { useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ExternalLink, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface NonprofitProfile {
  name: string;
  description: string[];
  rating: string;
  programPercent: number;
  logoUrl: string;
  donateUrl: string;
  website: string;
  ein?: string;
  founded?: string;
}

interface NonprofitResponse {
  country: string;
  nonprofits: NonprofitProfile[];
  cached: boolean;
  cachedAt: string;
}

export default function Support() {
  const [, params] = useRoute('/support/:country');
  const country = params?.country || '';
  const { toast } = useToast();

  // Fetch nonprofits for this country
  const { data, isLoading, error } = useQuery<NonprofitResponse>({
    queryKey: ['/api/nonprofits', country],
    enabled: !!country,
  });

  // Track donation mutation
  const trackDonation = useMutation({
    mutationFn: async (nonprofit: NonprofitProfile) => {
      const res = await apiRequest('POST', '/api/donations/external', {
        conflictCountry: country,
        nonprofitName: nonprofit.name,
        nonprofitEin: nonprofit.ein,
        donateUrl: nonprofit.donateUrl,
      });
      return res.json();
    },
    onSuccess: (_, nonprofit) => {
      toast({
        title: 'Donation Tracked',
        description: `Your donation to ${nonprofit.name} will be recorded. Opening donation page...`,
      });
      
      // Open donation URL in new tab
      window.open(nonprofit.donateUrl, '_blank');
      
      // Invalidate donations query
      queryClient.invalidateQueries({ queryKey: ['/api/donations'] });
    },
    onError: (error: any, nonprofit) => {
      // Handle 401 (authentication required) gracefully for anonymous users
      if (error?.status === 401 || error?.message?.includes('401')) {
        toast({
          title: 'Opening Donation Page',
          description: 'Sign up to track your donation impact!',
        });
        // Still open the donation URL for anonymous users
        window.open(nonprofit.donateUrl, '_blank');
      } else {
        // Handle other errors
        toast({
          title: 'Error',
          description: 'Failed to track donation. Opening donation page anyway...',
          variant: 'destructive',
        });
        window.open(nonprofit.donateUrl, '_blank');
      }
    },
  });

  // Set page title
  useEffect(() => {
    if (country) {
      document.title = `Support ${country} - AidAtlas`;
    }
  }, [country]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header skeleton */}
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-8 w-48" />
          </div>

          {/* Card skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-16 w-16 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/discover">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-semibold">Support {country}</h1>
          </div>

          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Unable to load nonprofits for {country}. Please try again later.
              </p>
              <Link href="/discover">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Discover
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/discover">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Support {country}</h1>
            <p className="text-sm text-muted-foreground">
              {data.cached ? 'Showing cached results' : 'AI-researched nonprofits'}
            </p>
          </div>
        </div>

        {/* Nonprofits Card */}
        <Card>
          <CardHeader>
            <CardTitle>Recommended Organizations</CardTitle>
            <CardDescription>
              These nonprofits are actively providing humanitarian assistance in {country}.
              Click "Donate" to support their work.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {data.nonprofits.map((nonprofit, index) => (
              <div
                key={nonprofit.name}
                className="space-y-3 pb-6 border-b last:border-b-0 last:pb-0"
                data-testid={`nonprofit-${index}`}
              >
                {/* Nonprofit Header */}
                <div className="flex items-start gap-4">
                  {/* Logo */}
                  <img
                    src={nonprofit.logoUrl}
                    alt={`${nonprofit.name} logo`}
                    className="h-16 w-16 rounded-lg object-cover border"
                    onError={(e) => {
                      // Fallback to placeholder if image fails
                      const img = e.target as HTMLImageElement;
                      img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nonprofit.name)}&size=200&background=2563EB&color=fff`;
                    }}
                    data-testid={`logo-nonprofit-${index}`}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-lg" data-testid={`name-nonprofit-${index}`}>
                          {nonprofit.name}
                        </h3>
                        {nonprofit.founded && (
                          <p className="text-xs text-muted-foreground">
                            Founded {nonprofit.founded}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" data-testid={`rating-nonprofit-${index}`}>
                          {nonprofit.rating}
                        </Badge>
                        <Badge variant="outline" data-testid={`program-nonprofit-${index}`}>
                          {nonprofit.programPercent}% Programs
                        </Badge>
                      </div>
                    </div>

                    {/* Description */}
                    <ul className="space-y-1 text-sm text-foreground">
                      {nonprofit.description.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pl-20">
                  <Button
                    onClick={() => trackDonation.mutate(nonprofit)}
                    disabled={trackDonation.isPending}
                    className="flex-1"
                    data-testid={`button-donate-${index}`}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Donate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(nonprofit.website, '_blank')}
                    data-testid={`button-website-${index}`}
                  >
                    Website
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Info Footer */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Nonprofits researched using AI and verified humanitarian databases.
            Ratings are estimates based on public data.
          </p>
        </div>
      </div>
    </div>
  );
}
