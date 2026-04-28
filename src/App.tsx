import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  TrendingUp, 
  Wallet, 
  Settings, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart3, 
  BrainCircuit,
  Plus,
  Trash2,
  LogIn,
  Play,
  History,
  Calculator,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  ComposedChart
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  query,
  where,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { cn, formatCurrency, formatPercent } from './lib/utils';
import { fetchStockData, calculateIndicators, calculateHistoryIndicators, StockData, TechnicalIndicators } from './services/stockService';
import { getTradingAdvice, chatWithAI } from './services/aiService';
import { CandleStick } from './components/CandleStick';
import { IndicatorChart } from './components/IndicatorChart';
import { SimulationModule } from './components/SimulationModule';
import { SimulationPage } from './components/SimulationPage';
import { ChatPanel } from './components/ChatPanel';
import { ChartPanel } from './components/ChartPanel';
import { PortfolioDashboard } from './components/PortfolioDashboard';

console.log("App.tsx file executing...");

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-800 rounded-xl border border-red-200 m-4">
          <h2 className="text-xl font-bold mb-2">应用出错了</h2>
          <p className="text-sm mb-4">{this.state.error?.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold"
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'simulation'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(100000);
  const [assistantName, setAssistantName] = useState<string>('贾维斯');
  const [principles, setPrinciples] = useState<string>("");
  const [holdings, setHoldings] = useState<any[]>([]);
  const [searchSymbol, setSearchSymbol] = useState("");
  const [stockName, setStockName] = useState("");
  const [stockTime, setStockTime] = useState("");
  const [isRealData, setIsRealData] = useState(false);
  const [chartScale, setChartScale] = useState("240"); 
  const [windowSize, setWindowSize] = useState(40);
  const [targetDate, setTargetDate] = useState("");
  const [fullHistory, setFullHistory] = useState<StockData[]>([]);
  const [currentStock, setCurrentStock] = useState<StockData[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [aiAdvice, setAiAdvice] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [isUpdatingHoldings, setIsUpdatingHoldings] = useState(false);
  const [expandedReports, setExpandedReports] = useState<Record<number, boolean>>({});
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isChartCollapsed, setIsChartCollapsed] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['VOLUME', 'MACD', 'KDJ', 'RSI']);
  const [indicatorHistory, setIndicatorHistory] = useState<(TechnicalIndicators & { date: string })[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const balanceRef = useRef(balance);
  const principlesRef = useRef(principles);

  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { principlesRef.current = principles; }, [principles]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setIsGuest(false);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || isGuest) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBalance(data.balance ?? 100000);
        setPrinciples(data.tradingPrinciples || "");
        setAssistantName(data.assistantName || "贾维斯");
      } else {
        setDoc(userDocRef, { uid: user.uid, balance: 100000, tradingPrinciples: "", assistantName: "贾维斯" });
      }
    });

    const holdingsRef = collection(db, 'users', user.uid, 'holdings');
    const unsubHoldings = onSnapshot(holdingsRef, (snap) => {
      const h = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setHoldings(h);
    });

    return () => {
      unsubProfile();
      unsubHoldings();
    };
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatting]);

  const handleSearch = async (overrideSymbol?: string, overrideScale?: string, overrideDate?: string) => {
    const sym = overrideSymbol || searchSymbol;
    const sc = overrideScale || chartScale;
    const dt = overrideDate || targetDate;

    if (!sym) return;
    try {
      const data = await fetchStockData(sym, sc, 240);
      setStockName(data.name);
      setFullHistory(data.history);
      setIsRealData(data.isRealData);
      setStockTime(data.time);
      
      processChartData(data.history, dt, windowSize);
      setAiAdvice("");
    } catch (error: any) {
      console.error("Search failed", error);
      setStockName("");
      setFullHistory([]);
      setCurrentStock([]);
    }
  };

  const processChartData = (history: StockData[], date: string, size: number) => {
    if (!history.length) {
      setCurrentStock([]);
      setIndicators(null);
      setIndicatorHistory([]);
      return;
    }

    let filtered = [...history];
    let startIdx = 0;
    let endIdx = history.length;

    if (date) {
      const targetIdx = history.findIndex(d => d.date.startsWith(date));
      if (targetIdx !== -1) {
        const half = Math.floor(size / 2);
        startIdx = Math.max(0, targetIdx - half);
        endIdx = Math.min(history.length, targetIdx + half + 1);
        filtered = history.slice(startIdx, endIdx);
      } else {
        filtered = history.slice(-size);
        startIdx = Math.max(0, history.length - size);
        endIdx = history.length;
      }
    } else {
      filtered = history.slice(-size);
      startIdx = Math.max(0, history.length - size);
      endIdx = history.length;
    }

    setCurrentStock(filtered);
    
    // Calculate indicators for the full history then slice for the visible window
    const allIndicators = calculateHistoryIndicators(history);
    setIndicatorHistory(allIndicators.slice(startIdx, endIdx));
    
    const currentIndicators = calculateIndicators(history.slice(0, endIdx));
    setIndicators(currentIndicators);
  };

  useEffect(() => {
    if (fullHistory.length > 0) {
      processChartData(fullHistory, targetDate, windowSize);
    }
  }, [targetDate, windowSize, chartScale]);

  useEffect(() => {
    if (searchSymbol) handleSearch();
  }, [chartScale]);

  const handleAnalyze = async () => {
    if (!currentStock.length || !indicators) return;
    setIsAnalyzing(true);
    try {
      const advice = await getTradingAdvice(
        currentStock[currentStock.length - 1],
        indicators,
        holdings,
        principles,
        assistantName
      );
      setAiAdvice(advice);
      setChatMessages([]); 
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsChatting(true);
    
    try {
      const lastStock = currentStock.length > 0 ? currentStock[currentStock.length - 1] : null;
      const reply = await chatWithAI(
        chatMessages,
        lastStock,
        indicators,
        holdings,
        principles,
        assistantName,
        userMsg
      );
      setChatMessages(prev => [...prev, { role: "assistant", content: reply }]);

      const uiMatch = reply.match(/<UI_COMMAND>(.*?)<\/UI_COMMAND>/);
      if (uiMatch) {
        try {
          const cmd = JSON.parse(uiMatch[1]);
          if (cmd.symbol) setSearchSymbol(cmd.symbol);
          if (cmd.scale) setChartScale(cmd.scale);
          if (cmd.date) setTargetDate(cmd.date);
          handleSearch(cmd.symbol, cmd.scale, cmd.date);
        } catch (e) {
          console.error("Failed to parse UI command", e);
        }
      }
    } catch (error) {
      console.error("Chat failed", error);
      setChatMessages(prev => [...prev, { role: "assistant", content: "抱歉，回复失败，请稍后再试。" }]);
    } finally {
      setIsChatting(false);
    }
  };

  const updateProfile = async (newBalance?: number, newPrinciples?: string, newAssistantName?: string) => {
    if (!user || isGuest) {
      if (newBalance !== undefined) setBalance(newBalance);
      if (newPrinciples !== undefined) setPrinciples(newPrinciples);
      if (newAssistantName !== undefined) setAssistantName(newAssistantName);
      return;
    }
    const b = newBalance !== undefined ? newBalance : balanceRef.current;
    const p = newPrinciples !== undefined ? newPrinciples : principlesRef.current;
    const a = newAssistantName !== undefined ? newAssistantName : assistantName;
    await setDoc(doc(db, 'users', user.uid), { 
      uid: user.uid, 
      balance: b, 
      tradingPrinciples: p,
      assistantName: a,
      updatedAt: Timestamp.now()
    }, { merge: true });
  };

  const updateHoldingsPrices = async () => {
    if ((!user && !isGuest) || holdings.length === 0) return;
    setIsUpdatingHoldings(true);
    try {
      for (const holding of holdings) {
        const data = await fetchStockData(holding.symbol, '240', 1);
        const currentPrice = data.current;
        await updateDoc(doc(db, 'users', user.uid, 'holdings', holding.id), {
          currentPrice,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error("Failed to update holdings prices", error);
    } finally {
      setIsUpdatingHoldings(false);
    }
  };

  const addHolding = async (holdingData?: { symbol: string, name: string, quantity: number, costPrice: number, currentPrice: number }) => {
    if (!user && !isGuest) return;
    
    let finalData = holdingData;
    
    if (!finalData) {
      if (!searchSymbol) return;
      const currentPrice = currentStock[currentStock.length - 1]?.close || 0;
      finalData = {
        symbol: searchSymbol,
        name: stockName,
        quantity: 100,
        costPrice: currentPrice,
        currentPrice: currentPrice
      };
    }

    if (isGuest) {
      const newHolding = { ...finalData, id: Math.random().toString(36).substr(2, 9), updatedAt: new Date().toISOString() };
      setHoldings(prev => [...prev, newHolding]);
      return;
    }

    await addDoc(collection(db, 'users', user!.uid, 'holdings'), {
      ...finalData,
      uid: user!.uid,
      updatedAt: Timestamp.now()
    });
  };

  const removeHolding = async (id: string) => {
    if (isGuest) {
      setHoldings(prev => prev.filter(h => h.id !== id));
      return;
    }
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'holdings', id));
  };

  const updateHolding = async (id: string, updates: Partial<any>) => {
    if (isGuest) {
      setHoldings(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
      return;
    }
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'holdings', id), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  };

  if (loading) return <div className="flex items-center justify-center h-screen">加载中...</div>;

  if (!user && !isGuest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
        <div className="absolute top-4 left-4 bg-yellow-100/20 p-1 text-[10px] text-yellow-200 rounded">
          Debug: Login Screen | Loading: {loading ? "Yes" : "No"}
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="bg-blue-600 p-6 rounded-3xl inline-block mb-2 shadow-xl shadow-blue-500/20">
            <TrendingUp size={48} className="text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">智能交易助手</h1>
            <p className="text-slate-400 text-lg font-medium">
              无需账号，即刻开启专业级模拟风控
            </p>
          </div>
          
          <div className="space-y-3 pt-4">
            <button 
              onClick={handleLogin}
              className="group flex items-center justify-center gap-3 w-full bg-white text-slate-900 font-bold py-4 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 shadow-lg"
            >
              <LogIn size={20} className="group-hover:rotate-12 transition-transform" />
              使用 Google 账号登录
            </button>
            
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500">或者</span></div>
            </div>

            <button 
              onClick={() => setIsGuest(true)}
              className="flex items-center justify-center gap-2 w-full bg-slate-800 text-slate-200 font-bold py-4 rounded-2xl border border-slate-700 hover:bg-slate-700 hover:border-slate-600 transition-all active:scale-95 shadow-md"
            >
              <RotateCcw size={20} />
              直接免登录使用 (体验模式)
            </button>
          </div>

          <div className="pt-8 grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <div className="text-blue-400 font-bold text-sm mb-1">专业指标</div>
              <div className="text-[10px] text-slate-500">MACD, KDJ, RSI 全支持</div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <div className="text-purple-400 font-bold text-sm mb-1">AI 顾问</div>
              <div className="text-[10px] text-slate-500">贾维斯级实时策略分析</div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const userDisplayName = isGuest ? "访客用户" : (user?.displayName || user?.email?.split('@')[0] || "交易员");
  const userPhoto = isGuest ? null : user?.photoURL;

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-yellow-100 p-1 text-[10px] text-center text-yellow-800">
        Debug: AppContent Rendered | Page: {currentPage} | User: {user?.email}
      </div>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        {isGuest && (
          <div className="bg-blue-600 text-white text-[10px] py-1 text-center font-bold">
            当前处于「免登录体验模式」：数据仅保存在浏览器缓存中，登录后可同步云端。
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
              <TrendingUp size={24} />
              <span>LLMoon智能交易管家</span>
            </div>
            <button 
              onClick={() => setCurrentPage('dashboard')}
              className={cn("px-4 py-2 rounded-lg font-bold text-sm", currentPage === 'dashboard' ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-100")}
            >
              持仓仓库
            </button>
            <button 
              onClick={() => setCurrentPage('simulation')}
              className={cn("px-4 py-2 rounded-lg font-bold text-sm", currentPage === 'simulation' ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-100")}
            >
              模拟交易
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-500 uppercase font-semibold">账户余额 ({isGuest ? "虚拟" : "实盘"})</div>
              <div className="font-mono font-bold text-slate-900">{formatCurrency(balance)}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right hidden md:block">
                <div className="text-[10px] text-slate-400 font-bold">{userDisplayName}</div>
              </div>
              {userPhoto ? (
                <img src={userPhoto} alt="avatar" className="w-10 h-10 rounded-full border border-slate-200" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                  <LogIn size={20} />
                </div>
              )}
              {isGuest && (
                <button 
                  onClick={handleLogin}
                  className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded font-bold hover:bg-blue-700"
                >
                  去登录
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {currentPage === 'dashboard' ? (
          <>
            <PortfolioDashboard 
              balance={balance}
              setBalance={setBalance}
              principles={principles}
              setPrinciples={setPrinciples}
              assistantName={assistantName}
              setAssistantName={setAssistantName}
              holdings={holdings}
              updateHolding={updateHolding}
              removeHolding={removeHolding}
              addHolding={addHolding}
              updateHoldingsPrices={updateHoldingsPrices}
              isUpdatingHoldings={isUpdatingHoldings}
              updateProfile={updateProfile}
            />

            <div className="flex flex-col lg:flex-row gap-8 h-[700px]">
              <ChatPanel 
                isChatCollapsed={isChatCollapsed}
                setIsChatCollapsed={setIsChatCollapsed}
                isChartCollapsed={isChartCollapsed}
                chatMessages={chatMessages}
                aiAdvice={aiAdvice}
                expandedReports={expandedReports}
                setExpandedReports={setExpandedReports}
                isChatting={isChatting}
                chatInput={chatInput}
                setChatInput={setChatInput}
                handleChat={handleChat}
                handleAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
                currentStockLength={currentStock.length}
                assistantName={assistantName}
              />

              <ChartPanel 
                isChartCollapsed={isChartCollapsed}
                setIsChartCollapsed={setIsChartCollapsed}
                stockName={stockName}
                searchSymbol={searchSymbol}
                setSearchSymbol={setSearchSymbol}
                setStockName={setStockName}
                handleSearch={handleSearch}
                isRealData={isRealData}
                chartScale={chartScale}
                setChartScale={setChartScale}
                targetDate={targetDate}
                setTargetDate={setTargetDate}
                windowSize={windowSize}
                setWindowSize={setWindowSize}
                activeIndicators={activeIndicators}
                setActiveIndicators={setActiveIndicators}
                currentStock={currentStock}
                indicators={indicators}
                indicatorHistory={indicatorHistory}
                stockTime={stockTime}
              />
            </div>

            <section className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 font-bold uppercase mb-2 border-b pb-1">MACD (12,26,9)</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-[10px] text-slate-400">DIFF</div>
                      <div className="text-sm font-mono font-bold">{indicators?.macd.diff.toFixed(3) || "0.000"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">DEA</div>
                      <div className="text-sm font-mono font-bold">{indicators?.macd.dea.toFixed(3) || "0.000"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">MACD</div>
                      <div className="text-sm font-mono font-bold text-blue-600">{indicators?.macd.bar.toFixed(3) || "0.000"}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 font-bold uppercase mb-2 border-b pb-1">KDJ (9,3,3)</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-[10px] text-slate-400">K</div>
                      <div className="text-sm font-mono font-bold text-amber-600">{indicators?.kdj.k.toFixed(2) || "50.00"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">D</div>
                      <div className="text-sm font-mono font-bold text-blue-600">{indicators?.kdj.d.toFixed(2) || "50.00"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">J</div>
                      <div className="text-sm font-mono font-bold text-purple-600">{indicators?.kdj.j.toFixed(2) || "50.00"}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 font-bold uppercase mb-2 border-b pb-1">RSI (6,12,24)</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-[10px] text-slate-400">RSI6</div>
                      <div className="text-sm font-mono font-bold text-red-600">{indicators?.rsi.rsi6.toFixed(2) || "50.00"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">RSI12</div>
                      <div className="text-sm font-mono font-bold text-amber-600">{indicators?.rsi.rsi12.toFixed(2) || "50.00"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">RSI24</div>
                      <div className="text-sm font-mono font-bold text-blue-600">{indicators?.rsi.rsi24.toFixed(2) || "50.00"}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 font-bold uppercase mb-2 border-b pb-1">BOLL (20,2)</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-[10px] text-slate-400">UP</div>
                      <div className="text-sm font-mono font-bold">{indicators?.boll.upper.toFixed(2) || "0.00"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">MID</div>
                      <div className="text-sm font-mono font-bold">{indicators?.boll.mid.toFixed(2) || "0.00"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">LOW</div>
                      <div className="text-sm font-mono font-bold">{indicators?.boll.lower.toFixed(2) || "0.00"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          <SimulationPage />
        )}
      </main>
    </div>
  );
}
