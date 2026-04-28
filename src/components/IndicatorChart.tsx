import React from 'react';
import { 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  Bar,
  Cell,
  ComposedChart
} from 'recharts';

export const IndicatorChart = ({ type, data, height = 120 }: { type: string, data: any[], height?: number }) => {
  const last = data[data.length - 1];
  
  const renderIndicator = () => {
    switch (type) {
      case 'MACD':
        return (
          <>
            <YAxis orientation="right" tick={{fontSize: 8, fill: '#94a3b8'}} axisLine={false} tickLine={false} width={30} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
            <Bar dataKey="macd.bar" name="MACD">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.macd.bar >= 0 ? '#ef4444' : '#22c55e'} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="macd.diff" stroke="#f59e0b" dot={false} strokeWidth={1} name="DIFF" />
            <Line type="monotone" dataKey="macd.dea" stroke="#3b82f6" dot={false} strokeWidth={1} name="DEA" />
          </>
        );
      case 'KDJ':
        return (
          <>
            <YAxis orientation="right" tick={{fontSize: 8, fill: '#94a3b8'}} axisLine={false} tickLine={false} width={30} domain={[0, 100]} />
            <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="kdj.k" stroke="#f59e0b" dot={false} strokeWidth={1} name="K" />
            <Line type="monotone" dataKey="kdj.d" stroke="#3b82f6" dot={false} strokeWidth={1} name="D" />
            <Line type="monotone" dataKey="kdj.j" stroke="#8b5cf6" dot={false} strokeWidth={1} name="J" />
          </>
        );
      case 'RSI':
        return (
          <>
            <YAxis orientation="right" tick={{fontSize: 8, fill: '#94a3b8'}} axisLine={false} tickLine={false} width={30} domain={[0, 100]} />
            <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="rsi.rsi6" stroke="#ef4444" dot={false} strokeWidth={1} name="RSI6" />
            <Line type="monotone" dataKey="rsi.rsi12" stroke="#f59e0b" dot={false} strokeWidth={1} name="RSI12" />
            <Line type="monotone" dataKey="rsi.rsi24" stroke="#3b82f6" dot={false} strokeWidth={1} name="RSI24" />
          </>
        );
      case 'VOLUME':
        return (
          <>
            <YAxis orientation="right" tick={{fontSize: 8, fill: '#94a3b8'}} axisLine={false} tickLine={false} width={30} domain={[0, 'auto']} />
            <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
            <Bar dataKey="volume" name="成交量">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.close >= entry.open ? '#ef4444' : '#22c55e'} />
              ))}
            </Bar>
          </>
        );
      case 'CCI':
        return (
          <>
            <YAxis orientation="right" tick={{fontSize: 8, fill: '#94a3b8'}} axisLine={false} tickLine={false} width={30} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="cci" stroke="#10b981" dot={false} strokeWidth={1} name="CCI" />
          </>
        );
      case 'WR':
        return (
          <>
            <YAxis orientation="right" tick={{fontSize: 8, fill: '#94a3b8'}} axisLine={false} tickLine={false} width={30} domain={[0, 100]} />
            <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="wr.wr10" stroke="#f59e0b" dot={false} strokeWidth={1} name="WR10" />
            <Line type="monotone" dataKey="wr.wr6" stroke="#3b82f6" dot={false} strokeWidth={1} name="WR6" />
          </>
        );
      case 'OBV':
        return (
          <>
            <YAxis orientation="right" tick={{fontSize: 8, fill: '#94a3b8'}} axisLine={false} tickLine={false} width={30} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="obv" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.1} name="OBV" />
          </>
        );
      case 'ATR':
        return (
          <>
            <YAxis orientation="right" tick={{fontSize: 8, fill: '#94a3b8'}} axisLine={false} tickLine={false} width={30} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="atr" stroke="#ef4444" dot={false} strokeWidth={1} name="ATR" />
          </>
        );
      default:
        return null;
    }
  };

  const getIndicatorValues = () => {
    if (!last) return null;
    switch (type) {
      case 'MACD': return `DIFF:${last.macd.diff.toFixed(2)} DEA:${last.macd.dea.toFixed(2)} MACD:${last.macd.bar.toFixed(2)}`;
      case 'KDJ': return `K:${last.kdj.k.toFixed(2)} D:${last.kdj.d.toFixed(2)} J:${last.kdj.j.toFixed(2)}`;
      case 'RSI': return `RSI6:${last.rsi.rsi6.toFixed(2)} RSI12:${last.rsi.rsi12.toFixed(2)} RSI24:${last.rsi.rsi24.toFixed(2)}`;
      case 'VOLUME': return `VOL:${(last.volume / 10000).toFixed(2)}万`;
      case 'CCI': return `CCI:${last.cci.toFixed(2)}`;
      case 'WR': return `WR10:${last.wr.wr10.toFixed(2)} WR6:${last.wr.wr6.toFixed(2)}`;
      case 'OBV': return `OBV:${(last.obv / 10000).toFixed(2)}万`;
      case 'ATR': return `ATR:${last.atr.toFixed(2)}`;
      default: return "";
    }
  };

  const localizedType = {
    'MACD': 'MACD',
    'KDJ': 'KDJ',
    'RSI': 'RSI',
    'VOLUME': '成交量',
    'CCI': 'CCI',
    'WR': 'WR',
    'OBV': 'OBV',
    'ATR': 'ATR'
  }[type] || type;

  return (
    <div className="w-full border-t border-slate-100 pt-2 mt-2" style={{ height }}>
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-[10px] font-bold text-slate-500">{localizedType}</span>
        <span className="text-[10px] font-mono text-slate-400">{getIndicatorValues()}</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="date" hide />
          {renderIndicator()}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
