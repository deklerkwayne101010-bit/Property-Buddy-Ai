import { supabaseAdmin } from './supabase';

export interface CreditCheckResult {
  hasCredits: boolean;
  currentCredits: number;
  requiredCredits: number;
  error?: string;
}

export interface CreditDeductionResult {
  success: boolean;
  newCredits: number;
  error?: string;
}

/**
 * Check if user has sufficient credits for an operation
 */
export async function checkCredits(userId: string, requiredCredits: number): Promise<CreditCheckResult> {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('credits_balance')
      .eq('id', userId)
      .single();

    if (error) {
      // If profile doesn't exist, create it with default credits
      if (error.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            credits_balance: 5, // Default credits for new users (free tier)
            subscription_tier: 'free'
          })
          .select('credits_balance')
          .single();

        if (createError) {
          return {
            hasCredits: false,
            currentCredits: 0,
            requiredCredits,
            error: 'Failed to create user profile'
          };
        }

        const currentCredits = newProfile.credits_balance || 0;
        const hasCredits = currentCredits >= requiredCredits;

        return {
          hasCredits,
          currentCredits,
          requiredCredits
        };
      }

      return {
        hasCredits: false,
        currentCredits: 0,
        requiredCredits,
        error: 'Failed to check user credits'
      };
    }

    const currentCredits = profile?.credits_balance || 0;
    const hasCredits = currentCredits >= requiredCredits;

    return {
      hasCredits,
      currentCredits,
      requiredCredits
    };
  } catch (error) {
    return {
      hasCredits: false,
      currentCredits: 0,
      requiredCredits,
      error: 'Failed to check credits'
    };
  }
}

/**
 * Deduct credits from user account
 */
export async function deductCredits(userId: string, creditsToDeduct: number): Promise<CreditDeductionResult> {
  try {
    // First check current credits
    const creditCheck = await checkCredits(userId, creditsToDeduct);
    if (!creditCheck.hasCredits) {
      return {
        success: false,
        newCredits: creditCheck.currentCredits,
        error: `Insufficient credits. Required: ${creditsToDeduct}, Available: ${creditCheck.currentCredits}`
      };
    }

    // Deduct credits
    const newCredits = creditCheck.currentCredits - creditsToDeduct;

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ credits_balance: newCredits })
      .eq('id', userId);

    if (updateError) {
      return {
        success: false,
        newCredits: creditCheck.currentCredits,
        error: 'Failed to deduct credits'
      };
    }

    // Log the usage
    await supabaseAdmin
      .from('usage_tracking')
      .insert({
        user_id: userId,
        feature: 'photo_edit',
        credits_used: creditsToDeduct
      });

    return {
      success: true,
      newCredits
    };
  } catch (error) {
    return {
      success: false,
      newCredits: 0,
      error: 'Failed to deduct credits'
    };
  }
}

/**
 * Combined function to check credits and deduct if sufficient
 */
export async function checkCreditsAndDeduct(userId: string, requiredCredits: number): Promise<CreditDeductionResult> {
  const creditCheck = await checkCredits(userId, requiredCredits);

  if (!creditCheck.hasCredits) {
    return {
      success: false,
      newCredits: creditCheck.currentCredits,
      error: creditCheck.error || `Insufficient credits. Required: ${requiredCredits}, Available: ${creditCheck.currentCredits}`
    };
  }

  return await deductCredits(userId, requiredCredits);
}

/**
 * Get user's current credit balance
 */
export async function getUserCredits(userId: string): Promise<{ credits: number; error?: string }> {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('credits_balance')
      .eq('id', userId)
      .single();

    if (error) {
      return { credits: 0, error: 'Failed to fetch credits' };
    }

    return { credits: profile?.credits_balance || 0 };
  } catch (error) {
    return { credits: 0, error: 'Failed to fetch credits' };
  }
}

/**
 * Add credits to user account (for purchases, bonuses, etc.)
 */
export async function addCredits(userId: string, creditsToAdd: number, reason: string = 'purchase'): Promise<{ success: boolean; newCredits: number; error?: string }> {
  try {
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('credits_balance')
      .eq('id', userId)
      .single();

    if (fetchError) {
      return { success: false, newCredits: 0, error: 'User not found' };
    }

    const currentCredits = profile?.credits_balance || 0;
    const newCredits = currentCredits + creditsToAdd;

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ credits_balance: newCredits })
      .eq('id', userId);

    if (updateError) {
      return { success: false, newCredits: currentCredits, error: 'Failed to add credits' };
    }

    // Log the credit addition
    await supabaseAdmin
      .from('usage_tracking')
      .insert({
        user_id: userId,
        feature: reason,
        credits_used: -creditsToAdd // Negative to indicate addition
      });

    return { success: true, newCredits };
  } catch (error) {
    return { success: false, newCredits: 0, error: 'Failed to add credits' };
  }
}