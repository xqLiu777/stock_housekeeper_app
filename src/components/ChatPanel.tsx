import React, { useRef, useEffect } from 'react';
import { BrainCircuit, ChevronDown, FileText, ChevronUp, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ChatPanelProps {
  isChatCollapsed: boolean;
  setIsChatCollapsed: (v: boolean) => void;
  isChartCollapsed: boolean;
  chatMessages: any[];
  aiAdvice: string;
  expandedReports: Record<number, boolean>;
  setExpandedReports: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  isChatting: boolean;
  chatInput: string;
  setChatInput: (v: string) => void;
  handleChat: () => void;
  handleAnalyze: () => void;
  isAnalyzing: boolean;
  currentStockLength: number;
  assistantName: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isChatCollapsed,
  setIsChatCollapsed,
  isChartCollapsed,
  chatMessages,
  aiAdvice,
  expandedReports,
  setExpandedReports,
  isChatting,
  chatInput,
  setChatInput,
  handleChat,
  handleAnalyze,
  isAnalyzing,
  currentStockLength,
  assistantName
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatting]);

  if (isChatCollapsed) {
    return (
      <motion.div 
        initial={false}
        animate={{ width: '60px' }}
        className="flex flex-col h-full overflow-hidden transition-all duration-300 relative z-0 bg-slate-900 rounded-2xl items-center py-6"
      >
        <button 
          onClick={() => setIsChatCollapsed(false)}
          className="text-blue-400 hover:text-blue-300 transition-colors"
          title="展开 Jarvis"
        >
          <BrainCircuit size={24} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={false}
      animate={{ width: isChartCollapsed ? '100%' : '33.333%' }}
      className="flex flex-col h-full overflow-hidden transition-all duration-300 relative z-0"
    >
      <section className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col h-full overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BrainCircuit size={120} />
        </div>
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <BrainCircuit className="text-blue-400" size={24} />
              </div>
              <h2 className="text-xl font-bold">交易管家 {assistantName}</h2>
            </div>
            <button 
              onClick={() => setIsChatCollapsed(true)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
            >
              <ChevronDown className="rotate-90" size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
            {chatMessages.length === 0 && !aiAdvice && (
              <div className="text-center text-slate-500 py-10">
                <p className="text-sm italic">直接输入指令，如：“查看隆基绿能分时线”</p>
              </div>
            )}
            
            {aiAdvice && (
              <div className="bg-blue-900/30 border border-blue-500/20 p-4 rounded-xl">
                <div className="text-[10px] font-bold text-blue-400 uppercase mb-2">初始建议</div>
                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {aiAdvice}
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => {
              const hasReport = msg.content.includes('<REPORT>');
              let mainContent = msg.content.replace(/<UI_COMMAND>.*?<\/UI_COMMAND>/g, '').trim();
              let reportContent = '';
              
              if (hasReport) {
                const parts = mainContent.split(/<REPORT>|<\/REPORT>/);
                mainContent = parts[0];
                reportContent = parts[1];
              }

              return (
                <div key={i} className={cn(
                  "flex flex-col max-w-[95%] break-words",
                  msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}>
                  <div className={cn(
                    "p-3 rounded-2xl text-sm w-full overflow-hidden break-words",
                    msg.role === 'user' ? "bg-blue-600 text-white rounded-tr-none" : "bg-slate-800 text-slate-200 rounded-tl-none"
                  )}>
                    <div className="prose prose-sm prose-invert max-w-none break-words overflow-hidden">
                      <ReactMarkdown>{mainContent}</ReactMarkdown>
                    </div>
                    
                    {hasReport && reportContent && (
                      <div className="mt-3 pt-3 border-t border-slate-700 overflow-hidden">
                        <button 
                          onClick={() => setExpandedReports(prev => ({ ...prev, [i]: !prev[i] }))}
                          className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <FileText size={14} />
                          {expandedReports[i] ? "隐藏详细技术报告" : "查看详细技术报告"}
                          {expandedReports[i] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        
                        <AnimatePresence>
                          {expandedReports[i] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 p-3 bg-slate-900/50 rounded-lg text-xs prose prose-invert prose-xs max-w-none border border-slate-700/50 break-words overflow-hidden">
                                <ReactMarkdown>{reportContent}</ReactMarkdown>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isChatting && (
              <div className="flex items-center gap-2 text-slate-500 text-xs italic">
                <div className="flex gap-1">
                  <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce"></span>
                  <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
                Jarvis 正在思考...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="mt-auto space-y-3">
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="咨询 AI 更多细节..."
                className="flex-1 bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              />
              <button 
                onClick={handleChat}
                disabled={isChatting || !chatInput.trim()}
                className="bg-blue-600 px-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center"
              >
                <Play size={20} />
              </button>
            </div>
            
            {!aiAdvice && (
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || currentStockLength === 0}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                {isAnalyzing ? "分析中..." : "生成深度投资建议"}
              </button>
            )}
          </div>
        </div>
      </section>
    </motion.div>
  );
};
