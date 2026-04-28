import axios from 'axios';

// Note: In a real app, we'd use a backend to proxy these requests to avoid CORS and hide keys.
// For this demo, we'll simulate the data fetching logic.
// AkShare is a Python library, so we'd typically need a Python backend.
// We will mock the data fetching to demonstrate the UI and AI integration.

export interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  macd: { diff: number; dea: number; bar: number };
  kdj: { k: number; d: number; j: number };
  boll: { upper: number; mid: number; lower: number };
  rsi: { rsi6: number; rsi12: number; rsi24: number };
  cci: number;
  wr: { wr10: number; wr6: number };
  obv: number;
  vwap: number;
  atr: number;
  volumeRatio: number;
  turnoverRate: number;
  ma: { ma5: number; ma10: number; ma20: number; ma60: number; ma120: number };
  ema: { ema20: number; ema60: number; ema120: number };
  volume: number;
  open?: number;
  close?: number;
}

export async function fetchStockData(symbol: string, scale: string = '240', datalen: number = 100, startDate: string = '', endDate: string = ''): Promise<any> {
  try {
    const response = await axios.get(`/api/stock/${encodeURIComponent(symbol)}`, {
      params: { scale, datalen, startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching real data for ${symbol}:`, error);
    throw error;
  }
}

export function calculateIndicators(data: StockData[]): TechnicalIndicators {
  const history = calculateHistoryIndicators(data);
  if (history.length === 0) {
    return {
      macd: { diff: 0, dea: 0, bar: 0 },
      kdj: { k: 50, d: 50, j: 50 },
      boll: { upper: 0, mid: 0, lower: 0 },
      rsi: { rsi6: 50, rsi12: 50, rsi24: 50 },
      cci: 0,
      wr: { wr10: 0, wr6: 0 },
      obv: 0,
      vwap: 0,
      atr: 0,
      volumeRatio: 1,
      turnoverRate: 0,
      ma: { ma5: 0, ma10: 0, ma20: 0, ma60: 0, ma120: 0 },
      ema: { ema20: 0, ema60: 0, ema120: 0 },
      volume: 0
    };
  }
  return history[history.length - 1];
}

function calculateEMAValue(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calculateMA(data: number[], period: number): number[] {
  const ma = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= period) {
      sum -= data[i - period];
    }
    if (i < period - 1) {
      ma.push(data[i]);
    } else {
      ma.push(sum / period);
    }
  }
  return ma;
}

function calculateRSI(data: number[], period: number): number[] {
  const rsi = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;

    if (i < period) {
      rsi.push(50);
    } else {
      if (i > period) {
        const prevDiff = data[i - period] - data[i - period - 1];
        if (prevDiff >= 0) gains -= prevDiff;
        else losses -= (-prevDiff);
      }
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }
  rsi.unshift(50);
  return rsi;
}

export function calculateHistoryIndicators(data: StockData[]): (TechnicalIndicators & { date: string })[] {
  if (data.length === 0) return [];

  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const volumes = data.map(d => d.volume);

  // MACD
  const ema12 = calculateEMAValue(closes, 12);
  const ema26 = calculateEMAValue(closes, 26);
  const diffs = ema12.map((val, idx) => val - ema26[idx]);
  const deas = calculateEMAValue(diffs, 9);

  // RSI
  const rsi6 = calculateRSI(closes, 6);
  const rsi12 = calculateRSI(closes, 12);
  const rsi24 = calculateRSI(closes, 24);

  // MA
  const ma5 = calculateMA(closes, 5);
  const ma10 = calculateMA(closes, 10);
  const ma20 = calculateMA(closes, 20);
  const ma60 = calculateMA(closes, 60);
  const ma120 = calculateMA(closes, 120);

  // EMA
  const ema20 = calculateEMAValue(closes, 20);
  const ema60 = calculateEMAValue(closes, 60);
  const ema120 = calculateEMAValue(closes, 120);

  const results: (TechnicalIndicators & { date: string })[] = [];
  let lastK = 50;
  let lastD = 50;
  let cumulativeOBV = 0;
  let cumulativePV = 0;
  let cumulativeV = 0;
  let trSum = 0;

  for (let i = 0; i < data.length; i++) {
    // KDJ
    if (i >= 8) {
      const last9 = data.slice(i - 8, i + 1);
      const high9 = Math.max(...last9.map(d => d.high));
      const low9 = Math.min(...last9.map(d => d.low));
      const rsv = high9 === low9 ? 50 : ((closes[i] - low9) / (high9 - low9)) * 100;
      lastK = (2 / 3) * lastK + (1 / 3) * rsv;
      lastD = (2 / 3) * lastD + (1 / 3) * lastK;
    }
    const k = lastK;
    const d = lastD;
    const j = 3 * k - 2 * d;

    // BOLL
    let upper = closes[i], mid = closes[i], lower = closes[i];
    if (i >= 19) {
      const last20 = closes.slice(i - 19, i + 1);
      mid = last20.reduce((a, b) => a + b, 0) / 20;
      const std = Math.sqrt(last20.map(x => Math.pow(x - mid, 2)).reduce((a, b) => a + b, 0) / 20);
      upper = mid + 2 * std;
      lower = mid - 2 * std;
    }

    // CCI
    let cci = 0;
    if (i >= 13) {
      const tp = (highs[i] + lows[i] + closes[i]) / 3;
      const last14tp = [];
      for(let j=i-13; j<=i; j++) last14tp.push((highs[j] + lows[j] + closes[j]) / 3);
      const maTP = last14tp.reduce((a,b) => a+b, 0) / 14;
      const md = last14tp.map(t => Math.abs(t - maTP)).reduce((a,b) => a+b, 0) / 14;
      cci = md === 0 ? 0 : (tp - maTP) / (0.015 * md);
    }

    // WR
    let wr10 = 0, wr6 = 0;
    if (i >= 9) {
      const last10 = data.slice(i - 9, i + 1);
      const h10 = Math.max(...last10.map(d => d.high));
      const l10 = Math.min(...last10.map(d => d.low));
      wr10 = Math.abs(h10 - l10) < 0.0001 ? 0 : ((h10 - closes[i]) / (h10 - l10)) * 100;
    }
    if (i >= 5) {
      const last6 = data.slice(i - 5, i + 1);
      const h6 = Math.max(...last6.map(d => d.high));
      const l6 = Math.min(...last6.map(d => d.low));
      wr6 = Math.abs(h6 - l6) < 0.0001 ? 0 : ((h6 - closes[i]) / (h6 - l6)) * 100;
    }

    // OBV
    if (i > 0) {
      if (closes[i] > closes[i - 1]) cumulativeOBV += volumes[i];
      else if (closes[i] < closes[i - 1]) cumulativeOBV -= volumes[i];
    }

    // VWAP
    cumulativePV += closes[i] * volumes[i];
    cumulativeV += volumes[i];
    const vwap = cumulativeV === 0 ? closes[i] : cumulativePV / cumulativeV;

    // ATR
    let tr = 0;
    if (i > 0) {
      tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
    } else {
      tr = highs[i] - lows[i];
    }
    trSum += tr;
    const atr = trSum / (i + 1);

    // Volume Ratio (量比) - Simplified: current volume / avg volume of last 5 days
    let volumeRatio = 1;
    if (i >= 5) {
      const last5Volumes = volumes.slice(i - 5, i);
      const avgVolume = last5Volumes.reduce((a, b) => a + b, 0) / 5;
      volumeRatio = avgVolume === 0 ? 1 : volumes[i] / avgVolume;
    }

    // Turnover Rate (换手率) - Estimated since we don't have total shares
    // In a real app, this would come from the API. Here we use a proxy: (volume / avgVolume) * volatility
    const turnoverRate = (volumeRatio * (Math.abs(data[i].high - data[i].low) / (data[i].close || 1))) * 10;

    results.push({
      date: data[i].date,
      open: data[i].open,
      close: data[i].close,
      macd: { diff: diffs[i], dea: deas[i], bar: (diffs[i] - deas[i]) * 2 },
      kdj: { k, d, j },
      boll: { upper, mid, lower },
      rsi: { rsi6: rsi6[i], rsi12: rsi12[i], rsi24: rsi24[i] },
      cci,
      wr: { wr10, wr6 },
      obv: cumulativeOBV,
      vwap,
      atr,
      volumeRatio,
      turnoverRate: isNaN(turnoverRate) ? 0 : turnoverRate,
      ma: { ma5: ma5[i], ma10: ma10[i], ma20: ma20[i], ma60: ma60[i], ma120: ma120[i] },
      ema: { ema20: ema20[i], ema60: ema60[i], ema120: ema120[i] },
      volume: volumes[i]
    });
  }

  return results;
}
