import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Send, 
  User, 
  MoreVertical, 
  Search, 
  Filter, 
  Check, 
  CheckCheck,
  Phone,
  Video,
  Info,
  MessageSquare,
  Printer,
  XCircle,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { metaService } from "@/services/metaService";
import { useToast } from "@/components/ui/use-toast";

interface Chat {
  id: string;
  telefone: string;
  nome: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface Message {
  id: string;
  chat_id: string;
  text_body: string;
  is_from_me: boolean;
  status: string;
  created_at: string;
  message_id: string;
}

interface Donor {
  id: number;
  name: string;
  phone: string | null;
  type?: string;
}

/**
 * Função de Normalização Robusta (Padronizada)
 * Garante que o número sempre tenha o formato: 55 + DDD + 8 dígitos finais
 * Remove múltiplos prefixos '55' e o 9º dígito quando presente.
 */
const normalizePhone = (phone: string): string => {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  
  // Limpa múltiplos prefixos 55 (ex: 555555... -> 55)
  while (cleaned.length > 11 && cleaned.startsWith("5555")) {
    cleaned = cleaned.substring(2);
  }
  
  // Formato DDI(55) + DDD + Numero (12 ou 13 dígitos)
  if (cleaned.startsWith("55") && cleaned.length >= 12) {
    const ddd = cleaned.substring(2, 4);
    const last8 = cleaned.substring(cleaned.length - 8);
    return `55${ddd}${last8}`;
  }
  
  // Formato DDD + Numero (10 ou 11 dígitos) - Adiciona DDI 55
  if (cleaned.length === 10 || cleaned.length === 11) {
    const ddd = cleaned.substring(0, 2);
    const last8 = cleaned.substring(cleaned.length - 8);
    return `55${ddd}${last8}`;
  }
  
  return cleaned;
};

export const WhatsAppChat = ({ donors = [] }: { donors?: Donor[] }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [donorSearch, setDonorSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchChats = async () => {
    const { data, error } = await supabase
      .from('whatsapp_chats')
      .select('*')
      .order('last_message_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching chats:', error);
      return;
    }

    // Deduplicação em tempo de exibição (Client-side merge)
    // Se existirem chats duplicados (com e sem 9 dígitos), mostramos apenas o mais recente
    const uniqueChats: Record<string, Chat> = {};
    (data || []).forEach(chat => {
      const norm = normalizePhone(chat.telefone);
      if (!uniqueChats[norm]) {
        uniqueChats[norm] = chat;
      } else {
        // Se este chat for mais recente que o já guardado para este número, substitui
        if (new Date(chat.last_message_at).getTime() > new Date(uniqueChats[norm].last_message_at).getTime()) {
           uniqueChats[norm] = chat;
        }
      }
    });

    const newChats = Object.values(uniqueChats).sort((a,b) => 
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

    setChats(newChats);

    // Auto-update selectedChat if its ID changed during merge but phone matches
    if (selectedChat) {
      const currentNorm = normalizePhone(selectedChat.telefone);
      const matchingChat = newChats.find(c => normalizePhone(c.telefone) === currentNorm);
      if (matchingChat && matchingChat.id !== selectedChat.id) {
        console.log(`[WhatsAppChat] Selection migrated from ${selectedChat.id} to ${matchingChat.id}`);
        setSelectedChat(matchingChat);
      } else if (!matchingChat) {
        // Chat was deleted and no substitute found (unlikely but possible)
        setSelectedChat(null);
      }
    }
  };

  const fetchMessages = async (chat: Chat) => {
    setIsLoadingMessages(true);
    
    try {
      // 1. Encontrar todos os IDs de chat que pertencem a este mesmo número (Deduplicação)
      const norm = normalizePhone(chat.telefone);
      const { data: relatedChats } = await supabase
        .from('whatsapp_chats')
        .select('id, telefone');
      
      const relatedIds = (relatedChats || [])
        .filter(c => normalizePhone(c.telefone) === norm)
        .map(c => c.id);

      // 2. Buscar todas as mensagens que pertencem a qualquer um desses IDs
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .in('chat_id', relatedIds)
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching consolidated messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const markAsRead = async (chat: Chat) => {
    try {
      // Marcar como lido em todos os IDs relacionados
      const norm = normalizePhone(chat.telefone);
      const { data: relatedChats } = await supabase
        .from('whatsapp_chats')
        .select('id, telefone');
      
      const relatedIds = (relatedChats || [])
        .filter(c => normalizePhone(c.telefone) === norm)
        .map(c => c.id);

      await supabase
        .from('whatsapp_chats')
        .update({ unread_count: 0 })
        .in('id', relatedIds);
      
      fetchChats();
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  useEffect(() => {
    fetchChats();

    // Subscribe to chats changes (INSERT, UPDATE, DELETE)
    const chatSubscription = supabase
      .channel('chat-list-changes')
      .on('postgres_changes', { 
        event: '*', 
        table: 'whatsapp_chats' 
      }, (payload) => {
        console.log('[WhatsAppChat] Chat list change detected:', payload.eventType);
        fetchChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatSubscription);
    };
  }, [selectedChat?.id]); // Re-subscribe if selectedChat changes to keep context fresh

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat);
      markAsRead(selectedChat);

      const normContact = normalizePhone(selectedChat.telefone);

      // Subscribe to all messages changes for related IDs
      const msgSubscription = supabase
        .channel(`chat-msgs-${selectedChat.id}`)
        .on('postgres_changes', 
          { 
            event: '*', // Listen to INSERT, UPDATE, DELETE
            table: 'whatsapp_messages'
          }, 
          async (payload) => {
            // Re-fetch related IDs to ensure we are filtering correctly
            const { data: relatedChats } = await supabase
              .from('whatsapp_chats')
              .select('id, telefone');
            
            const relatedIds = (relatedChats || [])
              .filter(c => normalizePhone(c.telefone) === normContact)
              .map(c => c.id);

            if (payload.eventType === 'INSERT') {
              const incoming = payload.new as Message;
              if (relatedIds.includes(incoming.chat_id)) {
                setMessages(prev => {
                  if (prev.some(m => m.id === incoming.id)) return prev;
                  return [...prev, incoming];
                });
                markAsRead(selectedChat);
              }
            } 
            else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Message;
              // If message was moved to one of our related IDs, or status updated
              if (relatedIds.includes(updated.chat_id)) {
                setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
              } else {
                // If it was moved OUT of our related IDs (unlikely)
                setMessages(prev => prev.filter(m => m.id !== updated.id));
              }
            }
            else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id;
              setMessages(prev => prev.filter(m => m.id !== deletedId));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(msgSubscription);
      };
    } else {
      setMessages([]);
    }
  }, [selectedChat?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedChat) return;

    const currentText = inputText;
    const tempId = `temp-${Date.now()}`;
    
    // Optimistic update
    const optimisticMessage: Message = {
      id: tempId,
      chat_id: selectedChat.id,
      text_body: currentText,
      is_from_me: true,
      status: 'sent',
      created_at: new Date().toISOString(),
      message_id: tempId
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setChats(prev => prev.map(c => 
      c.id === selectedChat.id 
        ? { ...c, last_message: currentText, last_message_at: new Date().toISOString() } 
        : c
    ));
    
    setInputText("");
    setIsSending(true);

    try {
      const savedConfig = localStorage.getItem("meta_config");
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        await metaService.sendTextMessage(selectedChat.telefone, currentText, config);
      } else {
        toast({ title: "Aviso", description: "Configure as credenciais da Meta API na aba API para enviar via WhatsApp.", variant: "default" });
        setInputText(currentText);
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
      setInputText(currentText);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const clearChat = async () => {
    if (!selectedChat) return;
    
    if (confirm("Tem certeza que deseja excluir todo o histórico de mensagens desta conversa? Esta ação não pode ser desfeita no Dashboard.")) {
      try {
        // Encontrar todos os IDs relacionados para limpar tudo de uma vez
        const norm = normalizePhone(selectedChat.telefone);
        const { data: relatedChats } = await supabase
          .from('whatsapp_chats')
          .select('id, telefone');
        
        const relatedIds = (relatedChats || [])
          .filter(c => normalizePhone(c.telefone) === norm)
          .map(c => c.id);

        const { error } = await supabase
          .from('whatsapp_messages')
          .delete()
          .in('chat_id', relatedIds);
        
        if (error) {
          toast({ title: "Erro ao limpar", description: error.message, variant: "destructive" });
        } else {
          setMessages([]);
          // Limpar também o last_message nos chats
          await supabase
            .from('whatsapp_chats')
            .update({ last_message: '', last_message_at: new Date().toISOString() })
            .in('id', relatedIds);
            
          toast({ title: "Sucesso", description: "Todo o histórico foi limpo." });
          fetchChats();
        }
      } catch (err: any) {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      }
    }
  };

  const handleCallAction = (type: 'video' | 'audio') => {
    toast({ 
      title: type === 'video' ? "Chamada de Vídeo" : "Chamada de Áudio", 
      description: "A API do WhatsApp Business não suporta chamadas VoIP diretamente via navegador. Use o seu celular físico para realizar chamadas.",
      variant: "default"
    });
  };

  const handleSearchFocus = () => {
    document.getElementById('chat-search-input')?.focus();
  };

  const filteredChats = chats.filter(c => 
    c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.telefone.includes(searchTerm)
  );

  const startChatWithDonor = async (donor: Donor) => {
    if (!donor.phone) {
      toast({ title: "Erro", description: "Este doador não possui telefone cadastrado.", variant: "destructive" });
      return;
    }

    const cleanPhone = normalizePhone(donor.phone);
    
    // Check if chat already exists in our (already deduplicated) state
    const existingChat = chats.find(c => normalizePhone(c.telefone) === cleanPhone);

    if (existingChat) {
      setSelectedChat(existingChat);
      fetchMessages(existingChat);
      setIsDialogOpen(false);
      return;
    }

    // If not in state, check database for the normalized phone
    try {
      const { data: chatData, error: fetchError } = await supabase
        .from('whatsapp_chats')
        .select('*')
        .eq('telefone', cleanPhone)
        .maybeSingle();

      if (chatData) {
        setSelectedChat(chatData);
        fetchMessages(chatData);
      } else {
        // Create new normalized chat
        const { data: newChat, error: createError } = await supabase
          .from('whatsapp_chats')
          .upsert([{ 
            telefone: cleanPhone, 
            nome: donor.name || 'Contato',
            donor_id: donor.id
          }], { onConflict: 'telefone' })
          .select()
          .single();

        if (createError) throw createError;
        setSelectedChat(newChat);
        fetchMessages(newChat);
        fetchChats();
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao iniciar chat", description: err.message, variant: "destructive" });
    }
  };

  const filteredDonors = donors.filter(d => 
    d.name.toLowerCase().includes(donorSearch.toLowerCase()) || 
    (d.phone && d.phone.includes(donorSearch))
  );

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-card border rounded-xl overflow-hidden shadow-sm">
      {/* Left Sidebar: Contacts List */}
      <div className="w-80 border-r flex flex-col bg-muted/20">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Conversas</h2>
            <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              id="chat-search-input"
              placeholder="Buscar ou começar nova conversa..." 
              className="pl-9 bg-background/50" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y divide-border">
            {filteredChats.map((chat) => (
              <div 
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-primary/5 transition-colors ${selectedChat?.id === chat.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
              >
                <Avatar className="h-12 w-12 border">
                  <AvatarFallback className="bg-primary/5 text-primary text-xs">
                    {chat.nome?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm truncate">{chat.nome}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <p className="truncate pr-4">{chat.last_message || "Sem mensagens"}</p>
                    {chat.unread_count > 0 && (
                      <Badge variant="default" className="h-4 min-w-4 px-1 rounded-full text-[10px] flex items-center justify-center bg-primary">
                        {chat.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredChats.length === 0 && (
              <div className="p-10 text-center text-muted-foreground text-sm">
                Nenhuma conversa encontrada.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="h-16 border-b flex items-center justify-between px-6 bg-card">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedChat.nome?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-sm leading-none">{selectedChat.nome}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1">
                  Conectado via WhatsApp • {selectedChat.telefone} 
                  {selectedChat.telefone.length === 12 && selectedChat.telefone.startsWith('55') && ' (Normalizado)'}
                </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleCallAction('video')}><Video className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleCallAction('audio')}><Phone className="w-4 h-4" /></Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => toast({ title: "Dados do Contato", description: "Esta funcionalidade será integrada ao CRM em breve." })}>
                      <User className="w-4 h-4 mr-2" /> Dados do contato
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => window.print()}>
                      <Printer className="w-4 h-4 mr-2" /> Exportar / Print
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleSearchFocus}>
                      <Search className="w-4 h-4 mr-2" /> Pesquisar
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => toast({ title: "Selecionar", description: "Modo de seleção de mensagens ativado." })}>
                      <Check className="w-4 h-4 mr-2" /> Selecionar mensagens
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={clearChat}>
                      <Trash2 className="w-4 h-4 mr-2" /> Limpar conversa
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      className="text-destructive" 
                      onClick={() => toast({ title: "Bloquear Contato", description: "O bloqueio deve ser feito diretamente pelo celular vinculado." })}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Bloquear
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="ghost" size="icon" onClick={handleSearchFocus}><Search className="w-4 h-4" /></Button>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-6 bg-slate-50/50 dark:bg-slate-900/10">
              <div className="space-y-4">
                {messages.map((msg, i) => {
                  const showDate = i === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[i-1].created_at).toDateString();
                  
                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-6">
                           <span className="px-3 py-1 bg-muted rounded-full text-[10px] font-medium text-muted-foreground">
                              {new Date(msg.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                           </span>
                        </div>
                      )}
                      
                      <div className={`flex ${msg.is_from_me ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${
                          msg.is_from_me 
                            ? 'bg-primary text-primary-foreground rounded-tr-none' 
                            : 'bg-card border text-card-foreground rounded-tl-none'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text_body}</p>
                          <div className={`flex items-center gap-1 mt-1 justify-end opacity-70`}>
                            <span className="text-[9px]">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.is_from_me && (
                              msg.status === 'read' 
                                ? <CheckCheck className="w-3 h-3 text-blue-200" /> 
                                : msg.status === 'delivered' 
                                  ? <CheckCheck className="w-3 h-3 text-slate-300" /> 
                                  : <Check className="w-3 h-3 text-slate-300" />
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t bg-card">
              <div className="flex items-end gap-2 max-w-4xl mx-auto">
                <div className="flex-1 bg-muted/40 rounded-2xl border px-4 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 transition-all flex items-center">
                  <Input 
                    placeholder="Escreva sua mensagem..." 
                    className="border-none shadow-none focus-visible:ring-0 bg-transparent"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                </div>
                <Button 
                  size="icon" 
                  className="rounded-full shadow-lg h-10 w-10 shrink-0"
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
             <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-primary/30" />
             </div>
             <div>
                <h3 className="text-xl font-bold">Chat ao Vivo</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Selecione uma conversa na lista lateral para visualizar as mensagens e responder em tempo real.
                </p>
             </div>
             <div className="pt-4">
                <Button variant="outline" className="rounded-full" onClick={() => setIsDialogOpen(true)}>Começar nova conversa</Button>
             </div>
          </div>
        )}
      </div>

      {/* Optional Info Panel (Hidden by default) */}
      <div className="w-0 border-l bg-card hidden xl:block xl:w-72 transition-all">
         {selectedChat && (
            <div className="p-6 space-y-6">
               <div className="text-center space-y-2">
                  <Avatar className="h-20 w-20 mx-auto border-2 border-primary/20">
                     <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold">
                        {selectedChat.nome?.slice(0, 2).toUpperCase()}
                     </AvatarFallback>
                  </Avatar>
                  <div>
                     <h3 className="font-bold text-base">{selectedChat.nome}</h3>
                     <p className="text-xs text-muted-foreground">{selectedChat.telefone}</p>
                  </div>
               </div>
               
               <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-3 text-sm">
                     <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <User className="w-4 h-4" />
                     </div>
                     <span>Perfil do Doador</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                     <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Badge className="w-4 h-4 bg-green-500 rounded-full p-0" />
                     </div>
                     <span className="text-green-600 font-medium">Ativo</span>
                  </div>
               </div>
            </div>
         )}
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Nova Conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar doador..." 
                className="pl-9" 
                value={donorSearch}
                onChange={(e) => setDonorSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="h-72 pr-4">
              <div className="space-y-2">
                {filteredDonors.map(donor => (
                  <div 
                    key={donor.id}
                    onClick={() => startChatWithDonor(donor)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors border border-transparent hover:border-border"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                        {donor.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{donor.name}</p>
                      <p className="text-xs text-muted-foreground">{donor.phone || "Sem telefone"}</p>
                    </div>
                  </div>
                ))}
                {filteredDonors.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Nenhum doador encontrado.</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
