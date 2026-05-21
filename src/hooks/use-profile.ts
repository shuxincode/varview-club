'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { Profile } from '@/types';

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (!cancelled) {
          setProfile(data as Profile | null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
          setLoading(false);
        }
      }
    };
    fetchProfile();

    return () => { cancelled = true; };
  }, [userId]);

  return { profile, loading, setProfile };
}
