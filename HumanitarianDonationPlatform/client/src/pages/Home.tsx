import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import OrganizationCard from "@/components/OrganizationCard";
import ImpactStats from "@/components/ImpactStats";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Globe, TrendingUp, Shield, Sparkles } from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const cardHover = {
  scale: 1.03,
  transition: { duration: 0.3, ease: "easeInOut" }
};

export default function Home() {
  const [, setLocation] = useLocation();
  
  const featuredOrganizations = [
    {
      id: "irc",
      name: "International Rescue Committee",
      description: "Provides humanitarian aid and support to refugees and displaced persons worldwide.",
      rating: 4.5,
      verified: true,
      website: "https://www.rescue.org",
    },
    {
      id: "msf",
      name: "Doctors Without Borders",
      description: "Delivers emergency medical care to people affected by conflict and disasters.",
      rating: 4.8,
      verified: true,
      website: "https://www.doctorswithoutborders.org",
    },
    {
      id: "unicef",
      name: "UNICEF",
      description: "Works to protect children's rights and provide humanitarian assistance worldwide.",
      rating: 4.6,
      verified: true,
      website: "https://www.unicef.org",
    },
  ];

  const trustFeatures = [
    {
      icon: CheckCircle,
      title: "Verified Organizations",
      description: "All partner organizations are thoroughly vetted and verified for authenticity and impact",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Shield,
      title: "Transparent Impact",
      description: "Track exactly where your donations go and see the real-world difference you're making",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: TrendingUp,
      title: "Real-Time Updates",
      description: "Get instant updates on how your contributions create positive change worldwide",
      color: "from-emerald-500 to-teal-500"
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "Support humanitarian efforts across continents and make an impact in conflict zones",
      color: "from-amber-500 to-orange-500"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-blue-50/30 dark:via-blue-950/10 to-background">
      <Navigation />
      
      <div className="pt-16">
        <Hero
          onGetStarted={() => setLocation("/discover")}
          onLearnMore={() => {
            document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        <div id="how-it-works">
          <HowItWorks />
        </div>

        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="py-24 px-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-transparent dark:from-blue-950/20 dark:via-purple-950/10 pointer-events-none" />
          
          <div className="max-w-6xl mx-auto relative">
            <motion.div 
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200/50 dark:border-blue-800/50">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-900 dark:text-purple-200">Collective Impact</span>
              </div>
              <h2 className="text-5xl font-display font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                Global Impact
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Together, we're making a meaningful difference across the world
              </p>
            </motion.div>
            
            <motion.div variants={fadeInUp}>
              <ImpactStats
                totalDonated={2847250}
                peopleHelped={156842}
                organizationsSupported={47}
                conflictsSupported={23}
              />
            </motion.div>
          </div>
        </motion.section>

        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-24 px-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-transparent dark:from-purple-950/20 dark:via-blue-950/10 pointer-events-none" />
          
          <div className="max-w-6xl mx-auto relative">
            <motion.div 
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border border-purple-200/50 dark:border-purple-800/50">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">Built on Trust</span>
              </div>
              <h2 className="text-5xl font-display font-bold mb-4 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Why Trust Us
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Your contributions are handled with complete transparency and verified for real impact
              </p>
            </motion.div>

            <motion.div 
              variants={staggerContainer}
              className="grid md:grid-cols-2 gap-6"
            >
              {trustFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    variants={fadeInUp}
                    whileHover={cardHover}
                  >
                    <Card 
                      className="p-8 hover-elevate bg-gradient-to-br from-card to-card/50 border-2 h-full" 
                      data-testid={`card-trust-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-5 shadow-lg`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-2xl font-display font-bold mb-3">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </motion.section>

        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-24 px-6"
        >
          <div className="max-w-6xl mx-auto">
            <motion.div 
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-200/50 dark:border-emerald-800/50">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Verified Partners</span>
              </div>
              <h2 className="text-5xl font-display font-bold mb-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 bg-clip-text text-transparent">
                Featured Organizations
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Trusted partners making a real difference in humanitarian crises worldwide
              </p>
            </motion.div>

            <motion.div 
              variants={staggerContainer}
              className="grid md:grid-cols-3 gap-6"
            >
              {featuredOrganizations.map((org) => (
                <motion.div
                  key={org.id}
                  variants={fadeInUp}
                  whileHover={{ scale: 1.03, y: -5 }}
                  transition={{ duration: 0.3 }}
                >
                  <OrganizationCard
                    {...org}
                    onDonate={() => setLocation("/discover")}
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="relative py-32 px-6 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
          
          <div className="relative max-w-4xl mx-auto text-center text-white">
            <motion.div 
              variants={fadeInUp}
              className="inline-flex items-center gap-2 mb-6 px-5 py-2.5 rounded-full bg-white/20 backdrop-blur-md border border-white/40 shadow-lg"
            >
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-sm font-medium">Join thousands making an impact</p>
            </motion.div>
            
            <motion.h2 
              variants={fadeInUp}
              className="text-5xl md:text-6xl font-display font-bold mb-6 leading-tight"
            >
              Ready to Start Your Journey?
            </motion.h2>
            
            <motion.p 
              variants={fadeInUp}
              className="text-xl mb-10 opacity-90 max-w-2xl mx-auto leading-relaxed"
            >
              Begin discovering humanitarian causes and support organizations making real impact in conflict zones worldwide.
            </motion.p>
            
            <motion.div variants={fadeInUp}>
              <Button
                size="lg"
                onClick={() => setLocation("/discover")}
                className="group bg-white text-purple-700 hover:bg-blue-50 text-lg px-12 py-7 shadow-2xl h-auto font-semibold transition-all duration-300 hover:scale-105"
                data-testid="button-cta-bottom"
              >
                Start Your Journey
                <Sparkles className="ml-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
              </Button>
            </motion.div>
          </div>
        </motion.section>

        <footer className="bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm border-t py-12 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-muted-foreground">
              © 2025 <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AidAtlas</span>. Making humanitarian giving accessible and impactful.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
