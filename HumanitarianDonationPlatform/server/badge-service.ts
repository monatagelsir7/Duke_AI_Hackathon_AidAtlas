import { storage } from "./storage";
import type { InsertUserBadge, Donation, Conflict, Organization } from "@shared/schema";

interface BadgeDefinition {
  type: string;
  name: string;
  description: string;
  icon: string;
  checkCriteria: (userId: string, cachedData?: CachedBadgeData) => Promise<boolean>;
}

interface CachedBadgeData {
  donations: Donation[];
  conflicts: Map<string, Conflict>;
  organizations: Map<string, Organization>;
  stats: {
    totalDonated: number;
    peopleHelped: number;
    organizationsSupported: number;
    conflictsSupported: number;
  };
  participatedActions: any[];
}

export class BadgeService {
  private badges: BadgeDefinition[] = [
    {
      type: "first_donation",
      name: "First Step",
      description: "Made your first donation",
      icon: "Star",
      checkCriteria: async (userId, cachedData) => {
        const donations = cachedData?.donations ?? await storage.getDonations(userId);
        return donations.length >= 1;
      },
    },
    {
      type: "donation_5",
      name: "Helping Hand",
      description: "Made 5 donations",
      icon: "Hand",
      checkCriteria: async (userId, cachedData) => {
        const donations = cachedData?.donations ?? await storage.getDonations(userId);
        return donations.length >= 5;
      },
    },
    {
      type: "donation_10",
      name: "Dedicated Donor",
      description: "Made 10 donations",
      icon: "Heart",
      checkCriteria: async (userId, cachedData) => {
        const donations = cachedData?.donations ?? await storage.getDonations(userId);
        return donations.length >= 10;
      },
    },
    {
      type: "donation_25",
      name: "Champion of Change",
      description: "Made 25 donations",
      icon: "Trophy",
      checkCriteria: async (userId, cachedData) => {
        const donations = cachedData?.donations ?? await storage.getDonations(userId);
        return donations.length >= 25;
      },
    },
    {
      type: "donation_50",
      name: "Humanitarian Hero",
      description: "Made 50 donations",
      icon: "Award",
      checkCriteria: async (userId, cachedData) => {
        const donations = cachedData?.donations ?? await storage.getDonations(userId);
        return donations.length >= 50;
      },
    },
    {
      type: "total_100",
      name: "Century Club",
      description: "Donated $100 or more in total",
      icon: "DollarSign",
      checkCriteria: async (userId, cachedData) => {
        const stats = cachedData?.stats ?? await storage.getUserImpactStats(userId);
        return stats.totalDonated >= 100;
      },
    },
    {
      type: "total_500",
      name: "Major Donor",
      description: "Donated $500 or more in total",
      icon: "Gem",
      checkCriteria: async (userId, cachedData) => {
        const stats = cachedData?.stats ?? await storage.getUserImpactStats(userId);
        return stats.totalDonated >= 500;
      },
    },
    {
      type: "total_1000",
      name: "Platinum Philanthropist",
      description: "Donated $1,000 or more in total",
      icon: "Crown",
      checkCriteria: async (userId, cachedData) => {
        const stats = cachedData?.stats ?? await storage.getUserImpactStats(userId);
        return stats.totalDonated >= 1000;
      },
    },
    {
      type: "streak_3",
      name: "Consistent Giver",
      description: "Maintained a 3-month donation streak",
      icon: "Flame",
      checkCriteria: async (userId, cachedData) => {
        const streak = await this.calculateCurrentStreak(userId, cachedData);
        return streak >= 3;
      },
    },
    {
      type: "streak_6",
      name: "Committed Supporter",
      description: "Maintained a 6-month donation streak",
      icon: "Sparkles",
      checkCriteria: async (userId, cachedData) => {
        const streak = await this.calculateCurrentStreak(userId, cachedData);
        return streak >= 6;
      },
    },
    {
      type: "streak_12",
      name: "Year of Impact",
      description: "Maintained a 12-month donation streak",
      icon: "Globe",
      checkCriteria: async (userId, cachedData) => {
        const streak = await this.calculateCurrentStreak(userId, cachedData);
        return streak >= 12;
      },
    },
    {
      type: "countries_3",
      name: "Global Citizen",
      description: "Supported causes in 3 different countries",
      icon: "MapPin",
      checkCriteria: async (userId, cachedData) => {
        const countries = await this.getUniqueCountries(userId, cachedData);
        return countries >= 3;
      },
    },
    {
      type: "countries_5",
      name: "Worldly Supporter",
      description: "Supported causes in 5 different countries",
      icon: "Map",
      checkCriteria: async (userId, cachedData) => {
        const countries = await this.getUniqueCountries(userId, cachedData);
        return countries >= 5;
      },
    },
    {
      type: "countries_10",
      name: "International Impact",
      description: "Supported causes in 10 different countries",
      icon: "Earth",
      checkCriteria: async (userId, cachedData) => {
        const countries = await this.getUniqueCountries(userId, cachedData);
        return countries >= 10;
      },
    },
    {
      type: "causes_3",
      name: "Well-Rounded Helper",
      description: "Supported 3 different causes",
      icon: "Target",
      checkCriteria: async (userId, cachedData) => {
        const causes = await this.getUniqueCauses(userId, cachedData);
        return causes >= 3;
      },
    },
    {
      type: "causes_5",
      name: "Diverse Donor",
      description: "Supported 5 different causes",
      icon: "Palette",
      checkCriteria: async (userId, cachedData) => {
        const causes = await this.getUniqueCauses(userId, cachedData);
        return causes >= 5;
      },
    },
    {
      type: "orgs_5",
      name: "Network Builder",
      description: "Supported 5 different organizations",
      icon: "Network",
      checkCriteria: async (userId, cachedData) => {
        const stats = cachedData?.stats ?? await storage.getUserImpactStats(userId);
        return stats.organizationsSupported >= 5;
      },
    },
    {
      type: "orgs_10",
      name: "Coalition Champion",
      description: "Supported 10 different organizations",
      icon: "Users",
      checkCriteria: async (userId, cachedData) => {
        const stats = cachedData?.stats ?? await storage.getUserImpactStats(userId);
        return stats.organizationsSupported >= 10;
      },
    },
    {
      type: "action_participant",
      name: "Activist",
      description: "Participated in your first action",
      icon: "Megaphone",
      checkCriteria: async (userId, cachedData) => {
        const actions = cachedData?.participatedActions ?? await storage.getUserParticipatedActions(userId, 100);
        return actions.length >= 1;
      },
    },
    {
      type: "action_5",
      name: "Action Hero",
      description: "Participated in 5 actions",
      icon: "Zap",
      checkCriteria: async (userId, cachedData) => {
        const actions = cachedData?.participatedActions ?? await storage.getUserParticipatedActions(userId, 100);
        return actions.length >= 5;
      },
    },
  ];

