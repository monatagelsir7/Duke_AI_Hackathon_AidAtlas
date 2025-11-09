import ConflictCard from '../ConflictCard';
import syriaImage from '@assets/generated_images/Syrian_refugee_camp_aerial_2ae266a3.png';

export default function ConflictCardExample() {
  return (
    <div className="p-6 bg-background min-h-screen flex items-center justify-center">
      <ConflictCard
        country="Syria"
        region="Middle East"
        title="Syrian Refugee Crisis"
        summary="Millions of Syrian refugees need urgent humanitarian assistance including shelter, food, and medical care. The ongoing conflict has displaced families across the region, creating one of the largest humanitarian crises of our time."
        imageUrl={syriaImage}
        affectedGroups={["Children", "Women", "Elderly", "Displaced Families"]}
        severityLevel="high"
        onSupport={() => console.log('Support clicked')}
        onDetails={() => console.log('Details clicked')}
        onPass={() => console.log('Pass clicked')}
      />
    </div>
  );
}
