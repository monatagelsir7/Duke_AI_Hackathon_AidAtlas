import { TrendingUp, Users, Heart, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ImpactStatsProps {
  totalDonated: number;
  peopleHelped: number;
  organizationsSupported: number;
  conflictsSupported: number;
}

export default function ImpactStats({
  totalDonated,
  peopleHelped,
  organizationsSupported,
  conflictsSupported,
}: ImpactStatsProps) {
  const stats = [
    {
      label: "Total Donated",
      value: `$${totalDonated.toLocaleString()}`,
      icon: Heart,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
      gradient: "from-chart-2/20 to-transparent",
    },
    {
      label: "People Helped",
      value: peopleHelped.toLocaleString(),
      icon: Users,
      color: "text-chart-3",
      bg: "bg-chart-3/10",
      gradient: "from-chart-3/20 to-transparent",
    },
    {
      label: "Organizations",
      value: organizationsSupported.toString(),
      icon: TrendingUp,
      color: "text-chart-1",
      bg: "bg-chart-1/10",
      gradient: "from-chart-1/20 to-transparent",
    },
    {
      label: "Regions Supported",
      value: conflictsSupported.toString(),
      icon: Globe,
      color: "text-chart-4",
      bg: "bg-chart-4/10",
      gradient: "from-chart-4/20 to-transparent",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={stat.label} 
            className="p-6 text-center relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:scale-105" 
            data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <div className="relative">
              <div className={`inline-flex items-center justify-center h-14 w-14 rounded-full ${stat.bg} mx-auto mb-3`}>
                <Icon className={`h-7 w-7 ${stat.color}`} />
              </div>
              <p className="text-4xl font-display font-bold mb-1 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
