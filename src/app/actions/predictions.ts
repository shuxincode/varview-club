'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function checkPredictionAccess(): Promise<{ allowed: boolean; error?: string; upgradeUrl?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { allowed: false, error: 'Authentication required' };

    return { allowed: true };
  } catch {
    return { allowed: false, error: 'Failed to verify access' };
  }
}
