import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Send, Loader2, Sparkles, Trash2, MessageSquare } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED_PROMPTS = [
  "Mostre as estatísticas gerais dos últimos 30 dias",
  "Quanto arrecadamos no caixa esta semana e por qual modalidade?",
  "Quais doações físicas estão pendentes de recebimento?",
  "Quais doadores não doam há mais de 60 dias?",
  "Agende um follow-up para amanhã para todos os doadores únicos",
  "Envie uma mensagem de agradecimento no WhatsApp para o doador mais recente",
];

export default function AgenteIA() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;

    setInput("");
    setError(null);

    const newMessages: Message[] = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Passa a config do WhatsApp (localStorage) para a Edge Function usar no envio
      let metaConfig: any = null;
      try {
        const saved = localStorage.getItem("meta_config");
        if (saved) metaConfig = JSON.parse(saved);
      } catch { /* ignora */ }

      const { data, error: fnError } = await supabase.functions.invoke("ai-agent", {
        body: { messages: newMessages, meta_config: metaConfig },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const reply = data?.reply ?? "Sem resposta.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Agente IA</h1>
            <p className="text-xs text-muted-foreground">Powered by Claude 3.5 Sonnet</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground">
            <Trash2 className="w-4 h-4 mr-1" />
            Limpar conversa
          </Button>
        )}
      </div>

      {/* Chat area */}
      <Card className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl">
              <Bot className="w-9 h-9 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Olá! Sou o Agente IA do DonorConnect.</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Posso consultar doadores, gerar PIX, enviar WhatsApp, agendar follow-ups e muito mais.
                O que você gostaria de fazer?
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-xs p-3 rounded-lg border bg-background hover:bg-accent transition-colors"
                >
                  <MessageSquare className="w-3 h-3 inline mr-1.5 text-violet-500" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white shadow
                  ${msg.role === "user"
                    ? "bg-orange-500"
                    : "bg-gradient-to-br from-violet-500 to-indigo-600"
                  }`}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm
                  ${msg.role === "user"
                    ? "bg-orange-500 text-white rounded-tr-sm"
                    : "bg-background border rounded-tl-sm"
                  }`}
              >
                {msg.role === "assistant" ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-background border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Pensando...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-auto">
            <Badge variant="destructive" className="text-xs">
              Erro: {error}
            </Badge>
          </div>
        )}

        <div ref={bottomRef} />
      </Card>

      {/* Input area */}
      <div className="mt-3 flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte algo ou peça uma ação... (Enter para enviar)"
          className="resize-none min-h-[56px] max-h-[140px]"
          rows={2}
          disabled={loading}
        />
        <Button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 h-14 w-14 shrink-0"
          size="icon"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-1">
        Shift+Enter para nova linha · Enter para enviar
      </p>
    </div>
  );
}
