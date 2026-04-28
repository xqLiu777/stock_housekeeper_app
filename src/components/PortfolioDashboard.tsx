import React, { useState } from 'react';
import { 
  Wallet, 
  Settings, 
  Plus, 
  Trash2, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Edit2,
  Check,
  X,
  BrainCircuit
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Holding {
  id: string;
  symbol: string;
  name: string;
  costPrice: number;
  currentPrice: number;
  quantity: number;
}

interface PortfolioDashboardProps {
  balance: number;
  setBalance: (v: number) => void;
  principles: string;
  setPrinciples: (v: string) => void;
  assistantName: string;
  setAssistantName: (v: string) => void;
  holdings: Holding[];
  updateHolding: (id: string, updates: Partial<Holding>) => void;
  removeHolding: (id: string) => void;
  addHolding: (data?: any) => void;
  updateHoldingsPrices: () => void;
  isUpdatingHoldings: boolean;
  updateProfile: (newBalance?: number, newPrinciples?: string, newAssistantName?: string) => void;
}

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({
  balance,
  setBalance,
  principles,
  setPrinciples,
  assistantName,
  setAssistantName,
  holdings,
  updateHolding,
  removeHolding,
  addHolding,
  updateHoldingsPrices,
  isUpdatingHoldings,
  updateProfile
}) => {
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [tempBalance, setTempBalance] = useState(balance);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isPrinciplesModalOpen, setIsPrinciplesModalOpen] = useState(false);
  const [newHolding, setNewHolding] = useState<Partial<Holding>>({
    quantity: 100,
    costPrice: 0,
    currentPrice: 0
  });

  const totalMarketValue = holdings.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0);
  const totalAssets = balance + totalMarketValue;
  const positionPct = totalAssets > 0 ? (totalMarketValue / totalAssets) * 100 : 0;
  const totalProfit = holdings.reduce((sum, h) => sum + (h.currentPrice - h.costPrice) * h.quantity, 0);
  const totalProfitPct = totalMarketValue > 0 ? (totalProfit / (totalMarketValue - totalProfit)) * 100 : 0;

  const handleBalanceSubmit = () => {
    setBalance(tempBalance);
    setIsEditingBalance(false);
    updateProfile(tempBalance);
  };

  const handleSearchStock = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`/api/stock/${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else {
        setNewHolding(prev => ({
          ...prev,
          symbol: data.symbol,
          name: data.name,
          currentPrice: data.current,
          costPrice: data.current // Default cost to current
        }));
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveNewHolding = () => {
    if (!newHolding.symbol || !newHolding.name) return;
    addHolding({
      symbol: newHolding.symbol,
      name: newHolding.name,
      quantity: newHolding.quantity || 100,
      costPrice: newHolding.costPrice || 0,
      currentPrice: newHolding.currentPrice || 0
    });
    setIsAdding(false);
    setSearchQuery('');
    setNewHolding({ quantity: 100, costPrice: 0, currentPrice: 0 });
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">总资产 (CNY)</span>
            <Wallet size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-900">
            {totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-sm text-slate-400 ml-2 font-normal">仓位: {positionPct.toFixed(1)}%</span>
          </div>
          <div className={cn(
            "text-xs font-bold mt-1 flex items-center gap-1",
            totalProfit >= 0 ? "text-red-500" : "text-green-500"
          )}>
            {totalProfit >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {totalProfit >= 0 ? "+" : ""}{totalProfit.toFixed(2)} ({totalProfitPct.toFixed(2)}%)
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">账户余额</span>
            <div className="flex items-center gap-1 text-[10px] text-blue-500 font-bold">
              <Edit2 size={10} />
              点击修改
            </div>
          </div>
          {isEditingBalance ? (
            <input 
              type="number"
              autoFocus
              step="0.01"
              min="0"
              className="text-2xl font-mono font-bold text-slate-900 bg-slate-50 rounded px-2 w-full outline-none focus:ring-2 focus:ring-blue-500"
              value={tempBalance}
              onChange={(e) => setTempBalance(Math.max(0, Number(e.target.value)))}
              onBlur={handleBalanceSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleBalanceSubmit()}
            />
          ) : (
            <div 
              onClick={() => {
                setTempBalance(balance);
                setIsEditingBalance(true);
              }}
              className="text-2xl font-mono font-bold text-slate-900 cursor-pointer hover:bg-slate-50 rounded transition-colors px-1 -ml-1"
            >
              {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
          <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold">可用现金</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">交易管家设置</span>
            <BrainCircuit size={16} className="text-blue-500" />
          </div>
          <button 
            onClick={() => setIsPrinciplesModalOpen(true)}
            className="w-full text-left text-xs bg-slate-50 hover:bg-slate-100 rounded-lg p-3 transition-colors"
          >
            <div className="font-bold text-slate-700 mb-1">管家名称: {assistantName}</div>
            <div className="text-slate-500 truncate">点击设置原则与名称...</div>
          </button>
        </div>
      </div>

      {/* Principles Modal */}
      {isPrinciplesModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">交易管家设置</h3>
              <button onClick={() => setIsPrinciplesModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">管家名称</label>
              <input 
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">交易原则 (每行一条)</label>
              <textarea 
                className="w-full h-40 text-sm bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="例如: 当KDJ超过80时提醒我卖出..."
                value={principles}
                onChange={(e) => setPrinciples(e.target.value)}
              />
            </div>

            <button 
              onClick={() => {
                updateProfile(undefined, principles, assistantName);
                setIsPrinciplesModalOpen(false);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors"
            >
              保存设置
            </button>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={20} />
            <h2 className="text-lg font-bold text-slate-900">持仓明细</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={updateHoldingsPrices}
              disabled={isUpdatingHoldings}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all",
                isUpdatingHoldings && "opacity-50 cursor-not-allowed"
              )}
            >
              <RefreshCw size={14} className={cn(isUpdatingHoldings && "animate-spin")} />
              刷新现价
            </button>
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              <Plus size={14} />
              添加持仓
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">股票名称/代码</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">成本价</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">当前价</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">持股数</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">市值</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">盈亏</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isAdding && (
                <tr className="bg-blue-50/30 animate-in fade-in slide-in-from-top-1 duration-200">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        placeholder="输入名称或代码..."
                        className="w-32 bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchStock()}
                      />
                      <button 
                        onClick={handleSearchStock}
                        disabled={isSearching}
                        className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      >
                        {isSearching ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                      </button>
                    </div>
                    {newHolding.name && (
                      <div className="mt-1">
                        <div className="font-bold text-blue-600 text-xs">{newHolding.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{newHolding.symbol}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number"
                      className="w-20 bg-white border border-slate-200 rounded px-2 py-1 font-mono font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                      value={newHolding.costPrice}
                      onChange={(e) => setNewHolding({ ...newHolding, costPrice: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-400">
                    {newHolding.currentPrice?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number"
                      className="w-20 bg-white border border-slate-200 rounded px-2 py-1 font-mono font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                      value={newHolding.quantity}
                      onChange={(e) => setNewHolding({ ...newHolding, quantity: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-400">
                    {((newHolding.currentPrice || 0) * (newHolding.quantity || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-300 font-mono font-bold">--</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={handleSaveNewHolding}
                        disabled={!newHolding.symbol}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all disabled:opacity-30"
                        title="保存"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        onClick={() => setIsAdding(false)}
                        className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-all"
                        title="取消"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {holdings.length > 0 ? holdings.map((h) => {
                const marketValue = h.currentPrice * h.quantity;
                const profit = (h.currentPrice - h.costPrice) * h.quantity;
                const profitPct = ((h.currentPrice - h.costPrice) / h.costPrice) * 100;
                const isUp = profit >= 0;

                return (
                  <tr key={h.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{h.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{h.symbol}</div>
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="number"
                        className="w-20 bg-transparent hover:bg-white focus:bg-white border-none rounded px-1 py-0.5 font-mono font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        value={h.costPrice}
                        onChange={(e) => updateHolding(h.id, { costPrice: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-600">
                      {h.currentPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="number"
                        className="w-20 bg-transparent hover:bg-white focus:bg-white border-none rounded px-1 py-0.5 font-mono font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        value={h.quantity}
                        onChange={(e) => updateHolding(h.id, { quantity: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {marketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn("font-mono font-bold", isUp ? "text-red-500" : "text-green-500")}>
                        {isUp ? "+" : ""}{profit.toFixed(2)}
                      </div>
                      <div className={cn("text-[10px] font-bold", isUp ? "text-red-500" : "text-green-500")}>
                        {isUp ? "+" : ""}{profitPct.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => removeHolding(h.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 italic text-sm">
                    暂无持仓数据，点击“添加持仓”开始管理您的投资组合
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
