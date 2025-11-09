import { storage } from "./storage";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import type { Donation, Conflict, Organization } from "@shared/schema";

interface DonationByCountry {
  country: string;
  amount: number;
  count: number;
}

interface DonationByCause {
  cause: string;
  amount: number;
  count: number;
}

interface TimelineEntry {
  date: string;
  amount: number;
}

interface StreakInfo {
  current: number;
  longest: number;
  isActive: boolean;
}

interface MonthComparison {
  previousMonth: string;
  previousTotal: number;
  change: number;
  changePercent: number;
}

export class ReportGenerator {
  async generateMonthlyReport(userId: string, month: string) {
    const existingReport = await storage.getMonthlyReport(userId, month);
    if (existingReport) {
      return existingReport;
    }

    const monthStart = startOfMonth(parseISO(`${month}-01`));
    const monthEnd = endOfMonth(monthStart);

    const allDonations = await storage.getDonations(userId);
    
    const monthDonations = allDonations.filter(d => {
      const donationDate = new Date(d.createdAt!);
      return donationDate >= monthStart && donationDate <= monthEnd;
    });

    const monthlyTotal = monthDonations.reduce((sum, d) => sum + Number(d.amount), 0);
    const donationCount = monthDonations.length;

    const previousMonth = format(subMonths(monthStart, 1), 'yyyy-MM');
    const momChange = await this.calculateMoMChange(userId, month, previousMonth);

    const newBadges = await this.getNewBadgesForMonth(userId, month);

    const streak = await this.calculateStreak(userId, month);

    const donationsByCountry = await this.getDonationsByCountry(userId, monthDonations);
    const donationsByCause = await this.getDonationsByCause(userId, monthDonations);

    const timeline = await this.getMonthlyTimeline(monthDonations);

    const comparison = await this.getMonthComparison(userId, month);

    const suggestions = this.generateSuggestions(
      monthlyTotal,
      donationCount,
      donationsByCountry,
      donationsByCause,
      streak
    );

    const reportData = {
      monthlyTotal,
      donationCount,
      momChange,
      newBadges,
      streak,
      donationsByCountry,
      donationsByCause,
      timeline,
      comparison,
      suggestions,
    };

    const report = await storage.createMonthlyReport({
      userId,
      month,
      reportData,
    });

    return report;
  }

  private async calculateMoMChange(
    userId: string,
    currentMonth: string,
    previousMonth: string
  ): Promise<number> {
    const currentMonthStart = startOfMonth(parseISO(`${currentMonth}-01`));
    const currentMonthEnd = endOfMonth(currentMonthStart);
    
    const previousMonthStart = startOfMonth(parseISO(`${previousMonth}-01`));
    const previousMonthEnd = endOfMonth(previousMonthStart);

    const allDonations = await storage.getDonations(userId);
    
    const currentDonations = allDonations.filter(d => {
      const donationDate = new Date(d.createdAt!);
      return donationDate >= currentMonthStart && donationDate <= currentMonthEnd;
    });
    
    const previousDonations = allDonations.filter(d => {
      const donationDate = new Date(d.createdAt!);
      return donationDate >= previousMonthStart && donationDate <= previousMonthEnd;
    });

    const currentTotal = currentDonations.reduce((sum, d) => sum + Number(d.amount), 0);
    const previousTotal = previousDonations.reduce((sum, d) => sum + Number(d.amount), 0);

    if (previousTotal === 0) return 0;

    return ((currentTotal - previousTotal) / previousTotal) * 100;
  }

  private async getNewBadgesForMonth(userId: string, month: string): Promise<any[]> {
    const monthStart = startOfMonth(parseISO(`${month}-01`));
    const monthEnd = endOfMonth(monthStart);

    const allBadges = await storage.getUserBadges(userId);
    
    const newBadges = allBadges.filter(b => {
      const earnedDate = new Date(b.earnedAt!);
      return earnedDate >= monthStart && earnedDate <= monthEnd;
    });

    return newBadges.map(b => ({
      type: b.badgeType,
      name: b.badgeName,
      icon: b.badgeIcon,
      earnedAt: b.earnedAt,
    }));
  }

  private async calculateStreak(userId: string, currentMonth: string): Promise<StreakInfo> {
    const allDonations = await storage.getDonations(userId);
    
    const monthsWithDonations = new Set<string>();
    allDonations.forEach(d => {
      const donationMonth = format(new Date(d.createdAt!), 'yyyy-MM');
      monthsWithDonations.add(donationMonth);
    });

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    let checkMonth = parseISO(`${currentMonth}-01`);
    const hasCurrentMonth = monthsWithDonations.has(currentMonth);
    
    if (hasCurrentMonth) {
      currentStreak = 1;
      tempStreak = 1;
      
      for (let i = 1; i < 24; i++) {
        const prevMonth = format(subMonths(checkMonth, i), 'yyyy-MM');
        if (monthsWithDonations.has(prevMonth)) {
          currentStreak++;
          tempStreak++;
        } else {
          break;
        }
      }
    }

    longestStreak = currentStreak;

    const sortedMonths = Array.from(monthsWithDonations).sort();
    if (sortedMonths.length > 0) {
      tempStreak = 1;
      for (let i = 1; i < sortedMonths.length; i++) {
        const prevDate = parseISO(`${sortedMonths[i - 1]}-01`);
        const currDate = parseISO(`${sortedMonths[i]}-01`);
        
        const monthDiff = Math.abs(
          (currDate.getFullYear() - prevDate.getFullYear()) * 12 +
          (currDate.getMonth() - prevDate.getMonth())
        );

        if (monthDiff === 1) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }
    }

    return {
      current: currentStreak,
      longest: longestStreak,
      isActive: hasCurrentMonth,
    };
  }

