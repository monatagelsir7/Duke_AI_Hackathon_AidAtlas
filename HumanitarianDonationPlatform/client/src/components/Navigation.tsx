import { Heart, Home, User, History, Settings, Megaphone, Trophy } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/discover", label: "Discover", icon: Heart },
    { path: "/actions", label: "Actions", icon: Megaphone },
    { path: "/challenges", label: "Challenges", icon: Trophy },
    { path: "/impact", label: "Impact", icon: History },
    { path: "/profile", label: "Profile", icon: User },
  ];

  // Add Admin link for authenticated users
  if (user) {
    navItems.push({ path: "/admin", label: "Admin", icon: Settings });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 text-xl font-display font-bold" data-testid="link-logo">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
              <Heart className="relative h-6 w-6 text-primary fill-primary" />
            </div>
            <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              AidAtlas
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path} asChild>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="md:hidden flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path} asChild>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="icon"
                    data-testid={`nav-mobile-${item.label.toLowerCase()}`}
                  >
                    <Icon className="h-5 w-5" />
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
