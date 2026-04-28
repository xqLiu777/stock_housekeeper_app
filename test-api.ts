import axios from 'axios';

async function test() {
  const symbol = 'sh601012';
  try {
    console.log('Testing Tencent newfqkline API with empty dates and count=100...');
    const dayUrl = `https://ifzq.gtimg.cn/appstock/app/newfqkline/get?_var=kline_day&param=${symbol},day,,,100,qfq`;
    const dayRes = await axios.get(dayUrl, { timeout: 5000 });
    const dayData = dayRes.data.toString();
    console.log('Tencent Day Response (First 200 chars):', dayData.substring(0, 200));
    
    const jsonStr = dayData.replace(/^[a-zA-Z0-9_]+\s*=\s*/, '');
    const parsed = JSON.parse(jsonStr);
    const stockData = parsed.data[symbol];
    const kLines = stockData['day'] || stockData['qfqday'];
    console.log('Data found:', !!kLines, 'Length:', kLines?.length);
    if (kLines && kLines.length > 0) {
      console.log('First point:', kLines[0]);
      console.log('Last point:', kLines[kLines.length - 1]);
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

test();
