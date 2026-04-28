import React from 'react';
import { BarChart3, Search, ChevronDown, Settings } from 'lucide-react';
import { 
  ComposedChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Bar, 
  Line, 
  ResponsiveContainer 
} from 'recharts';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { CandleStick } from './CandleStick';
import { IndicatorChart } from './IndicatorChart';

interface ChartPanelProps {
  isChartCollapsed: boolean;
  setIsChartCollapsed: (v: boolean) => void;
  stockName: string;
  searchSymbol: string;
  setSearchSymbol: (v: string) => void;
  setStockName: (v: string) => void;
  handleSearch: (s?: string, sc?: string, d?: string) => void;
  isRealData: boolean;
  chartScale: string;
  setChartScale: (v: string) => void;
  targetDate: string;
  setTargetDate: (v: string) => void;
  windowSize: number;
  setWindowSize: (v: number) => void;
  activeIndicators: string[];
  setActiveIndicators: (v: string[]) => void;
  currentStock: any[];
  indicators: any;
  indicatorHistory: any[];
  stockTime: string;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({
  isChartCollapsed,
  setIsChartCollapsed,
  stockName,
  searchSymbol,
  setSearchSymbol,
  setStockName,
  handleSearch,
  isRealData,
  chartScale,
  setChartScale,
  targetDate,
  setTargetDate,
  windowSize,
  setWindowSize,
  activeIndicators,
  setActiveIndicators,
  currentStock,
  indicators,
  indicatorHistory,
  stockTime
}) => {
  if (isChartCollapsed) {
    return (
      <motion.div 
        initial={false}
        animate={{ flex: '0 0 60px' }}
        className="flex flex-col h-full overflow-hidden transition-all duration-300 bg-white rounded-2xl border border-slate-200 items-center py-6"
      >
        <button 
          onClick={() => setIsChartCollapsed(false)}
          className="text-slate-400 hover:text-blue-600 transition-colors"
          title="展开图表"
        >
          <BarChart3 size={24} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={false}
      animate={{ flex: 1 }}
      className="flex flex-col h-full overflow-hidden transition-all duration-300"
    >
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <BarChart3 className="text-blue-600" size={20} />
              </div>
              <div className="relative group flex flex-col">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="输入股票名称或代码..."
                    className="text-sm font-bold text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-blue-500 outline-none transition-all w-36 sm:w-48 placeholder:text-slate-400"
                    value={stockName || searchSymbol}
                    onChange={(e) => {
                      setSearchSymbol(e.target.value);
                      setStockName("");
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Search size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-hover:text-slate-400" />
                </div>
                <div className="flex gap-2 mt-1">
                  {['贵州茅台', '隆基绿能', '宁德时代'].map(name => (
                    <button 
                      key={name}
                      onClick={() => {
                        setSearchSymbol(name);
                        setStockName("");
                        // Trigger search after state update
                        setTimeout(() => handleSearch(name), 0);
                      }}
                      className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline transition-color"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {stockName && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap",
                isRealData ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
              )}>
                {isRealData ? "实时行情" : "非交易时段"}
              </span>
            )}
            <button 
              onClick={() => setIsChartCollapsed(true)}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors ml-auto lg:ml-0"
            >
              <ChevronDown className="-rotate-90" size={20} />
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => { setChartScale("240"); handleSearch(undefined, "240"); }}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  chartScale === "240" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                日线
              </button>
              <button 
                onClick={() => { setChartScale("1"); handleSearch(undefined, "1"); }}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  chartScale === "1" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                分时
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="date" 
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                value={targetDate}
                onChange={(e) => { setTargetDate(e.target.value); handleSearch(undefined, undefined, e.target.value); }}
              />
              <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">窗口</span>
                <input 
                  type="number" 
                  min="5" 
                  max="100"
                  className="w-12 text-xs bg-transparent outline-none font-mono font-bold"
                  value={windowSize}
                  onChange={(e) => setWindowSize(Number(e.target.value))}
                />
              </div>
              
              <div className="relative group">
                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                  <Settings size={18} />
                </button>
                <div className="absolute right-0 top-full mt-0 pt-2 w-48 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">指标设置</div>
                    <div className="space-y-1">
                      {[
                        { id: 'VOLUME', name: '成交量' },
                        { id: 'MACD', name: 'MACD' },
                        { id: 'KDJ', name: 'KDJ' },
                        { id: 'RSI', name: 'RSI' },
                        { id: 'CCI', name: 'CCI' },
                        { id: 'WR', name: 'WR' },
                        { id: 'OBV', name: 'OBV' },
                        { id: 'ATR', name: 'ATR' }
                      ].map(ind => (
                        <label key={ind.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={activeIndicators.includes(ind.id)}
                            onChange={(e) => {
                              if (e.target.checked) setActiveIndicators([...activeIndicators, ind.id]);
                              else setActiveIndicators(activeIndicators.filter(i => i !== ind.id));
                            }}
                            className="rounded text-blue-600"
                          />
                          <span className="text-xs font-bold text-slate-600">{ind.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
          {currentStock.length > 0 ? (
            <div className="flex flex-col">
              <div style={{ height: activeIndicators.length > 0 ? '300px' : '500px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={currentStock}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={['auto', 'auto']} orientation="right" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    />
                    {currentStock.length > 0 && currentStock[0].boll && (
                      <>
                        <Line type="monotone" dataKey="boll.upper" stroke="#94a3b8" strokeDasharray="5 5" dot={false} strokeWidth={1} name="BOLL UP" />
                        <Line type="monotone" dataKey="boll.mid" stroke="#94a3b8" dot={false} strokeWidth={1} name="BOLL MID" />
                        <Line type="monotone" dataKey="boll.lower" stroke="#94a3b8" strokeDasharray="5 5" dot={false} strokeWidth={1} name="BOLL LOW" />
                        
                        <Line type="monotone" dataKey="ma.ma5" stroke="#3b82f6" dot={false} strokeWidth={1} name="MA5" />
                        <Line type="monotone" dataKey="ma.ma10" stroke="#f59e0b" dot={false} strokeWidth={1} name="MA10" />
                        <Line type="monotone" dataKey="ma.ma20" stroke="#ef4444" dot={false} strokeWidth={1} name="MA20" />
                      </>
                    )}
                    <Bar dataKey={(d: any) => [d.open, d.close]} shape={<CandleStick />} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {activeIndicators.map(ind => (
                <IndicatorChart key={ind} type={ind} data={indicatorHistory} />
              ))}

              <div className="mt-4 flex items-center gap-4 text-[10px] text-slate-400 border-t border-slate-50 pt-4">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>收盘价</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                  <span>成交量</span>
                </div>
                {stockTime && (
                  <span className="ml-auto font-mono">
                    更新于: {stockTime.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1-$2-$3 $4:$5:$6')}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[500px] flex flex-col items-center justify-center text-slate-400 gap-4">
              <div className="flex flex-col items-center gap-2">
                <BarChart3 size={48} strokeWidth={1} />
                <p>暂无数据，请在 Jarvis 对话框中输入指令</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
};
