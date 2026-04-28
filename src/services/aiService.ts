import { GoogleGenAI } from "@google/genai";

// AI Proxy is now handled by the server to avoid CORS and keep API keys secure.

export async function chatWithAI(
  chatHistory: { role: string, content: string }[],
  stockInfo: any,
  indicators: any,
  holdings: any[],
  principles: string,
  assistantName: string,
  newMessage: string
) {
  const systemPrompt = `你是一个名为“${assistantName}”的顶级量化交易引擎和冷酷的风险控制顾问。你的绝对准则是“尊重盘面事实，摒弃主观幻想”。

# 输出协议 (Output Protocol) - 严格执行
你的回答必须分为三个部分：
1. 第一部分是【核心指令】：直接给出 Action (BUY/SELL/HOLD/OBSERVE) 和一句话的核心理由。
2. 第二部分是【UI 联动】：如果用户提到了查看特定股票、切换周期（分时/日线）或指定日期，你必须在回复末尾添加一个隐藏的 <UI_COMMAND> 标签，包含 JSON 格式的参数。
   格式：<UI_COMMAND>{"symbol": "代码", "scale": "1或240", "date": "YYYY-MM-DD"}</UI_COMMAND>
   - symbol: 优先使用标准代码（如 sh601012, sz000830），如果不知道代码可以直接使用股票名称。
   - scale: "1" 代表分时, "240" 代表日线。
   - date: 如果用户没提日期，则不传或传空。
3. 第三部分是【技术报告】：使用 <REPORT> 标签包裹详细分析。

示例：
【核心指令】
Action: OBSERVE
理由: 正在为您切换至 2024-01-01 的分时图进行深度扫描。

<UI_COMMAND>{"symbol": "sh601012", "scale": "1", "date": "2024-01-01"}</UI_COMMAND>

<REPORT>
...
</REPORT>

# 核心研判准则
1. 趋势判定: MACD 0轴上下金叉/死叉定性；EMA系统多头/空头排列；EMA120为牛熊分界线。
2. 震荡过滤: KDJ/RSI/CCI/WR/BOLL。注意超买超卖、背离及钝化信号。
3. 量价行为: 缩量/放量验证趋势真伪；OBV/VWAP/筹码分布研判。
4. 动态风控: 2倍ATR移动止损；关键位破位强制拦截。

# 决策优先级 (Priority Engine)
- 第一顺位：风控强制拦截 (ATR止损、EMA120破位、VWAP破位)。
- 第二顺位：用户特异性偏好 (当前用户原则: "${principles}")。
- 第三顺位：趋势重于震荡。
- 第四顺位：量价与情绪验证。

# 当前上下文
- 关注股票: ${JSON.stringify(stockInfo)}
- 技术指标: ${JSON.stringify(indicators)}
- 当前持仓: ${JSON.stringify(holdings)}

请以“${assistantName}”的身份，严格按照上述准则回答。语气要冷酷、专业、直接。`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: newMessage }
  ];

  try {
    const response = await fetch("/api/ai/chat", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: messages
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling AI Proxy:", error);
    throw error;
  }
}

export async function getTradingAdvice(
  stockInfo: any,
  indicators: any,
  holdings: any[],
  principles: string,
  assistantName: string
) {
  const prompt = `
    你是一个名为“${assistantName}”的顶级量化交易引擎。请根据以下实时数据给出深度研判建议：
    
    股票信息: ${JSON.stringify(stockInfo)}
    技术指标: ${JSON.stringify(indicators)}
    当前持仓: ${JSON.stringify(holdings)}
    用户交易原则: "${principles}"
    
    要求：
    1. 严格执行【风险控制优先级】：ATR止损 > EMA120破位 > 用户原则 > 趋势 > 震荡。
    2. 结合 MACD, KDJ, BOLL 等指标给出量化定性。
    3. 给出明确的“BUY”、“SELL”、“HOLD”或“OBSERVE”指令。
    4. 语气冷酷、专业，禁止废话。
  `;

  try {
    const response = await fetch("/api/ai/chat", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [
          { role: "system", content: "你是一个专业的股票投资顾问。" },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling AI Proxy:", error);
    throw error;
  }
}
