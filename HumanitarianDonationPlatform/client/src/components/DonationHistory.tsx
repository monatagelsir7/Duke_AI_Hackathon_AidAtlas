import { Calendar, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DonationRecord {
  id: string;
  organizationName: string;
  conflictTitle: string;
  amount: number;
  date: string;
  type: string;
}

interface DonationHistoryProps {
  donations: DonationRecord[];
}

export default function DonationHistory({ donations }: DonationHistoryProps) {
  if (donations.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Heart className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">No donations yet. Start making an impact!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {donations.map((donation, index) => (
        <Card
          key={donation.id}
          className="p-4"
          data-testid={`donation-record-${index}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{donation.organizationName}</h4>
                <Badge variant="secondary" className="text-xs" data-testid={`badge-type-${donation.type}`}>
                  {donation.type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {donation.conflictTitle}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(donation.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-display font-bold text-chart-2" data-testid={`text-amount-${donation.id}`}>
                ${donation.amount}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
