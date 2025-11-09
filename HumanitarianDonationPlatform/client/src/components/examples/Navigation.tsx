import Navigation from '../Navigation';

export default function NavigationExample() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 px-6 text-center">
        <h1 className="text-4xl font-display font-bold mb-4">Navigation Example</h1>
        <p className="text-muted-foreground">Try clicking the navigation links above</p>
      </div>
    </div>
  );
}
