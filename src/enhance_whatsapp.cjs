const fs = require('fs');
const path = 'd:/Nova pasta/donor-connect-hub/src/pages/WhatsApp.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update checkConnection
const checkOld = `      console.log('[WhatsApp] meta-whatsapp-proxy Connection Check:', data);
    } catch (e) {
      console.warn('[WhatsApp] meta-whatsapp-proxy might not be fully ready:', e);
    }
  };`;

const checkNew = `      console.log('[WhatsApp] meta-whatsapp-proxy Connection Check:', data);
      toast({ title: "Conexão OK", description: "O servidor respondeu corretamente (Ping v22.0)." });
    } catch (e: any) {
      console.warn('[WhatsApp] meta-whatsapp-proxy might not be fully ready:', e);
      let errorMsg = e.message;
      if (errorMsg.includes("Failed to fetch") || errorMsg.includes("blocked") || errorMsg.includes("NetworkError")) {
         errorMsg = "Bloqueio de Rede Detectado. Geralmente é causado por um Ad-blocker bloqueando o termo 'whatsapp' na URL do Supabase. Desative o ad-blocker da página para testar.";
      }
      toast({ title: "Erro de Conexão", description: errorMsg, variant: "destructive" });
    }
  };`;

if (content.includes("console.log('[WhatsApp] meta-whatsapp-proxy Connection Check:', data);")) {
    // Simple replacement based on landmarks to avoid indent issues
    content = content.replace(/console\.log\('\[WhatsApp\] meta-whatsapp-proxy Connection Check:', data\);\s+\} catch \(e\) \{\s+console\.warn\('\[WhatsApp\] meta-whatsapp-proxy might not be fully ready:', e\);\s+\}\s+\};/, (match) => {
        return checkNew;
    });
}

// 2. Add URL validation in handleCreateTemplate
const validateOld = `    setIsCreatingTemplate(true);
    try {
      // 1. Validate variables`;

const validateNew = `    setIsCreatingTemplate(true);
    try {
      // 0. Detect social media URLs in media fields
      if (newTemplate.headerFormat !== "NONE" && newTemplate.mediaUrl) {
        const isSocialMedia = /instagram\\.com|facebook\\.com|youtube\\.com|youtu\\.be/.test(newTemplate.mediaUrl);
        if (isSocialMedia) {
          toast({ 
            title: "URL de mídia inválida", 
            description: "Você não pode usar links de redes sociais (Instagram/YouTube) aqui. Use um Handle ID da Meta ou um link direto de arquivo (MP4/PNG).", 
            variant: "destructive" 
          });
          setIsCreatingTemplate(false);
          return;
        }
      }

      // 1. Validate variables`;

if (content.includes(`setIsCreatingTemplate(true);`)) {
    content = content.replace(`setIsCreatingTemplate(true);\r\n    try {\r\n      // 1. Validate variables`, validateNew);
    content = content.replace(`setIsCreatingTemplate(true);\n    try {\n      // 1. Validate variables`, validateNew);
}

fs.writeFileSync(path, content);
console.log('WhatsApp.tsx updated via node script');
