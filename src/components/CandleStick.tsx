import React from 'react';

export const CandleStick = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload || height === undefined || y === undefined) return null;
  
  const { open, close, high, low } = payload;
  const isUp = close >= open;
  const color = isUp ? '#ef4444' : '#22c55e';
  
  const priceDiff = Math.abs(open - close);
  const ratio = priceDiff === 0 ? 0 : height / priceDiff;
  
  const bodyHigh = Math.max(open, close);
  const bodyLow = Math.min(open, close);
  
  const wickTop = y - (high - bodyHigh) * ratio;
  const wickBottom = y + height + (bodyLow - low) * ratio;

  return (
    <g>
      <line
        x1={x + width / 2}
        y1={isNaN(wickTop) ? y : wickTop}
        x2={x + width / 2}
        y2={isNaN(wickBottom) ? y + height : wickBottom}
        stroke={color}
        strokeWidth={1}
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.max(height, 1)}
        fill={color}
      />
    </g>
  );
};
