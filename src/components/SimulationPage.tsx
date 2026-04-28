import React, { useState, useEffect } from 'react';
import { Play, Brain, Trash2, Plus, Info } from 'lucide-react';
import { fetchStockData, StockData, calculateHistoryIndicators } from '../services/stockService';
import { cn, formatCurrency } from '../lib/utils';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter } from 'recharts';
import { GoogleGenAI, Type } from "@google/genai";

interface Condition {
  indicator: string;
  operator: string;
  value: number;
}

interface Rule {
  id: string;
  name: string;
  action: 'BUY' | 'SELL';
  amount: number;
  logic: 'AND' | 'OR';
  conditions: Condition[];
}

export const SimulationPage = () => {
  useEffect(() => {
    console.log("SimulationPage mounted");
  }, []);

  const [symbol, setSymbol] = useState("600000");
  const [stockName, setStockName] = useState("浦发银行");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2026-04-12");
  const [initialCapital, setInitialCapital] = useState(100000);
  const [rules, setRules] = useState<Rule[]>([
    { 
      id: '1', 
      name: '默认买入规则', 
      action: 'BUY', 
      amount: 10000, 
      logic: 'AND', 
      conditions: [{ indicator: 'K', operator: '>', value: 20 }] 
    }
  ]);
  const [naturalLanguage, setNaturalLanguage] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [tradePoints, setTradePoints] = useState<any[]>([]);

  const addRule = () => {
    setRules([...rules, { 
      id: Math.random().toString(36).substr(2, 9),
      name: `规则 ${rules.length + 1}`,
      action: 'BUY',
      amount: 10000,
      logic: 'AND',
      conditions: [{ indicator: 'K', operator: '>', value: 50 }]
    }]);
  };

  const updateRule = (index: number, field: keyof Rule, value: any) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const addCondition = (ruleIndex: number) => {
    const newRules = [...rules];
    newRules[ruleIndex].conditions.push({ indicator: 'K', operator: '>', value: 50 });
    setRules(newRules);
  };

  const updateCondition = (ruleIndex: number, condIndex: number, field: keyof Condition, value: any) => {
    const newRules = [...rules];
    newRules[ruleIndex].conditions[condIndex] = { ...newRules[ruleIndex].conditions[condIndex], [field]: value };
    setRules(newRules);
  };

  const removeCondition = (ruleIndex: number, condIndex: number) => {
    const newRules = [...rules];
    newRules[ruleIndex].conditions = newRules[ruleIndex].conditions.filter((_, i) => i !== condIndex);
    setRules(newRules);
  };

  const parseNaturalLanguage = async () => {
    if (!naturalLanguage.trim()) return;
    setIsParsing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `将以下自然语言描述的股票交易规则解析为结构化JSON。
        用户输入: "${naturalLanguage}"
        
        支持的指标: K, D, J, MACD_DIFF, MACD_DEA, MACD_BAR, RSI6, RSI12, RSI24, BOLL_UP, BOLL_MID, BOLL_LOW, CCI, WR10, WR6, OBV, VWAP, ATR, VOLUME_RATIO, TURNOVER_RATE, AVG_COST, CLOSE, OPEN, HIGH, LOW, VOLUME
        支持的操作符: >, <, >=, <=, ==
        支持的动作: BUY, SELL
        支持的逻辑: AND, OR
        
        返回格式必须是 Rule 对象的数组。`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                action: { type: Type.STRING, enum: ["BUY", "SELL"] },
                amount: { type: Type.NUMBER },
                logic: { type: Type.STRING, enum: ["AND", "OR"] },
                conditions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      indicator: { type: Type.STRING },
                      operator: { type: Type.STRING },
                      value: { type: Type.NUMBER }
                    },
                    required: ["indicator", "operator", "value"]
                  }
                }
              },
              required: ["id", "name", "action", "amount", "logic", "conditions"]
            }
          }
        }
      });

      const parsedRules = JSON.parse(response.text || "[]");
      if (parsedRules.length > 0) {
        setRules([...rules, ...parsedRules]);
        setNaturalLanguage("");
      }
    } catch (error) {
      console.error("Failed to parse rules", error);
      alert("解析规则失败，请尝试更清晰的描述。");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSearch = async () => {
    if (!symbol) return null;
    setIsSimulating(true);
    console.log(`Searching for ${symbol} from ${startDate} to ${endDate}...`);
    try {
      const data = await fetchStockData(symbol, '240', 640, startDate, endDate);
      console.log("API Response data:", data);
      
      let history = data.history as StockData[];
      if (!history || history.length === 0) {
        console.warn("No history returned from API, generating mock data for demo...");
        // Mock data generation for demo purposes if API fails
        history = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        let current = new Date(start);
        let price = 10;
        while (current <= end) {
          if (current.getDay() !== 0 && current.getDay() !== 6) {
            price += (Math.random() - 0.5) * 0.5;
            history.push({
              date: current.toISOString().split('T')[0],
              open: price,
              high: price + 0.2,
              low: price - 0.2,
              close: price,
              volume: Math.floor(Math.random() * 1000000)
            });
          }
          current.setDate(current.getDate() + 1);
        }
      }

      const filtered = history.filter(d => d.date >= startDate && d.date <= endDate);
      console.log(`Filtered data: ${filtered.length} points.`);
      
      if (filtered.length < 2) {
        console.error("Insufficient data points after filtering.");
        alert("数据不足，请调整日期范围。");
        setChartData([]);
        return null;
      }

      setChartData(filtered);
      setStockName(data.name || symbol);
      return filtered;
    } catch (error: any) {
      console.error("Search failed", error);
      alert(`搜索出错: ${error.message || "未知错误"}`);
      return null;
    } finally {
      setIsSimulating(false);
    }
  };

  const runSimulation = async () => {
    console.log("Starting simulation...");
    let currentData = chartData;
    
    if (currentData.length < 2) {
      console.log("No chart data, fetching...");
      const fetchedData = await handleSearch();
      if (!fetchedData || fetchedData.length < 2) {
        console.log("Still no data after search.");
        return;
      }
      currentData = fetchedData;
    }
    
    setIsSimulating(true);
    setResults(null); 
    setTradePoints([]); 
    
    try {
      if (!currentData || currentData.length === 0) {
        throw new Error("没有可用的股票数据进行模拟");
      }

      // Calculate all indicators for the history
      const indicatorsHistory = calculateHistoryIndicators(currentData);

      const startPrice = currentData[0].close;
      const endPrice = currentData[currentData.length - 1].close;
      const buyAndHoldReturn = ((endPrice - startPrice) / startPrice) * 100;
      const buyAndHoldValue = initialCapital * (1 + buyAndHoldReturn / 100);

      let cash = initialCapital;
      let shares = 0;
      let totalCost = 0;
      const trades = [];

      console.log(`Simulating with ${currentData.length} data points...`);

      for (let i = 0; i < currentData.length; i++) {
        const dayData = currentData[i];
        const indicators = indicatorsHistory[i];
        const avgCost = shares > 0 ? totalCost / shares : 0;

        // Map indicator names to values
        const getValue = (name: string) => {
          switch (name) {
            case 'K': return indicators.kdj.k;
            case 'D': return indicators.kdj.d;
            case 'J': return indicators.kdj.j;
            case 'MACD_DIFF': return indicators.macd.diff;
            case 'MACD_DEA': return indicators.macd.dea;
            case 'MACD_BAR': return indicators.macd.bar;
            case 'RSI6': return indicators.rsi.rsi6;
            case 'RSI12': return indicators.rsi.rsi12;
            case 'RSI24': return indicators.rsi.rsi24;
            case 'BOLL_UP': return indicators.boll.upper;
            case 'BOLL_MID': return indicators.boll.mid;
            case 'BOLL_LOW': return indicators.boll.lower;
            case 'CCI': return indicators.cci;
            case 'WR10': return indicators.wr.wr10;
            case 'WR6': return indicators.wr.wr6;
            case 'OBV': return indicators.obv;
            case 'VWAP': return indicators.vwap;
            case 'ATR': return indicators.atr;
            case 'VOLUME_RATIO': return indicators.volumeRatio;
            case 'TURNOVER_RATE': return indicators.turnoverRate;
            case 'AVG_COST': return avgCost;
            case 'CLOSE': return dayData.close;
            case 'OPEN': return dayData.open;
            case 'HIGH': return dayData.high;
            case 'LOW': return dayData.low;
            case 'VOLUME': return dayData.volume;
            default: return 0;
          }
        };

        const evaluateCondition = (cond: Condition) => {
          const val = getValue(cond.indicator);
          switch (cond.operator) {
            case '>': return val > cond.value;
            case '<': return val < cond.value;
            case '>=': return val >= cond.value;
            case '<=': return val <= cond.value;
            case '==': return val === cond.value;
            default: return false;
          }
        };

        for (const rule of rules) {
          const results = rule.conditions.map(evaluateCondition);
          const isTriggered = rule.logic === 'AND' 
            ? results.every(r => r) 
            : results.some(r => r);

          if (isTriggered) {
            if (rule.action === 'BUY' && cash >= dayData.close) {
              // 动态现金余额限制：买入金额不能超过当前可用现金
              const actualBuyAmount = Math.min(rule.amount, cash);
              const boughtShares = Math.floor(actualBuyAmount / dayData.close);
              if (boughtShares > 0) {
                const cost = boughtShares * dayData.close;
                shares += boughtShares;
                cash -= cost;
                totalCost += cost;
                trades.push({ 
                  date: dayData.date, 
                  price: dayData.close, 
                  action: 'BUY', 
                  amount: cost,
                  shares: boughtShares
                });
                break; // 每天仅执行一次操作
              }
            } else if (rule.action === 'SELL' && shares > 0) {
              // 卖出逻辑：将卖出所得资金回笼至现金余额
              const sharesToSell = Math.min(shares, Math.floor(rule.amount / dayData.close));
              
              if (sharesToSell > 0) {
                const sellProceeds = sharesToSell * dayData.close;
                const costOfSoldShares = (totalCost / shares) * sharesToSell;
                cash += sellProceeds;
                shares -= sharesToSell;
                totalCost -= costOfSoldShares;
                trades.push({ 
                  date: dayData.date, 
                  price: dayData.close, 
                  action: 'SELL', 
                  amount: sellProceeds,
                  shares: sharesToSell
                });
                break;
              }
            }
          }
        }
      }
      
      const finalTrades = trades;
      setTradePoints(finalTrades);
      
      // Merge trade signals into chartData for perfect alignment
      const mergedData = currentData.map(day => {
        const dayTrades = finalTrades.filter(t => t.date === day.date);
        return {
          ...day,
          buyPrice: dayTrades.find(t => t.action === 'BUY')?.price || null,
          sellPrice: dayTrades.find(t => t.action === 'SELL')?.price || null,
        };
      });
      setChartData(mergedData);

      console.log("Simulation complete. Trade points count:", finalTrades.length);
      
      const finalValue = cash + (shares * endPrice);
      const strategyReturn = ((finalValue - initialCapital) / initialCapital) * 100;

      setResults({
        buyAndHoldValue,
        buyAndHoldReturn,
        finalValue,
        strategyReturn,
        finalCash: cash,
        finalPositionValue: shares * endPrice
      });
    } catch (error: any) {
      console.error("Simulation failed", error);
      alert(`模拟运行出错: ${error.message || "未知错误"}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="bg-yellow-100 p-2 text-[10px] text-yellow-800 rounded mb-4">
        Debug: SimulationPage Rendered | Symbol: {symbol} | Data Points: {chartData.length}
      </div>
      <h1 className="text-2xl font-bold">模拟股票交易</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">股票名称/代码</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="flex-grow min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="输入名称或代码"
                />
                <button onClick={handleSearch} className="shrink-0 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold">搜索</button>
              </div>
              <div className="text-xs text-slate-400 mt-1 truncate">当前：{stockName}</div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">初始资金</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">开始日期</label>
              <input type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">结束日期</label>
              <input type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" />
                AI 规则设定 (自然语言)
              </h2>
            </div>
            <div className="relative">
              <textarea
                value={naturalLanguage}
                onChange={(e) => setNaturalLanguage(e.target.value)}
                placeholder="输入交易逻辑，例如：'当K线小于20且J线小于0时买入10000元；当收盘价大于成本价的10%时卖出全部'..."
                className="w-full h-20 p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none text-xs"
              />
              <button
                onClick={parseNaturalLanguage}
                disabled={isParsing || !naturalLanguage.trim()}
                className="absolute bottom-2 right-2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {isParsing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Brain className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-500 uppercase">当前生效规则 ({rules.length})</label>
              <button onClick={addRule} className="text-[10px] text-blue-600 font-bold hover:underline">+ 添加手动规则</button>
            </div>
            <div className="space-y-3">
              {rules.map((rule, rIdx) => (
                <div key={rule.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={rule.name}
                        onChange={(e) => updateRule(rIdx, 'name', e.target.value)}
                        className="bg-transparent font-bold text-xs border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none"
                      />
                      <select
                        value={rule.action}
                        onChange={(e) => updateRule(rIdx, 'action', e.target.value)}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold",
                          rule.action === 'BUY' ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                        )}
                      >
                        <option value="BUY">买入</option>
                        <option value="SELL">卖出</option>
                      </select>
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="text-slate-400">金额:</span>
                        <input
                          type="number"
                          value={rule.amount}
                          onChange={(e) => updateRule(rIdx, 'amount', Number(e.target.value))}
                          className="w-16 bg-white border border-slate-200 rounded px-1 outline-none"
                        />
                      </div>
                    </div>
                    <button onClick={() => removeRule(rIdx)} className="text-slate-400 hover:text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="pl-3 border-l-2 border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">逻辑:</span>
                      <select
                        value={rule.logic}
                        onChange={(e) => updateRule(rIdx, 'logic', e.target.value)}
                        className="text-[10px] bg-white border border-slate-200 rounded px-1"
                      >
                        <option value="AND">且 (AND)</option>
                        <option value="OR">或 (OR)</option>
                      </select>
                    </div>

                    {rule.conditions.map((cond, cIdx) => (
                      <div key={cIdx} className="flex items-center gap-2">
                        <select
                          value={cond.indicator}
                          onChange={(e) => updateCondition(rIdx, cIdx, 'indicator', e.target.value)}
                          className="text-[10px] bg-white border border-slate-200 rounded p-1 flex-1"
                        >
                          <optgroup label="KDJ">
                            <option value="K">K线</option>
                            <option value="D">D线</option>
                            <option value="J">J线</option>
                          </optgroup>
                          <optgroup label="MACD">
                            <option value="MACD_DIFF">DIFF</option>
                            <option value="MACD_DEA">DEA</option>
                            <option value="MACD_BAR">MACD柱</option>
                          </optgroup>
                          <optgroup label="价格/成本">
                            <option value="CLOSE">收盘价</option>
                            <option value="AVG_COST">持仓成本</option>
                          </optgroup>
                          <optgroup label="其他">
                            <option value="VOLUME_RATIO">量比</option>
                            <option value="TURNOVER_RATE">换手率</option>
                            <option value="RSI6">RSI6</option>
                            <option value="CCI">CCI</option>
                          </optgroup>
                        </select>
                        <select
                          value={cond.operator}
                          onChange={(e) => updateCondition(rIdx, cIdx, 'operator', e.target.value)}
                          className="text-[10px] bg-white border border-slate-200 rounded p-1"
                        >
                          <option value=">">&gt;</option>
                          <option value="<">&lt;</option>
                          <option value=">=">&gt;=</option>
                          <option value="<=">&lt;=</option>
                          <option value="==">==</option>
                        </select>
                        <input
                          type="number"
                          value={cond.value}
                          onChange={(e) => updateCondition(rIdx, cIdx, 'value', Number(e.target.value))}
                          className="text-[10px] bg-white border border-slate-200 rounded p-1 w-16"
                        />
                        {rule.conditions.length > 1 && (
                          <button onClick={() => removeCondition(rIdx, cIdx)} className="text-slate-400 hover:text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => addCondition(rIdx)} className="text-[10px] text-blue-500 hover:underline">+ 添加条件</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={runSimulation}
            disabled={isSimulating}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {isSimulating ? "模拟运行中..." : <><Play size={18} /> 开始模拟回测</>}
          </button>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart 
              key={`chart-${chartData.length}-${tradePoints.length}`}
              data={chartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} xAxisId={0} />
              <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend />
              <Line type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} dot={false} name="收盘价" />
              <Scatter 
                name="买入" 
                dataKey="buyPrice" 
                fill="#ef4444" 
                xAxisId={0}
                shape="circle"
              />
              <Scatter 
                name="卖出" 
                dataKey="sellPrice" 
                fill="#22c55e" 
                xAxisId={0}
                shape="circle"
              />
            </ComposedChart>
          </ResponsiveContainer>

          {results && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border-t pt-6">
                <div className="text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">策略最终资产</div>
                  <div className="text-xl font-mono font-bold text-slate-900">{formatCurrency(results.finalValue)}</div>
                  <div className={cn("text-sm font-bold", results.strategyReturn >= 0 ? "text-red-500" : "text-green-500")}>
                    {results.strategyReturn.toFixed(2)}%
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">可用现金余额</div>
                  <div className="text-xl font-mono font-bold text-blue-600">{formatCurrency(results.finalCash)}</div>
                  <div className="text-[10px] text-slate-400">可用于再次买入</div>
                </div>

                <div className="text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">期末持仓市值</div>
                  <div className="text-xl font-mono font-bold text-slate-700">{formatCurrency(results.finalPositionValue)}</div>
                  <div className="text-[10px] text-slate-400">持股数量 × 期末价</div>
                </div>

                <div className="text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">对比：买入并持有</div>
                  <div className="text-xl font-mono font-bold text-slate-700">{formatCurrency(results.buyAndHoldValue)}</div>
                  <div className={cn("text-sm font-bold", results.buyAndHoldReturn >= 0 ? "text-red-500" : "text-green-500")}>
                    {results.buyAndHoldReturn.toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t pt-6">
                <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">交易日志 (文本输出)</h3>
                <div className="bg-slate-50 rounded-xl p-4 max-h-60 overflow-y-auto border border-slate-100">
                  {tradePoints.length > 0 ? (
                    <div className="space-y-2">
                      {tradePoints.map((trade, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] font-mono py-1 border-b border-slate-200 last:border-0">
                          <span className="text-slate-500 w-20">{trade.date}</span>
                          <span className={cn("font-bold px-2 py-0.5 rounded w-12 text-center", trade.action === 'BUY' ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600")}>
                            {trade.action === 'BUY' ? '买入' : '卖出'}
                          </span>
                          <span className="text-slate-700 w-24">价格: {trade.price.toFixed(2)}</span>
                          <span className="text-slate-700 w-20">数量: {trade.shares}</span>
                          <span className="text-slate-900 font-bold w-32 text-right">金额: {formatCurrency(trade.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 text-xs py-4">暂无交易记录，请检查规则触发条件。</div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
