import Hero from '../Hero';

export default function HeroExample() {
  return (
    <div className="min-h-screen bg-background">
      <Hero
        onGetStarted={() => console.log('Get started clicked')}
        onLearnMore={() => console.log('Learn more clicked')}
      />
    </div>
  );
}
