import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import { PalateMap } from '../types';

interface PalateChartProps {
  data: PalateMap;
  size?: number;
  simple?: boolean;
}

export const PalateChart: React.FC<PalateChartProps> = ({ data, size = 300, simple = false }) => {
  const chartData = [
    { subject: 'Sweet', A: data.sweet, fullMark: 1 },
    { subject: 'Sour', A: data.sour, fullMark: 1 },
    { subject: 'Salty', A: data.salty, fullMark: 1 },
    { subject: 'Bitter', A: data.bitter, fullMark: 1 },
    { subject: 'Umami', A: data.umami, fullMark: 1 },
    { subject: 'Spicy', A: data.spicy, fullMark: 1 },
    { subject: 'Richness', A: data.richness, fullMark: 1 },
    { subject: 'Texture', A: data.texture, fullMark: 1 },
  ];

  if (simple) {
    return (
      <div style={{ width: size, height: size }} className="shrink-0 flex items-center justify-center">
        <ResponsiveContainer width={size} height={size}>
          <RadarChart cx="50%" cy="50%" outerRadius="35%" data={chartData}>
            <PolarGrid stroke="#262626" />
            <Radar
              name="Palate"
              dataKey="A"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.6}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height={size}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#262626" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#737373', fontSize: 10, fontWeight: 500 }}
          />
          <Radar
            name="Palate"
            dataKey="A"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
