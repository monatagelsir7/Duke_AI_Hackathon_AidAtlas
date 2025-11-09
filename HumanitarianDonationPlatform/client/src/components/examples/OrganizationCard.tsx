import OrganizationCard from '../OrganizationCard';

export default function OrganizationCardExample() {
  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-md mx-auto space-y-4">
        <OrganizationCard
          name="International Rescue Committee"
          description="Provides humanitarian aid and support to refugees and displaced persons worldwide, focusing on health, education, and economic wellbeing."
          rating={4.5}
          verified={true}
          website="https://www.rescue.org"
          onDonate={() => console.log('Donate to IRC')}
        />
        <OrganizationCard
          name="Doctors Without Borders"
          description="Delivers emergency medical care to people affected by conflict, epidemics, disasters, or exclusion from healthcare."
          rating={4.8}
          verified={true}
          website="https://www.doctorswithoutborders.org"
          onDonate={() => console.log('Donate to MSF')}
        />
      </div>
    </div>
  );
}
