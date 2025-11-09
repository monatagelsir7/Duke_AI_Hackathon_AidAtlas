import { useState } from "react";
import { X, Heart, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Organization {
  id: string;
  name: string;
  description: string;
}

interface DonationModalProps {
  open: boolean;
  onClose: () => void;
  conflictTitle: string;
  organizations: Organization[];
  onComplete: (amount: number, orgIds: string[]) => void;
}

const PRESET_AMOUNTS = [10, 25, 50, 100, 250, 500];

export default function DonationModal({
  open,
  onClose,
  conflictTitle,
  organizations,
  onComplete,
}: DonationModalProps) {
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>(
    organizations.map((o) => o.id)
  );

  const finalAmount = amount || parseFloat(customAmount) || 0;
  const perOrgAmount = selectedOrgs.length > 0 
    ? (finalAmount / selectedOrgs.length).toFixed(2)
    : "0.00";

  const handleDonate = () => {
    if (finalAmount > 0 && selectedOrgs.length > 0) {
      onComplete(finalAmount, selectedOrgs);
      onClose();
    }
  };

  const toggleOrg = (orgId: string) => {
    setSelectedOrgs((prev) =>
      prev.includes(orgId)
        ? prev.filter((id) => id !== orgId)
        : [...prev, orgId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Support {conflictTitle}</DialogTitle>
          <DialogDescription>
            Your donation will be split equally among selected organizations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div>
            <h3 className="font-semibold mb-3">Choose your donation amount</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {PRESET_AMOUNTS.map((preset) => (
                <Button
                  key={preset}
                  variant={amount === preset ? "default" : "outline"}
                  onClick={() => {
                    setAmount(preset);
                    setCustomAmount("");
                  }}
                  data-testid={`button-amount-${preset}`}
                >
                  ${preset}
                </Button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <input
                type="number"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setAmount(null);
                }}
                className="w-full pl-8 pr-4 py-2 border border-input rounded-md bg-background"
                data-testid="input-custom-amount"
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Select organizations to support</h3>
            <div className="space-y-2">
              {organizations.map((org) => {
                const isSelected = selectedOrgs.includes(org.id);
                return (
                  <Card
                    key={org.id}
                    className={`p-4 cursor-pointer transition-all hover-elevate ${
                      isSelected ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => toggleOrg(org.id)}
                    data-testid={`org-selector-${org.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-1"
                        data-testid={`checkbox-org-${org.id}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium">{org.name}</h4>
                          {isSelected && finalAmount > 0 && (
                            <Badge variant="secondary" data-testid={`badge-split-${org.id}`}>
                              ${perOrgAmount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {org.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {finalAmount > 0 && selectedOrgs.length > 0 && (
            <Card className="p-4 bg-accent/50">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-accent-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-accent-foreground">
                    Your ${finalAmount} donation will be split equally
                  </p>
                  <p className="text-sm text-accent-foreground/80">
                    ${perOrgAmount} to each of {selectedOrgs.length} organization(s)
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleDonate}
              disabled={finalAmount === 0 || selectedOrgs.length === 0}
              className="flex-1"
              data-testid="button-complete-donation"
            >
              <Heart className="h-4 w-4 mr-2" />
              Donate ${finalAmount.toFixed(0)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
