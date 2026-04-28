import React, { useState } from 'react';
import { History, Play, Calculator } from 'lucide-react';
import { fetchStockData, calculateHistoryIndicators, StockData } from '../services/stockService';
import { cn, formatCurrency } from '../lib/utils';

export const SimulationModule = ({ symbol, stockName }: { symbol: string, stockName: string }) => {
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2026-04-12");
  const [initialCapital, setInitialCapital] = useState(100000);
  const [buyAmount, setBuyAmount] = useState(1000);
  const [sellAmount, setSellAmount] = useState(500);
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runSimulation = async () => {
    if (!symbol) return;
    setIsSimulating(true);
    try {
      const data = await fetchStockData(symbol, '240', 640, startDate, endDate);
      const history = data.history as StockData[];
      const filtered = history.filter(d => d.date >= startDate && d.date <= endDate);
      
      if (filtered.length === 0) {
        alert(`在选定日期范围 (${startDate} 至 ${endDate}) 内未找到历史数据。请尝试调整日期或检查股票代码。`);
        return;
      }
      if (filtered.length < 10) {
        alert("选定范围内数据过少（需至少10天数据），请扩大范围。");
        return;
      }

      const indicatorSeries = calculateHistoryIndicators(filtered);
      if (indicatorSeries.length === 0) {
        alert("指标计算失败，数据可能不完整。");
        return;
      }
      
      let cash = initialCapital;
      let shares = 0;
      let trades = [];

      for (let i = 1; i < indicatorSeries.length; i++) {
        const current = indicatorSeries[i];
        const price = filtered[i].close;
        const { k, d } = current.kdj;

        if (k > d && cash >= buyAmount) {
          const buyShares = buyAmount / price;
          shares += buyShares;
          cash -= buyAmount;
          trades.push({ type: 'BUY', date: current.date, price, amount: buyAmount });
        }
        else if (k < d && shares > 0) {
          const maxSellValue = shares * price;
          const actualSellValue = Math.min(maxSellValue, sellAmount);
          const sellShares = actualSellValue / price;
          
          shares -= sellShares;
          cash += actualSellValue;
          trades.push({ type: 'SELL', date: current.date, price, amount: actualSellValue });
        }
      }

      const finalPrice = filtered[filtered.length - 1].close;
      const finalValue = cash + (shares * finalPrice);
      const profit = finalValue - initialCapital;
      const profitPct = (profit / initialCapital) * 100;

      setResults({
        finalValue,
        profit,
        profitPct,
        tradeCount: trades.length,
        trades: trades.slice(-5)
      });
    } catch (error: any) {
      console.error("Simulation failed", error);
      alert(`模拟运行出错: ${error.message || "未知错误"}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <History className="text-blue-600" size={24} />
        <h2 className="text-xl font-bold">历史模拟交易 (KDJ 策略)</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">开始日期</label>
              <input 
                type="date" 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">结束日期</label>
              <input 
                type="date" 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">初始资金 (CNY)</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">买入金额 (K{'>'}D)</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">卖出金额 (K{'<'}D)</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <button 
            onClick={runSimulation}
            disabled={isSimulating || !symbol}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {isSimulating ? "模拟运行中..." : <><Play size={18} /> 开始模拟回测</>}
          </button>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col justify-center">
          {results ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-xs text-slate-500 font-bold uppercase mb-1">最终总资产</div>
                <div className="text-3xl font-mono font-bold text-slate-900">{formatCurrency(results.finalValue)}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">累计盈亏</div>
                  <div className={cn("text-lg font-mono font-bold", results.profit >= 0 ? "text-red-500" : "text-green-500")}>
                    {results.profit >= 0 ? "+" : ""}{results.profit.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">收益率</div>
                  <div className={cn("text-lg font-mono font-bold", results.profitPct >= 0 ? "text-red-500" : "text-green-500")}>
                    {results.profitPct >= 0 ? "+" : ""}{results.profitPct.toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] text-slate-400 font-bold uppercase flex justify-between">
                  <span>最近交易 (共 {results.tradeCount} 笔)</span>
                  <History size={12} />
                </div>
                {results.trades.map((t: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-100">
                    <span className={cn("font-bold", t.type === 'BUY' ? "text-red-500" : "text-green-500")}>{t.type}</span>
                    <span className="text-slate-500 font-mono">{t.date}</span>
                    <span className="font-mono font-bold">{t.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 space-y-2">
              <Calculator size={48} className="mx-auto opacity-20" />
              <p className="text-sm">设置参数并点击左侧按钮运行模拟</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
