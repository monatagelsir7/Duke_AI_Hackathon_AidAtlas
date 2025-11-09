import type { Action, UserPreferenceVector } from "@shared/schema";

interface ActionScore {
  action: Action;
  score: number;
  reasons: string[];
}

interface UserPreferences {
  regions?: string[];
  causes?: string[];
  demographics?: string[];
  location?: string;
}

export class ActionMatcher {
  /**
   * Calculate how well an action matches a user's preferences
   * Returns a score from 0-100 and reasons for the match
   */
  scoreAction(
    action: Action,
    userPreferences: UserPreferences,
    preferenceVector?: UserPreferenceVector
  ): ActionScore {
    let score = 0;
    const reasons: string[] = [];

    // 1. Geographic match (30 points max)
    if (userPreferences.regions && action.country) {
      const regionMatch = userPreferences.regions.some(region => 
        action.country?.toLowerCase().includes(region.toLowerCase())
      );
      if (regionMatch) {
        score += 30;
        reasons.push(`Location match: ${action.country}`);
      }
    }

    // 2. Location proximity match (20 points max)
    if (userPreferences.location) {
      const actionCity = action.city?.trim();
      const actionAddress = action.address?.trim();
      
      // Only check if action has actual location data
      if (actionCity || actionAddress) {
        const actionLocation = `${actionCity || ''} ${actionAddress || ''}`.toLowerCase().trim();
        const userLocation = userPreferences.location.toLowerCase().trim();
        
        // Ensure we're not matching empty strings
        if (actionLocation && userLocation) {
          const locationMatch = actionLocation.includes(userLocation) || 
                               userLocation.includes(actionLocation);
          if (locationMatch) {
            score += 20;
            reasons.push(`Near you: ${actionCity || actionAddress}`);
          }
        }
      }
    }

    // 3. Tag/cause alignment (30 points max)
    if (userPreferences.causes && action.tags) {
      const actionTags = Array.isArray(action.tags) ? action.tags : [];
      const causeMatch = userPreferences.causes.some(cause =>
        actionTags.some((tag: string) => 
          tag.toLowerCase().includes(cause.toLowerCase())
        )
      );
      if (causeMatch) {
        score += 30;
        const matchedTags = actionTags.filter((tag: string) =>
          userPreferences.causes?.some(cause => 
            tag.toLowerCase().includes(cause.toLowerCase())
          )
        );
        reasons.push(`Cause match: ${matchedTags.join(', ')}`);
      }
    }

    // 4. Related conflicts alignment (10 points max)
    // This checks if the action is related to conflicts the user cares about
    if (action.relatedConflicts && Array.isArray(action.relatedConflicts) && action.relatedConflicts.length > 0) {
      score += 10;
      reasons.push(`Related to humanitarian conflicts`);
    }

    // 5. Behavioral learning bonus (10 points max)
    if (preferenceVector) {
      // Add bonus based on learned preferences
      const regionBonus = this.calculateVectorBonus(
        action.country || '',
        preferenceVector.geoPreferences || {}
      );
      
      // Check tags against cause preferences
      let causeBonus = 0;
      if (action.tags && Array.isArray(action.tags)) {
        causeBonus = Math.max(
          ...action.tags.map((tag: string) =>
            this.calculateVectorBonus(tag, preferenceVector.causePreferences || {})
          )
        );
      }
      
      const behaviorBonus = Math.min(10, (regionBonus + causeBonus) / 2);
      if (behaviorBonus > 0) {
        score += behaviorBonus;
        reasons.push(`Matches your behavior patterns`);
      }
    }

    // 6. Urgency bonus for upcoming actions (max 10 points)
    if (action.startTime) {
      const daysUntil = Math.floor(
        (new Date(action.startTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil >= 0 && daysUntil <= 7) {
        score += 10;
        reasons.push(`Happening soon`);
      } else if (daysUntil > 7 && daysUntil <= 30) {
        score += 5;
      }
    }

    return { action, score, reasons };
  }

  /**
   * Calculate bonus score based on preference vector weights
   */
  private calculateVectorBonus(
    value: string,
    weights: Record<string, number>
  ): number {
    const valueLower = value.toLowerCase();
    let maxWeight = 0;

    for (const [key, weight] of Object.entries(weights)) {
      if (valueLower.includes(key.toLowerCase()) && weight > maxWeight) {
        maxWeight = weight;
      }
    }

    // Convert weight to 0-5 scale
    return Math.min(5, maxWeight * 5);
  }

  /**
   * Rank actions by relevance to user
   */
  rankActions(
    actions: Action[],
    userPreferences: UserPreferences,
    preferenceVector?: UserPreferenceVector
  ): ActionScore[] {
    const scored = actions.map(action =>
      this.scoreAction(action, userPreferences, preferenceVector)
    );

    // Sort by score (highest first)
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Get top N recommended actions
   */
  getTopRecommendations(
    actions: Action[],
    userPreferences: UserPreferences,
    preferenceVector?: UserPreferenceVector,
    limit: number = 10
  ): ActionScore[] {
    const ranked = this.rankActions(actions, userPreferences, preferenceVector);
    return ranked.slice(0, limit);
  }

  /**
   * Filter actions by minimum score threshold
   */
  filterByScore(
    actions: Action[],
    userPreferences: UserPreferences,
    preferenceVector?: UserPreferenceVector,
    minScore: number = 20
  ): ActionScore[] {
    const ranked = this.rankActions(actions, userPreferences, preferenceVector);
    return ranked.filter(item => item.score >= minScore);
  }
}

export const actionMatcher = new ActionMatcher();
