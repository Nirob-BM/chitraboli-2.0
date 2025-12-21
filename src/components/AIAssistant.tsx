import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, User, Loader2, Sparkles, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type Language = "bn" | "en" | "hi";

const languageConfig = {
  bn: {
    name: "বাংলা",
    flag: "🇧🇩",
    welcome: "হ্যালো! 👋 চিত্রাবলীতে স্বাগতম! আমি আপনার AI সহায়ক। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?",
    placeholder: "আপনার বার্তা লিখুন...",
    online: "অনলাইন"
  },
  en: {
    name: "English",
    flag: "🇬🇧",
    welcome: "Hello! 👋 Welcome to Chitraboli চিত্রাবলী! I'm your AI assistant. How can I help you today?",
    placeholder: "Type your message...",
    online: "Online"
  },
  hi: {
    name: "हिंदी",
    flag: "🇮🇳",
    welcome: "नमस्ते! 👋 चित्राबोली में आपका स्वागत है! मैं आपका AI सहायक हूं। आज मैं आपकी कैसे मदद कर सकता हूं?",
    placeholder: "अपना संदेश लिखें...",
    online: "ऑनलाइन"
  }
};

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("bn");
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: languageConfig.bn.welcome
  }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setShowLanguageMenu(false);
    setMessages([{
      role: "assistant",
      content: languageConfig[lang].welcome
    }]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: Message = {
      role: "user",
      content: input.trim()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    let assistantContent = "";
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          language,
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });
      if (!response.ok) {
        throw new Error("Failed to get response");
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: ""
      }]);
      while (true) {
        const {
          done,
          value
        } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, {
          stream: true
        });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: assistantContent
                  };
                  return newMessages;
                });
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I apologize, but I'm having trouble responding right now. Please try again or contact us via WhatsApp."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Toggle Button - positioned within footer */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full",
          "bg-gradient-to-br from-purple-accent to-purple-accent/80",
          "shadow-[0_0_20px_rgba(139,92,246,0.4)]",
          "transition-all duration-300 hover:scale-105",
          "text-white text-sm font-medium"
        )}
        aria-label="Toggle AI Assistant"
      >
        <Sparkles className="w-5 h-5" />
        <span>AI Assistant</span>
        {!isOpen && <span className="w-2 h-2 bg-gold rounded-full animate-pulse" />}
      </button>

      {/* Chat Window - positioned above button within footer container */}
      <div
        className={cn(
          "absolute bottom-full right-0 mb-3",
          "w-[340px] sm:w-[380px] h-[400px] sm:h-[450px]",
          "bg-card/95 backdrop-blur-xl rounded-2xl",
          "border border-purple-accent/30",
          "shadow-[0_0_40px_rgba(139,92,246,0.3)]",
          "flex flex-col overflow-hidden",
          "transition-all duration-300",
          isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="p-3 bg-gradient-to-r from-purple-accent/20 to-gold/10 border-b border-purple-accent/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-accent to-gold flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-display text-sm text-foreground">Chitraboli AI</h3>
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {languageConfig[language].online}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors text-xs"
                  title="Change Language"
                >
                  <Globe className="w-3.5 h-3.5" />
                </button>
                {showLanguageMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-card border border-purple-accent/30 rounded-lg shadow-xl z-50 overflow-hidden min-w-[120px]">
                    {(Object.keys(languageConfig) as Language[]).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => handleLanguageChange(lang)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-muted/50 transition-colors",
                          language === lang && "bg-purple-accent/20 text-purple-accent"
                        )}
                      >
                        <span>{languageConfig[lang].flag}</span>
                        <span>{languageConfig[lang].name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((message, index) => (
            <div key={index} className={cn("flex gap-2", message.role === "user" && "flex-row-reverse")}>
              <div className={cn(
                "w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center",
                message.role === "assistant" ? "bg-gradient-to-br from-purple-accent to-gold" : "bg-gold/20"
              )}>
                {message.role === "assistant" ? <Bot className="w-3.5 h-3.5 text-white" /> : <User className="w-3.5 h-3.5 text-gold" />}
              </div>
              <div className={cn(
                "max-w-[80%] p-2.5 rounded-xl",
                message.role === "assistant" ? "bg-muted/50 rounded-tl-sm" : "bg-gradient-to-r from-purple-accent/20 to-gold/20 rounded-tr-sm"
              )}>
                <p className="text-xs text-foreground whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-accent to-gold flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-muted/50 p-2.5 rounded-xl rounded-tl-sm">
                <Loader2 className="w-4 h-4 animate-spin text-purple-accent" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-purple-accent/20">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder={languageConfig[language].placeholder}
              className="flex-1 bg-muted/50 border border-purple-accent/20 rounded-full px-3 py-2 text-xs focus:outline-none focus:border-purple-accent/50 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-accent to-gold flex items-center justify-center disabled:opacity-50 transition-opacity"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
