import ImpactStats from '../ImpactStats';

export default function ImpactStatsExample() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-display font-bold mb-6 text-center">Your Impact</h2>
        <ImpactStats
          totalDonated={1250}
          peopleHelped={342}
          organizationsSupported={8}
          conflictsSupported={5}
        />
      </div>
    </div>
  );
}
