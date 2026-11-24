
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://xgtwgrosxavousgupvxn.supabase.co';

const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_pM8grKiyvb7WRmday2OWsg_b2zZh9B-';

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
