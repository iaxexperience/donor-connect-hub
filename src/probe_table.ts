
import { createClient } from '@supabase/supabase-js';

// Read env from something? Usually vite uses import.meta.env
// But I can try to read from a file or just use the local client.ts if I can import it.
// Actually, I'll just look at src/integrations/supabase/client.ts

import { supabase } from './src/integrations/supabase/client.ts';

async function probe() {
  const { error } = await supabase.from('whatsapp_settings').select('*').limit(1);
  if (error) {
    console.log('Table whatsapp_settings does not exist or error:', error.message);
  } else {
    console.log('Table whatsapp_settings exists.');
  }
}

probe();