  async checkAndAwardBadges(userId: string): Promise<InsertUserBadge[]> {
    const awardedBadges: InsertUserBadge[] = [];

    const cachedData = await this.fetchCachedData(userId);

    for (const badge of this.badges) {
      const hasBadge = await storage.hasBadge(userId, badge.type);
      
      if (!hasBadge) {
        const meetsCriteria = await badge.checkCriteria(userId, cachedData);
        
        if (meetsCriteria) {
          const newBadge: InsertUserBadge = {
            userId,
            badgeType: badge.type,
            badgeName: badge.name,
            badgeIcon: badge.icon,
            badgeDescription: badge.description,
          };
          
          await storage.awardBadge(newBadge);
          awardedBadges.push(newBadge);
        }
      }
    }

    return awardedBadges;
  }

  private async fetchCachedData(userId: string): Promise<CachedBadgeData> {
    const donations = await storage.getDonations(userId);
    
    const conflictIds = [...new Set(donations.map(d => d.conflictId))];
    const organizationIds = [...new Set(donations.map(d => d.organizationId))];
    
    const conflicts = new Map<string, Conflict>();
    for (const id of conflictIds) {
      const conflict = await storage.getConflict(id);
      if (conflict) conflicts.set(id, conflict);
    }
    
    const organizations = new Map<string, Organization>();
    for (const id of organizationIds) {
      const org = await storage.getOrganization(id);
      if (org) organizations.set(id, org);
    }
    
    const stats = await storage.getUserImpactStats(userId);
    const participatedActions = await storage.getUserParticipatedActions(userId, 100);
    
    return {
      donations,
      conflicts,
      organizations,
      stats,
      participatedActions,
    };
  }

  async checkSpecificBadge(userId: string, badgeType: string): Promise<boolean> {
    const badge = this.badges.find(b => b.type === badgeType);
    if (!badge) return false;

    const hasBadge = await storage.hasBadge(userId, badgeType);
    if (hasBadge) return false;

    const meetsCriteria = await badge.checkCriteria(userId);
    
    if (meetsCriteria) {
      await storage.awardBadge({
        userId,
        badgeType: badge.type,
        badgeName: badge.name,
        badgeIcon: badge.icon,
        badgeDescription: badge.description,
      });
      return true;
    }

    return false;
  }

  async getAllBadgeDefinitions() {
    return this.badges.map(b => ({
      type: b.type,
      name: b.name,
      description: b.description,
      icon: b.icon,
    }));
  }

  private async calculateCurrentStreak(userId: string, cachedData?: CachedBadgeData): Promise<number> {
    const donations = cachedData?.donations ?? await storage.getDonations(userId);
    
    if (donations.length === 0) return 0;

    const monthsWithDonations = new Set<string>();
    donations.forEach(d => {
      const month = new Date(d.createdAt!).toISOString().substring(0, 7);
      monthsWithDonations.add(month);
    });

    const currentMonth = new Date().toISOString().substring(0, 7);
    if (!monthsWithDonations.has(currentMonth)) {
      return 0;
    }

    let streak = 1;
    let checkDate = new Date();
    
    for (let i = 1; i < 24; i++) {
      checkDate.setMonth(checkDate.getMonth() - 1);
      const checkMonth = checkDate.toISOString().substring(0, 7);
      
      if (monthsWithDonations.has(checkMonth)) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private async getUniqueCountries(userId: string, cachedData?: CachedBadgeData): Promise<number> {
    const donations = cachedData?.donations ?? await storage.getDonations(userId);
    const conflicts = cachedData?.conflicts ?? new Map<string, Conflict>();
    const countries = new Set<string>();

    for (const donation of donations) {
      let conflict = conflicts.get(donation.conflictId);
      if (!conflict) {
        conflict = await storage.getConflict(donation.conflictId);
      }
      if (conflict) {
        countries.add(conflict.country);
      }
    }

    return countries.size;
  }

  private async getUniqueCauses(userId: string, cachedData?: CachedBadgeData): Promise<number> {
    const donations = cachedData?.donations ?? await storage.getDonations(userId);
    const organizations = cachedData?.organizations ?? new Map<string, Organization>();
    const causes = new Set<string>();

    for (const donation of donations) {
      let org = organizations.get(donation.organizationId);
      if (!org) {
        org = await storage.getOrganization(donation.organizationId);
      }
      if (org && org.causes) {
        org.causes.forEach(cause => causes.add(cause));
      }
    }

    return causes.size;
  }
}

export const badgeService = new BadgeService();
