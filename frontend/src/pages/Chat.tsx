import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Sparkles, User } from 'lucide-react';
import { apiClient } from '../api/client';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  tool_used?: string | null;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsSending(true);

    try {
      const response = await apiClient.post('/chat', {
        message: text,
        conversation_id: conversationId,
      });
      const data = response.data;
      setConversationId(data.conversation_id);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply, intent: data.intent, tool_used: data.tool_used },
      ]);
    } catch (error) {
      console.error('chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-8 h-8 text-primary-500" />
          Career Chat
        </h1>
        <p className="text-slate-400 mt-1">
          Ask the AI career companion about jobs, matching, skill gaps, or interview prep
        </p>
      </div>

      <div className="glass-card flex-1 mt-6 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Sparkles className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-slate-400 text-sm max-w-sm">
                Start a conversation. Try &quot;Find me internships&quot;, &quot;What skills am I missing?&quot;, or
                &quot;Help me prepare for an interview&quot;.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {msg.role === 'user' ? (
                    <User className="w-3.5 h-3.5" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                  )}
                  <span className="text-xs font-semibold opacity-70">
                    {msg.role === 'user' ? 'You' : 'Career Companion'}
                  </span>
                  {msg.intent && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-300">
                      {msg.intent}
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-800 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about internships, skills, or interview prep..."
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white rounded-xl font-semibold disabled:opacity-50 transition-all"
          >
            {isSending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
