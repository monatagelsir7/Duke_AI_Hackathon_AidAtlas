import { db } from "./db";
import { organizations, organizationTrustScores, donationFeedback, impactStories } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

interface TrustScoreBreakdown {
  financialTransparency: number;
  impactReporting: number;
  thirdPartyVerification: number;
  operationalTransparency: number;
  accountability: number;
  communityReputation: number;
}

interface TrustScoreResult {
  score: number;
  verificationLevel: number;
  breakdown: TrustScoreBreakdown;
}

export class TrustScoreService {
  /**
   * Calculate comprehensive trust score (0-100) for an organization
   * 
   * Scoring breakdown:
   * - Financial Transparency (25 points): Program expenses, overhead, transparency
   * - Impact Reporting (20 points): Recent updates, stories published, data quality
   * - Third-party Verification (20 points): Charity Navigator, GuideStar, BBB
   * - Operational Transparency (15 points): Years operating, consistent filing, governance
   * - Accountability (10 points): Verification level, audit availability
   * - Community Reputation (10 points): User feedback, donation satisfaction
   */
  async calculateTrustScore(organizationId: string): Promise<TrustScoreResult> {
    const org = await this.getOrganizationData(organizationId);
    
    if (!org) {
      throw new Error('Organization not found');
    }

    let score = 0;
    const breakdown: TrustScoreBreakdown = {
      financialTransparency: 0,
      impactReporting: 0,
      thirdPartyVerification: 0,
      operationalTransparency: 0,
      accountability: 0,
      communityReputation: 0,
    };

    // 1. Financial Transparency (25 points)
    breakdown.financialTransparency = this.scoreFinancialTransparency(org);
    score += breakdown.financialTransparency;

    // 2. Impact Reporting (20 points)
    breakdown.impactReporting = this.scoreImpactReporting(org) * 2; // Scale from 10 to 20
    score += breakdown.impactReporting;

    // 3. Third-party Verification (20 points)
    breakdown.thirdPartyVerification = Math.min(20, (this.scoreRatings(org) / 30) * 20); // Scale from 30 to 20
    score += breakdown.thirdPartyVerification;

    // 4. Operational Transparency (15 points)
    breakdown.operationalTransparency = this.scoreOperationalHistory(org);
    score += breakdown.operationalTransparency;

    // 5. Accountability (10 points)
    breakdown.accountability = Math.min(10, (this.scoreVerificationLevel(org) / 15) * 10); // Scale from 15 to 10
    score += breakdown.accountability;

    // 6. Community Reputation (10 points)
    breakdown.communityReputation = await this.scoreUserFeedback(organizationId) * 2; // Scale from 5 to 10
    score += breakdown.communityReputation;

    // Store trust score
    await this.storeTrustScore(organizationId, {
      total_score: Math.round(score),
      breakdown: breakdown,
      calculated_at: new Date(),
    });

    return {
      score: Math.round(score),
      verificationLevel: org.verificationLevel || 0,
      breakdown: breakdown,
    };
  }

  private scoreRatings(org: any): number {
    let score = 0;

    // Charity Navigator (up to 15 points)
    if (org.charityNavigatorRating) {
      const rating = parseFloat(org.charityNavigatorRating);
      score += (rating / 4) * 15;
    }

    // GuideStar Seal (up to 10 points)
    if (org.guidestarSeal) {
      const sealPoints: Record<string, number> = {
        bronze: 3,
        silver: 5,
        gold: 8,
        platinum: 10,
      };
      score += sealPoints[org.guidestarSeal.toLowerCase()] || 0;
    }

    // BBB Accreditation (up to 5 points)
    if (org.bbbAccredited) {
      score += 5;
    }

    return score;
  }

  private scoreFinancialTransparency(org: any): number {
    let score = 0;

    // Program expense percentage (up to 15 points)
    if (org.programExpensePercentage) {
      const percentage = parseFloat(org.programExpensePercentage);
      if (percentage >= 85) score += 15;
      else if (percentage >= 75) score += 12;
      else if (percentage >= 65) score += 8;
      else score += 5;
    }

    // Overhead percentage (up to 10 points)
    if (org.overheadPercentage) {
      const overhead = parseFloat(org.overheadPercentage);
      if (overhead <= 15) score += 10;
      else if (overhead <= 25) score += 7;
      else if (overhead <= 35) score += 4;
      else score += 2;
    }

    return score;
  }

  private scoreOperationalHistory(org: any): number {
    let score = 0;

    // Years operating (up to 10 points)
    const years = org.yearsOperating || 0;
    if (years >= 10) score += 10;
    else if (years >= 5) score += 7;
    else if (years >= 2) score += 4;
    else score += 2;

    // Consistent Form 990 filing (up to 5 points)
    if (org.consistent990Filing) {
      score += 5;
    }

    return score;
  }

  private scoreVerificationLevel(org: any): number {
    const levelPoints: Record<number, number> = {
      1: 5,
      2: 10,
      3: 15,
    };
    return levelPoints[org.verificationLevel] || 0;
  }

  private scoreImpactReporting(org: any): number {
    let score = 0;

    // Recent impact updates (up to 5 points)
    if (org.lastImpactUpdate) {
      const daysSince = (Date.now() - new Date(org.lastImpactUpdate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince <= 30) score += 5;
      else if (daysSince <= 90) score += 3;
      else score += 1;
    }

    // Impact stories published (up to 5 points)
    const storyCount = org.impactStoriesCount || 0;
    if (storyCount >= 10) score += 5;
    else if (storyCount >= 5) score += 3;
    else if (storyCount >= 1) score += 1;

    return score;
  }

  private async scoreUserFeedback(organizationId: string): Promise<number> {
    const result = await db
      .select({
        totalDonations: sql<number>`count(*)`,
        satisfactionRate: sql<number>`avg(case when ${donationFeedback.userSatisfied} then 1.0 else 0.0 end)`,
      })
      .from(donationFeedback)
      .where(eq(donationFeedback.organizationId, organizationId));

    const feedback = result[0];

    if (!feedback || feedback.totalDonations < 10) {
      return 3; // Neutral score for new organizations
    }

    const satisfactionRate = parseFloat(feedback.satisfactionRate as any) || 0;
    return satisfactionRate * 5; // Up to 5 points
  }

  private getGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C-';
    return 'D';
  }

  private async storeTrustScore(
    organizationId: string,
    scoreData: { total_score: number; breakdown: TrustScoreBreakdown; calculated_at: Date }
  ): Promise<void> {
    // Insert into trust scores history
    await db.insert(organizationTrustScores).values({
      organizationId,
      totalScore: scoreData.total_score,
      breakdown: scoreData.breakdown,
    });

    // Update organization record
    await db
      .update(organizations)
      .set({
        trustScore: scoreData.total_score,
        trustScoreUpdated: scoreData.calculated_at,
      })
      .where(eq(organizations.id, organizationId));
  }

  private async getOrganizationData(organizationId: string): Promise<any> {
    const result = await db
      .select({
        organization: organizations,
        impactStoriesCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${impactStories} 
          WHERE ${impactStories.organizationId} = ${organizations.id}
        )`,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return {
      ...result[0].organization,
      impactStoriesCount: result[0].impactStoriesCount,
    };
  }
}
