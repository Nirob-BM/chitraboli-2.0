import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Bot, User, Loader2, Sparkles, Globe, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
    online: "অনলাইন",
    listening: "শুনছি...",
    processing: "প্রক্রিয়াকরণ..."
  },
  en: {
    name: "English",
    flag: "🇬🇧",
    welcome: "Hello! 👋 Welcome to Chitraboli চিত্রাবলী! I'm your AI assistant. How can I help you today?",
    placeholder: "Type your message...",
    online: "Online",
    listening: "Listening...",
    processing: "Processing..."
  },
  hi: {
    name: "हिंदी",
    flag: "🇮🇳",
    welcome: "नमस्ते! 👋 चित्राबोली में आपका स्वागत है! मैं आपका AI सहायक हूं। आज मैं आपकी कैसे मदद कर सकता हूं?",
    placeholder: "अपना संदेश लिखें...",
    online: "ऑनलाइन",
    listening: "सुन रहा हूं...",
    processing: "प्रोसेसिंग..."
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
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;
    
    const userMessage: Message = {
      role: "user",
      content: textToSend
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
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
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
        content: language === "bn" 
          ? "দুঃখিত, এখন সাড়া দিতে সমস্যা হচ্ছে। অনুগ্রহ করে আবার চেষ্টা করুন বা WhatsApp-এ যোগাযোগ করুন।"
          : language === "hi"
          ? "क्षमा करें, अभी जवाब देने में समस्या हो रही है। कृपया पुनः प्रयास करें या WhatsApp पर संपर्क करें।"
          : "I apologize, but I'm having trouble responding right now. Please try again or contact us via WhatsApp."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunksRef.current.length === 0) return;
        
        setIsProcessingVoice(true);
        
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            
            try {
              const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-to-text`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
                },
                body: JSON.stringify({ audio: base64Audio, language })
              });
              
              if (!response.ok) {
                throw new Error('Failed to transcribe audio');
              }
              
              const { text, error } = await response.json();
              
              if (error) {
                throw new Error(error);
              }
              
              if (text && text.trim()) {
                setInput(text);
                // Auto-send the transcribed message
                await sendMessage(text);
              } else {
                toast.error(language === "bn" ? "কোনো কথা বোঝা যায়নি" : language === "hi" ? "कोई बात समझ नहीं आई" : "Could not understand speech");
              }
            } catch (error) {
              console.error('Transcription error:', error);
              toast.error(language === "bn" ? "ভয়েস প্রসেস করতে সমস্যা" : language === "hi" ? "आवाज प्रोसेस करने में समस्या" : "Failed to process voice");
            } finally {
              setIsProcessingVoice(false);
            }
          };
        } catch (error) {
          console.error('Audio processing error:', error);
          setIsProcessingVoice(false);
          toast.error("Failed to process audio");
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Microphone access error:', error);
      toast.error(language === "bn" ? "মাইক্রোফোন অ্যাক্সেস দিন" : language === "hi" ? "माइक्रोफोन एक्सेस दें" : "Please allow microphone access");
    }
  }, [language]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
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
                  {isRecording 
                    ? languageConfig[language].listening 
                    : isProcessingVoice 
                    ? languageConfig[language].processing 
                    : languageConfig[language].online}
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
            {/* Voice Input Button */}
            <button
              onClick={toggleRecording}
              disabled={isLoading || isProcessingVoice}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                isRecording 
                  ? "bg-red-500 animate-pulse" 
                  : isProcessingVoice
                  ? "bg-yellow-500"
                  : "bg-muted/50 hover:bg-purple-accent/30",
                (isLoading || isProcessingVoice) && "opacity-50 cursor-not-allowed"
              )}
              title={isRecording ? "Stop recording" : "Voice input"}
            >
              {isRecording ? (
                <MicOff className="w-3.5 h-3.5 text-white" />
              ) : isProcessingVoice ? (
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-foreground" />
              )}
            </button>
            
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder={languageConfig[language].placeholder}
              className="flex-1 bg-muted/50 border border-purple-accent/20 rounded-full px-3 py-2 text-xs focus:outline-none focus:border-purple-accent/50 transition-colors"
              disabled={isRecording || isProcessingVoice}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading || isRecording || isProcessingVoice}
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
