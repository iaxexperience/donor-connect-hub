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
  Info
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

export const WhatsAppChat = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchChats = async () => {
    const { data, error } = await supabase
      .from('whatsapp_chats')
      .select('*')
      .order('last_message_at', { ascending: false });
    
    if (!error && data) setChats(data);
  };

  const fetchMessages = async (chatId: string) => {
    setIsLoadingMessages(true);
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    setIsLoadingMessages(false);
    if (!error && data) setMessages(data);
  };

  const markAsRead = async (chatId: string) => {
    await supabase
      .from('whatsapp_chats')
      .update({ unread_count: 0 })
      .eq('id', chatId);
    
    // Refresh chats to update unread badge in list
    fetchChats();
  };

  useEffect(() => {
    fetchChats();

    // Subscribe to chats changes
    const chatSubscription = supabase
      .channel('chat-list-changes')
      .on('postgres_changes', { event: '*', table: 'whatsapp_chats' }, () => {
        fetchChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatSubscription);
    };
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      markAsRead(selectedChat.id);

      // Subscribe to messages in this chat
      const msgSubscription = supabase
        .channel(`chat-msgs-${selectedChat.id}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            table: 'whatsapp_messages', 
            filter: `chat_id=eq.${selectedChat.id}` 
          }, 
          (payload) => {
            setMessages(prev => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(msgSubscription);
      };
    } else {
      setMessages([]);
    }
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedChat) return;

    const currentText = inputText;
    setInputText("");

    try {
      // Get config from localStorage (saved in Config tab)
      const savedConfig = localStorage.getItem("meta_config");
      if (!savedConfig) {
        toast({ title: "Erro", description: "Configurações da Meta API não encontradas.", variant: "destructive" });
        return;
      }
      const config = JSON.parse(savedConfig);

      await metaService.sendTextMessage(selectedChat.telefone, currentText, config);
      // The message will appear via Realtime subscription because the Edge Function inserts it into DB
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
      setInputText(currentText);
    }
  };

  const filteredChats = chats.filter(c => 
    c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.telefone.includes(searchTerm)
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
                  <p className="text-[10px] text-muted-foreground mt-1">Conectado via WhatsApp • {selectedChat.telefone}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon"><Video className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon"><Phone className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon"><Search className="w-4 h-4" /></Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Dados do contato</DropdownMenuItem>
                    <DropdownMenuItem>Limpar conversa</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Bloquear</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                              msg.status === 'read' ? <CheckCheck className="w-3 h-3 text-blue-200" /> : <Check className="w-3 h-3" />
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
                <Button variant="outline" className="rounded-full">Começar nova conversa</Button>
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
    </div>
  );
};
