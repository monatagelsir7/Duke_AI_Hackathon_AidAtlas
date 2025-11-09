import { useState } from "react";
import DonationModal from '../DonationModal';
import { Button } from "@/components/ui/button";

export default function DonationModalExample() {
  const [open, setOpen] = useState(false);

  const mockOrgs = [
    {
      id: "irc",
      name: "International Rescue Committee",
      description: "Provides healthcare, education, and economic support to refugees",
    },
    {
      id: "msf",
      name: "Doctors Without Borders",
      description: "Delivers emergency medical care in conflict zones",
    },
    {
      id: "unicef",
      name: "UNICEF",
      description: "Protects children's rights and provides humanitarian aid",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Button onClick={() => setOpen(true)} data-testid="button-open-modal">
        Open Donation Modal
      </Button>
      <DonationModal
        open={open}
        onClose={() => setOpen(false)}
        conflictTitle="Syrian Refugee Crisis"
        organizations={mockOrgs}
        onComplete={(amount, orgIds) => {
          console.log(`Donated $${amount} to organizations:`, orgIds);
          setOpen(false);
        }}
      />
    </div>
  );
}