  private async getDonationsByCountry(
    userId: string,
    donations: Donation[]
  ): Promise<DonationByCountry[]> {
    const conflictIds = [...new Set(donations.map(d => d.conflictId))];
    
    const countryMap = new Map<string, { amount: number; count: number }>();

    for (const donation of donations) {
      const conflict = await storage.getConflict(donation.conflictId);
      if (conflict) {
        const existing = countryMap.get(conflict.country) || { amount: 0, count: 0 };
        countryMap.set(conflict.country, {
          amount: existing.amount + Number(donation.amount),
          count: existing.count + 1,
        });
      }
    }

    return Array.from(countryMap.entries())
      .map(([country, data]) => ({
        country,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private async getDonationsByCause(
    userId: string,
    donations: Donation[]
  ): Promise<DonationByCause[]> {
    const causeMap = new Map<string, { amount: number; count: number }>();

    for (const donation of donations) {
      const org = await storage.getOrganization(donation.organizationId);
      if (org && org.causes) {
        for (const cause of org.causes) {
          const existing = causeMap.get(cause) || { amount: 0, count: 0 };
          const shareAmount = Number(donation.amount) / org.causes.length;
          causeMap.set(cause, {
            amount: existing.amount + shareAmount,
            count: existing.count + 1,
          });
        }
      }
    }

    return Array.from(causeMap.entries())
      .map(([cause, data]) => ({
        cause,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private async getMonthlyTimeline(donations: Donation[]): Promise<TimelineEntry[]> {
    const dayMap = new Map<string, number>();

    donations.forEach(d => {
      const day = format(new Date(d.createdAt!), 'yyyy-MM-dd');
      const existing = dayMap.get(day) || 0;
      dayMap.set(day, existing + Number(d.amount));
    });

    return Array.from(dayMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getMonthComparison(
    userId: string,
    month: string
  ): Promise<MonthComparison> {
    const previousMonth = format(subMonths(parseISO(`${month}-01`), 1), 'yyyy-MM');
    const previousReport = await storage.getMonthlyReport(userId, previousMonth);

    const currentMonthStart = startOfMonth(parseISO(`${month}-01`));
    const currentMonthEnd = endOfMonth(currentMonthStart);

    const allDonations = await storage.getDonations(userId);
    const currentDonations = allDonations.filter(d => {
      const donationDate = new Date(d.createdAt!);
      return donationDate >= currentMonthStart && donationDate <= currentMonthEnd;
    });

    const currentTotal = currentDonations.reduce((sum, d) => sum + Number(d.amount), 0);
    const previousTotal = previousReport?.reportData.monthlyTotal || 0;

    const change = currentTotal - previousTotal;
    const changePercent = previousTotal === 0 ? 0 : (change / previousTotal) * 100;

    return {
      previousMonth,
      previousTotal,
      change,
      changePercent,
    };
  }

  private generateSuggestions(
    monthlyTotal: number,
    donationCount: number,
    byCountry: DonationByCountry[],
    byCause: DonationByCause[],
    streak: StreakInfo
  ): string[] {
    const suggestions: string[] = [];

    if (monthlyTotal === 0) {
      suggestions.push("Start your humanitarian journey by making your first donation");
      return suggestions;
    }

    if (donationCount === 1) {
      suggestions.push("Diversify your impact by supporting multiple organizations");
    }

    if (byCountry.length === 1) {
      suggestions.push("Explore conflicts in other regions to broaden your global impact");
    }

    if (byCause.length < 3) {
      suggestions.push("Consider supporting different humanitarian causes");
    }

    if (streak.current > 0 && streak.current < 3) {
      suggestions.push(
        `Keep your ${streak.current}-month streak going by donating this month!`
      );
    }

    if (streak.current >= 3) {
      suggestions.push(
        `Amazing! You've maintained a ${streak.current}-month giving streak`
      );
    }

    if (monthlyTotal < 50) {
      suggestions.push("Every dollar counts - even small donations make a big difference");
    }

    if (suggestions.length === 0) {
      suggestions.push("You're making a real difference in humanitarian causes worldwide");
    }

    return suggestions;
  }
}

export const reportGenerator = new ReportGenerator();
