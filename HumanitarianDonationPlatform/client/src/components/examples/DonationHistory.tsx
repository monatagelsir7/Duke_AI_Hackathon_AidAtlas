import DonationHistory from '../DonationHistory';

export default function DonationHistoryExample() {
  const mockDonations = [
    {
      id: "1",
      organizationName: "International Rescue Committee",
      conflictTitle: "Syrian Refugee Crisis",
      amount: 100,
      date: "2025-01-15",
      type: "one-time",
    },
    {
      id: "2",
      organizationName: "Doctors Without Borders",
      conflictTitle: "Yemen Healthcare Crisis",
      amount: 50,
      date: "2025-01-10",
      type: "one-time",
    },
    {
      id: "3",
      organizationName: "UNICEF",
      conflictTitle: "Ukraine Education Support",
      amount: 75,
      date: "2025-01-05",
      type: "one-time",
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-display font-bold mb-6">Donation History</h2>
        <DonationHistory donations={mockDonations} />
      </div>
    </div>
  );
}
