import { storage } from "./storage";
import type { Conflict, UserPreferenceVector } from "@shared/schema";

export class PreferenceEngine {
  
  async updatePreferencesFromSwipe(
    userId: string,
    conflict: Conflict,
    swipeDirection: 'up' | 'pass' | 'down',
    timeSpent: number
  ): Promise<UserPreferenceVector> {
    // Get or create preference vector
    let vector = await storage.getUserPreferenceVector(userId);
    if (!vector) {
      vector = await storage.createUserPreferenceVector({
        userId,
        geoPreferences: {},
        causePreferences: {},
        demographicPreferences: {},
        urgencyPreference: '0.5',
        interactionCount: 0,
      });
    }

    // Calculate engagement weight (0-1 scale)
    const engagementWeight = this.calculateEngagementWeight(swipeDirection, timeSpent);
    
    // Increment interaction count
    const newInteractionCount = vector.interactionCount + 1;

    // Calculate learning rate based on interaction count
    const learningRate = this.calculateLearningRate(newInteractionCount);

    // Update geo preferences
    const updatedGeo = this.updateGeographicPreferences(
      vector.geoPreferences as Record<string, number>,
      conflict.region,
      engagementWeight,
      learningRate
    );

    // Update cause preferences (from affected groups)
    const updatedCauses = this.updateCausePreferences(
      vector.causePreferences as Record<string, number>,
      conflict.affectedGroups,
      engagementWeight,
      learningRate
    );

    // Update demographic preferences
    const updatedDemo = this.updateDemographicPreferences(
      vector.demographicPreferences as Record<string, number>,
      conflict.affectedGroups,
      engagementWeight,
      learningRate
    );

    // Update urgency preference
    const updatedUrgency = this.updateUrgencyPreference(
      parseFloat(vector.urgencyPreference as string),
      conflict.severityLevel,
      engagementWeight,
      learningRate
    );

    // Update vector in database
    const updatedVector = await storage.updateUserPreferenceVector(userId, {
      geoPreferences: updatedGeo,
      causePreferences: updatedCauses,
      demographicPreferences: updatedDemo,
      urgencyPreference: updatedUrgency.toString(),
      interactionCount: newInteractionCount,
    });

    return updatedVector!;
  }

  private calculateEngagementWeight(swipeDirection: string, timeSpent: number): number {
    // Base weight based on swipe direction
    let baseWeight = 0;
    if (swipeDirection === 'up') baseWeight = 1.0;      // Strong positive signal
    else if (swipeDirection === 'pass') baseWeight = -0.3;  // Mild negative signal
    else if (swipeDirection === 'down') baseWeight = -0.7;  // Strong negative signal

    // Boost weight if user spent time reading (>5 seconds = engaged)
    const timeBoost = Math.min(timeSpent / 30, 1.0); // Max boost at 30 seconds
    const finalWeight = baseWeight * (1 + timeBoost * 0.3); // Up to 30% boost

    return Math.max(-1, Math.min(1, finalWeight)); // Clamp to [-1, 1]
  }

  private updateGeographicPreferences(
    current: Record<string, number>,
    region: string,
    weight: number,
    learningRate: number
  ): Record<string, number> {
    const updated = { ...current };
    const currentValue = updated[region] || 0;
    
    // Exponential moving average with dynamic learning rate
    updated[region] = currentValue * (1 - learningRate) + weight * learningRate;

    return updated;
  }

  private updateCausePreferences(
    current: Record<string, number>,
    affectedGroups: string[],
    weight: number,
    learningRate: number
  ): Record<string, number> {
    const updated = { ...current };

    // Map affected groups to causes
    const causeMapping: Record<string, string[]> = {
      'children': ['Education', 'Child Protection', 'Healthcare'],
      'women': ['Women\'s Rights', 'Healthcare'],
      'refugees': ['Refugee Support', 'Shelter', 'Food Security'],
      'elderly': ['Healthcare', 'Shelter'],
      'displaced families': ['Shelter', 'Food Security', 'Refugee Support'],
    };

    affectedGroups.forEach(group => {
      const lowerGroup = group.toLowerCase();
      Object.entries(causeMapping).forEach(([key, causes]) => {
        if (lowerGroup.includes(key)) {
          causes.forEach(cause => {
            const currentValue = updated[cause] || 0;
            updated[cause] = currentValue * (1 - learningRate) + weight * learningRate;
          });
        }
      });
    });

    return updated;
  }

  private updateDemographicPreferences(
    current: Record<string, number>,
    affectedGroups: string[],
    weight: number,
    learningRate: number
  ): Record<string, number> {
    const updated = { ...current };

    affectedGroups.forEach(group => {
      const currentValue = updated[group] || 0;
      updated[group] = currentValue * (1 - learningRate) + weight * learningRate;
    });

    return updated;
  }

  private updateUrgencyPreference(
    current: number,
    severityLevel: string,
    weight: number,
    learningRate: number
  ): number {
    // Map severity to urgency score
    const severityScores: Record<string, number> = {
      'critical': 1.0,
      'severe': 0.75,
      'moderate': 0.5,
      'low': 0.25,
    };

    const severityScore = severityScores[severityLevel.toLowerCase()] || 0.5;
    // Use half the learning rate for urgency (slower adaptation)
    const urgencyLearningRate = learningRate * 0.5;

    // Only update if positive engagement
    if (weight > 0) {
      return current * (1 - urgencyLearningRate) + severityScore * urgencyLearningRate;
    }

    return current;
  }

