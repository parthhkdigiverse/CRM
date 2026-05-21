import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Sparkles, Send, BarChart3, Mail, FileText, Brain, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';

const suggestions = [
  { label: "Summarize this week's sales", icon: BarChart3, color: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50' },
  { label: 'Draft follow-up email', icon: Mail, color: 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50' },
  { label: 'Analyze lead pipeline', icon: Brain, color: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50' },
  { label: 'Generate monthly report', icon: FileText, color: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50' },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await apiClient.post('/ai/query', { query: text });
      const reply = res.data.data.result;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply
      }]);
    } catch (error: any) {
      const errMsg = error?.response?.data?.detail || 'Failed to get AI response';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errMsg}`
      }]);
      toast.error('AI assistant error');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (label: string) => {
    handleSend(label);
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-purple-500" /> AI Assistant
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Your intelligent CRM co-pilot powered by AI.</p>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
        
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ask me anything about your CRM data</h2>
              <p className="text-gray-500 mb-8 max-w-md">I can summarize sales, draft emails, analyze leads, generate reports, and help you make data-driven decisions.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(s.label)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border text-left text-sm font-medium transition-all hover:shadow-md cursor-pointer",
                      s.color
                    )}
                  >
                    <s.icon className="h-5 w-5 shrink-0" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto w-full">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex w-full", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    "max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-md'
                      : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md shadow-sm'
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-500 p-4 rounded-2xl flex items-center gap-2 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    Thinking...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="shrink-0 p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="flex gap-3 max-w-3xl mx-auto">
            <Input
              value={input}
              onChange={(e: any) => setInput(e.target.value)}
              onKeyDown={(e: any) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything about your CRM data..."
              className="flex-1 rounded-xl border-gray-200 dark:border-gray-800 h-11 bg-gray-50/50 dark:bg-gray-900/50"
              disabled={loading}
            />
            <Button 
              onClick={() => handleSend()}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-11 w-11 p-0 shrink-0"
              disabled={loading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
