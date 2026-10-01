import { createClient } from
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://ddulggqcycgmfzoqloel.supabase.co';

const supabaseKey = 'sb_publishable_2ZpI-GGlANTvfstz4OxceA_MYkwRACs';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;