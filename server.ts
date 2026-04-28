import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to fetch real stock data from Sina Finance
  // Sina API example: http://hq.sinajs.cn/list=sh601012
    app.get("/api/stock/:symbol", async (req, res) => {
    try {
      let input = decodeURIComponent(req.params.symbol).trim();
      let symbol = input.toLowerCase();
      const scale = req.query.scale || '240';
      const datalen = req.query.datalen || '100';
      const startDate = req.query.startDate || '';
      const endDate = req.query.endDate || '';
      
      // Popular stock mapping for reliability
      const commonMapping: Record<string, string> = {
        "贵州茅台": "sh600519",
        "隆基绿能": "sh601012",
        "宁德时代": "sz300750",
        "招商银行": "sh600036",
        "中国平安": "sh601318",
        "腾讯控股": "hk00700",
        "浦发银行": "sh600000",
        "600519": "sh600519",
        "601012": "sh601012",
        "300750": "sz300750",
        "600036": "sh600036",
        "601318": "sh601318",
        "00700": "hk00700"
      };

      if (commonMapping[input]) {
        symbol = commonMapping[input];
      } else if (!/^(sh|sz|bj|hk)?\d{5,6}$/i.test(symbol)) {
        try {
          // Try Sina Suggest API first as it's very reliable for name-to-code
          const sinaRes = await axios.get(`https://suggest3.sinajs.cn/suggest/type=&key=${encodeURIComponent(input)}`, { 
            timeout: 5000,
            responseType: 'arraybuffer',
            headers: { 'Referer': 'https://finance.sina.com.cn/' }
          });
          const decoder = new TextDecoder('gbk');
          const sinaData = decoder.decode(sinaRes.data);
          
          const sinaMatch = sinaData.match(/="(.+?)"/);
          if (sinaMatch && sinaMatch[1]) {
            const firstSina = sinaMatch[1].split(";")[0];
            const sParts = firstSina.split(",");
            if (sParts.length >= 4) {
              const code = sParts[2];
              const type = sParts[1];
              // Sina types: 11=sh, 31=sz, 41=bj, 71=hk
              let prefix = "sh";
              if (type === "31") prefix = "sz";
              else if (type === "41") prefix = "bj";
              else if (type === "71") prefix = "hk";
              else if (code.startsWith("6")) prefix = "sh";
              else if (code.startsWith("0") || code.startsWith("3")) prefix = "sz";
              symbol = prefix + code;
            }
          }
          
          // Fallback to Tencent Smartbox if Sina didn't find it
          if (!/^(sh|sz|bj|hk)?\d{5,6}$/i.test(symbol)) {
            const searchRes = await axios.get(`https://smartbox.gtimg.cn/s3/?q=${encodeURIComponent(input)}&t=all`, { 
              timeout: 5000,
              headers: { 'Referer': 'https://gu.qq.com/' }
            });
            const searchData = searchRes.data;
            const match = searchData.match(/="(.+?)"/);
            if (match && match[1] && match[1] !== "pv_none") {
              const firstResult = match[1].split("\n")[0];
              const parts = firstResult.split("~");
              if (parts.length >= 3) {
                symbol = parts[2] + parts[1];
              }
            }
          }
        } catch (e) {
          console.warn("Search APIs failed, falling back to direct symbol use:", e);
        }
      }

      // 2. Format 6-digit code to sh/sz if prefix is missing
      if (/^\d{6}$/.test(symbol)) {
        if (symbol.startsWith("6")) symbol = "sh" + symbol;
        else if (symbol.startsWith("0") || symbol.startsWith("3")) symbol = "sz" + symbol;
      }

      // Use Tencent Finance API for real-time snapshot
      const response = await axios.get(`http://qt.gtimg.cn/q=${symbol}`, {
        timeout: 8000,
        responseType: 'arraybuffer'
      });
      
      const decoder = new TextDecoder('gbk');
      const dataStr = decoder.decode(response.data);
      
      if (dataStr.includes("pv_none")) {
        return res.status(404).json({ error: `股票代码 [${symbol}] 不存在，请检查后重试。`, debug: { input, resolvedSymbol: symbol } });
      }

      const match = dataStr.match(/="(.+)"/);
      if (!match || !match[1]) {
        return res.status(404).json({ error: "接口响应异常，请稍后再试。", debug: { dataStr } });
      }

      const parts = match[1].split("~");
      if (parts.length < 10) {
        return res.status(404).json({ error: "获取到的数据格式不完整。", debug: { partsCount: parts.length } });
      }

      const name = parts[1];
      const current = parseFloat(parts[3]);
      const lastClose = parseFloat(parts[4]);
      const open = parseFloat(parts[5]);
      const high = parseFloat(parts[33]);
      const low = parseFloat(parts[34]);
      const volume = parseFloat(parts[6]);
      const time = parts[30];

      // Fetch historical K-line data from Tencent
      let history = [];
      let debugInfo = "";
      try {
        let klineUrl = "";
        let tScale = 'day';
        
        // Cap datalen to 640 as Tencent fqkline API fails with larger values
        const safeDatalen = Math.min(parseInt(datalen.toString()), 640);
        
        if (scale === '1') {
          tScale = 'm1';
          klineUrl = `https://ifzq.gtimg.cn/appstock/app/kline/mkline?param=${symbol},m1,,${safeDatalen}`;
        } else {
          tScale = scale === '60' ? 'm60' : 'day';
          // Use newfqkline for better historical support and date ranges
          klineUrl = `https://ifzq.gtimg.cn/appstock/app/newfqkline/get?_var=kline_data&param=${symbol},${tScale},${startDate},${endDate},${safeDatalen},qfq`;
        }
        
        debugInfo += `Requesting URL: ${klineUrl}\n`;
        const historyResponse = await axios.get(klineUrl, { timeout: 5000 });
        const rawData = historyResponse.data;
        
        let kData: any;
        if (typeof rawData === 'string') {
          const jsonStr = rawData.replace(/^[a-zA-Z0-9_]+\s*=\s*/, '');
          kData = JSON.parse(jsonStr);
        } else {
          kData = rawData;
        }
        
        const stockData = kData.data[symbol];
        if (!stockData) {
          debugInfo += `No data found for symbol ${symbol} in response.\n`;
        } else {
          // Tencent returns data in different keys depending on scale and endpoint
          const kLines = stockData[tScale] || stockData['qfq' + tScale] || stockData['day'] || stockData['qfqday'];
          
          if (Array.isArray(kLines) && kLines.length > 0) {
            debugInfo += `Found ${kLines.length} data points.\n`;
            history = kLines.map((item: any) => ({
              date: item[0],
              open: parseFloat(item[1]),
              close: parseFloat(item[2]),
              high: parseFloat(item[3]),
              low: parseFloat(item[4]),
              volume: parseFloat(item[5])
            }));
          } else {
            debugInfo += `kLines is not an array or empty. Keys available: ${Object.keys(stockData).join(', ')}\n`;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn("Tencent History API failed:", msg);
        debugInfo += `API Error: ${msg}\n`;
      }

      res.json({
        name,
        symbol,
        current,
        open,
        lastClose,
        high,
        low,
        volume,
        time,
        history,
        debugInfo,
        isRealData: history.length > 0
      });
    } catch (error) {
      console.error("Stock API Error:", error);
      res.status(500).json({ error: "获取数据失败，请稍后再试" });
    }
  });

  // AI Proxy Route for Trading Advice and Chat with Function Calling support
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, model = "qwen-plus" } = req.body;
      const apiKey = process.env.QWEN_API_KEY || "sk-8ad890c590a5498987b128b75676a9ae";
      
      const tools = [
        {
          type: "function",
          function: {
            name: "get_stock_data",
            description: "获取指定股票的实时行情和基本信息。支持股票名称（如：隆基绿能）或代码（如：sh601012）。",
            parameters: {
              type: "object",
              properties: {
                symbol: {
                  type: "string",
                  description: "股票名称或代码"
                }
              },
              required: ["symbol"]
            }
          }
        }
      ];

      let response = await axios.post("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
        model,
        messages,
        tools
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      let assistantMessage = response.data.choices[0].message;

      // Handle tool calls (Function Calling)
      if (assistantMessage.tool_calls) {
        const toolMessages = [...messages, assistantMessage];
        
        for (const toolCall of assistantMessage.tool_calls) {
          if (toolCall.function.name === "get_stock_data") {
            const args = JSON.parse(toolCall.function.arguments);
            const symbol = args.symbol;
            
            // Re-use the stock fetching logic (internal call or refactor)
            // For simplicity, we'll do a quick fetch here or call our own API
            try {
              // We can't easily call our own app.get route internally in Express without a full URL
              // So we'll use a helper function or just duplicate the logic briefly
              // Actually, let's just use axios to call our own local port
              const stockRes = await axios.get(`http://localhost:3000/api/stock/${encodeURIComponent(symbol)}`);
              const stockData = stockRes.data;
              
              toolMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                name: "get_stock_data",
                content: JSON.stringify({
                  name: stockData.name,
                  symbol: stockData.symbol,
                  currentPrice: stockData.current,
                  change: stockData.current - stockData.lastClose,
                  changePercent: ((stockData.current - stockData.lastClose) / stockData.lastClose * 100).toFixed(2) + "%",
                  high: stockData.high,
                  low: stockData.low,
                  volume: stockData.volume,
                  time: stockData.time
                })
              });
            } catch (err) {
              toolMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                name: "get_stock_data",
                content: JSON.stringify({ error: `无法获取股票 ${symbol} 的数据` })
              });
            }
          }
        }

        // Get final response from AI with tool results
        response = await axios.post("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
          model,
          messages: toolMessages
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        });
      }
      
      res.json(response.data);
    } catch (error: any) {
      console.error("AI Proxy Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "AI服务请求失败" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
