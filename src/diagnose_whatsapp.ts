import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length === 2) {
        process.env[parts[0].trim()] = parts[1].trim();
      }
    });
  }
}

loadEnv();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function diagnose() {
  console.log('--- WhatsApp Chat Diagnostic ---');
  
  const { data: chats, error: chatError } = await supabase
    .from('whatsapp_chats')
    .select('*');
    
  if (chatError) {
    console.error('Error fetching chats:', chatError);
    return;
  }
  
  console.log(`Total chats found: ${chats.length}`);
  
  const countsByPhone: Record<string, number> = {};
  chats.forEach(c => {
    // Only digits comparison
    const digits = c.telefone.replace(/\D/g, "");
    countsByPhone[digits] = (countsByPhone[digits] || 0) + 1;
  });
  
  const duplicates = Object.entries(countsByPhone).filter(([_, count]) => count > 1);
  
  if (duplicates.length > 0) {
    console.log('\nDUPLICATES FOUND (split by formatting/9th digit):');
    duplicates.forEach(([digits, count]) => {
      console.log(`- Digits ${digits}: ${count} entries`);
      const related = chats.filter(c => c.telefone.replace(/\D/g, "") === digits);
      related.forEach(r => console.log(`  - [${r.id}] ${r.telefone} / ${r.nome} (Last msg: ${r.last_message_at})`));
    });
  } else {
    // Check for normalization differences (e.g. 5583988533312 vs 558388533312)
    const normalizedMap: Record<string, string[]> = {};
    
    const normalize = (phone: string) => {
        let cleaned = phone.replace(/\D/g, "");
        if (cleaned.startsWith("55") && cleaned.length >= 12) {
            const ddd = cleaned.substring(2, 4);
            const last8 = cleaned.substring(cleaned.length - 8);
            return `55${ddd}${last8}`;
        }
        return cleaned;
    };

    chats.forEach(c => {
        const norm = normalize(c.telefone);
        if (!normalizedMap[norm]) normalizedMap[norm] = [];
        normalizedMap[norm].push(c.telefone);
    });

    const normDuplicates = Object.entries(normalizedMap).filter(([_, list]) => list.length > 1);
    
    if (normDuplicates.length > 0) {
        console.log('\nDUPLICATES FOUND (Split by 9th digit/Normalization):');
        normDuplicates.forEach(([norm, list]) => {
            console.log(`- Normalized ${norm}: ${list.length} variants`);
            const related = chats.filter(c => normalize(c.telefone) === norm);
            related.forEach(r => console.log(`  - [${r.id}] ${r.telefone} / ${r.nome} (Last msg: ${r.last_message_at})`));
        });
    } else {
        console.log('\nNo duplicate phone numbers found via digits or normalization.');
    }
  }

  // Check last messages
  console.log('\nLast 10 chats updated:');
  chats.sort((a,b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime())
    .slice(0, 10)
    .forEach(c => {
      console.log(`- [${c.id}] ${c.telefone}: "${c.last_message}" at ${c.last_message_at}`);
    });
}

diagnose();
