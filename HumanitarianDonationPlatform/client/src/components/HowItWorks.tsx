import { Compass, Heart, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function HowItWorks() {
  const steps = [
    {
      icon: Compass,
      title: "Discover",
      description: "Swipe through curated conflict profiles and humanitarian causes that match your interests and values.",
      color: "text-chart-1",
    },
    {
      icon: Heart,
      title: "Choose",
      description: "Select verified organizations working on the ground and decide how to allocate your donation.",
      color: "text-chart-2",
    },
    {
      icon: BarChart3,
      title: "Impact",
      description: "Track your contribution's real-world impact with transparent updates and detailed reports.",
      color: "text-chart-3",
    },
  ];

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-muted/30 via-background to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]" />
      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-16">
          <div className="inline-block mb-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <p className="text-sm font-medium text-primary">Simple & Transparent</p>
          </div>
          <h2 className="text-5xl font-display font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Making humanitarian giving simple, transparent, and engaging
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-1/2 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20 -translate-y-1/2" />
          
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card 
                key={step.title} 
                className="p-8 text-center relative hover:shadow-xl transition-all duration-300 group hover:scale-105 border-2 hover:border-primary/30" 
                data-testid={`card-step-${index + 1}`}
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg">
                  {index + 1}
                </div>
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-background to-muted mb-6 ${step.color} shadow-lg group-hover:shadow-xl transition-shadow`}>
                  <Icon className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 font-display group-hover:text-primary transition-colors">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