  private calculateLearningRate(interactionCount: number): number {
    // Decreasing learning rate as user has more interactions
    // Prevents oscillation with many interactions
    const initialRate = 0.1;
    const decayFactor = 0.995;
    return initialRate * Math.pow(decayFactor, interactionCount);
  }

  async generatePersonalizedFeed(userId: string): Promise<Conflict[]> {
    // Get user's preference vector
    const vector = await storage.getUserPreferenceVector(userId);
    const user = await storage.getUser(userId);
    
    // Get all conflicts
    const allConflicts = await storage.getConflicts();

    // Cold start strategy if no interactions yet
    if (!vector || vector.interactionCount === 0) {
      return this.coldStartRecommendations(allConflicts, user?.preferences);
    }

    // Score each conflict based on preference vector
    const scoredConflicts = allConflicts.map(conflict => ({
      conflict,
      score: this.scoreConflict(conflict, vector, user?.preferences),
    }));

    // Sort by score descending
    scoredConflicts.sort((a, b) => b.score - a.score);

    // Apply tiered recommendation strategy
    return this.applyTieredStrategy(scoredConflicts);
  }

  private scoreConflict(
    conflict: Conflict,
    vector: UserPreferenceVector,
    quizPreferences?: any
  ): number {
    let score = 0;

    // Geographic preference score (40% weight)
    const geoScore = (vector.geoPreferences as Record<string, number>)[conflict.region] || 0;
    score += geoScore * 0.4;

    // Cause preference score (40% weight)
    const causeScores = conflict.affectedGroups.map(group => {
      const causePrefs = vector.causePreferences as Record<string, number>;
      return Object.entries(causePrefs)
        .filter(([cause]) => group.toLowerCase().includes(cause.toLowerCase()))
        .reduce((sum, [, value]) => sum + value, 0);
    });
    const avgCauseScore = causeScores.length > 0 
      ? causeScores.reduce((a, b) => a + b, 0) / causeScores.length 
      : 0;
    score += avgCauseScore * 0.4;

    // Urgency match score (20% weight)
    const severityScores: Record<string, number> = {
      'critical': 1.0,
      'severe': 0.75,
      'moderate': 0.5,
      'low': 0.25,
    };
    const conflictUrgency = severityScores[conflict.severityLevel.toLowerCase()] || 0.5;
    const userUrgency = parseFloat(vector.urgencyPreference as string);
    const urgencyMatch = 1 - Math.abs(conflictUrgency - userUrgency);
    score += urgencyMatch * 0.2;

    // Blend with quiz preferences if interaction count is low
    if (vector.interactionCount < 20 && quizPreferences) {
      const quizScore = this.scoreFromQuizPreferences(conflict, quizPreferences);
      const behavioralWeight = Math.min(vector.interactionCount / 20, 1.0);
      score = score * behavioralWeight + quizScore * (1 - behavioralWeight);
    }

    return score;
  }

  private scoreFromQuizPreferences(conflict: Conflict, quizPreferences: any): number {
    let score = 0;

    // Region match
    if (quizPreferences.regions && quizPreferences.regions.includes(conflict.region)) {
      score += 0.5;
    }

    // Cause match (if quiz had causes)
    if (quizPreferences.causes) {
      const matchingCauses = quizPreferences.causes.filter((cause: string) =>
        conflict.affectedGroups.some(group => 
          group.toLowerCase().includes(cause.toLowerCase())
        )
      );
      score += (matchingCauses.length / quizPreferences.causes.length) * 0.5;
    }

    return score;
  }

  private coldStartRecommendations(
    conflicts: Conflict[],
    quizPreferences?: any
  ): Conflict[] {
    if (!quizPreferences) {
      // Pure cold start - show popular/recent conflicts
      return conflicts.slice(0, 10);
    }

    // Score based on quiz preferences only
    const scored = conflicts.map(conflict => ({
      conflict,
      score: this.scoreFromQuizPreferences(conflict, quizPreferences),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.conflict);
  }

  private applyTieredStrategy(
    scoredConflicts: Array<{ conflict: Conflict; score: number }>
  ): Conflict[] {
    const result: Conflict[] = [];

    // 60% highly matched (top scores)
    const highMatchCount = Math.ceil(scoredConflicts.length * 0.6);
    const highMatches = scoredConflicts.slice(0, highMatchCount);
    result.push(...highMatches.map(s => s.conflict));

    // 30% exploratory (mid-range scores)
    const exploratoryCount = Math.ceil(scoredConflicts.length * 0.3);
    const midStart = Math.floor(scoredConflicts.length * 0.2);
    const midEnd = Math.floor(scoredConflicts.length * 0.8);
    const exploratoryPool = scoredConflicts.slice(midStart, midEnd);
    const exploratory = this.shuffle(exploratoryPool).slice(0, exploratoryCount);
    result.push(...exploratory.map(s => s.conflict));

    // 10% popular (based on donation activity - for now random from all)
    const popularCount = Math.ceil(scoredConflicts.length * 0.1);
    const popular = this.shuffle(scoredConflicts).slice(0, popularCount);
    result.push(...popular.map(s => s.conflict));

    // Shuffle the final result to mix tiers
    return this.shuffle(result);
  }

  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export const preferenceEngine = new PreferenceEngine();
