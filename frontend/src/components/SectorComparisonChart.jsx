import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts'

export default function SectorComparisonChart({ data, currentSector }) {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return null
  }

  // Convert sector_performance object to array format for Recharts
  const chartData = Object.entries(data).map(([sector, change]) => ({
    sector: sector,
    change: typeof change === 'number' ? change : parseFloat(change) || 0
  })).sort((a, b) => b.change - a.change) // Sort by change descending

  if (chartData.length === 0) return null

  return (
    <div className="pt-6 border-t border-dark-border">
      <h3 className="text-lg font-semibold mb-4 text-white">Sector Performance Comparison</h3>
      <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 50)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            type="number"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${value.toFixed(2)}%`}
          />
          <YAxis 
            type="category" 
            dataKey="sector" 
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            width={90}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6'
            }}
            formatter={(value) => [`${value.toFixed(2)}%`, 'Change']}
          />
          <Bar dataKey="change" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.sector === currentSector ? '#3B82F6' : '#6B7280'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {currentSector && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Current stock sector: <strong className="text-gray-300">{currentSector}</strong></span>
        </div>
      )}
    </div>
  )
}

