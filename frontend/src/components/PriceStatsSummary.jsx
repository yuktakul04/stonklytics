import React from 'react'

export default function PriceStatsSummary({ data }) {
  if (!data) return null

  const formatCurrency = (num) => {
    if (num === null || num === undefined) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num)
  }

  const stats = [
    {
      label: 'Open',
      value: formatCurrency(data.open_price),
      key: 'open'
    },
    {
      label: 'Close',
      value: formatCurrency(data.close_price),
      key: 'close'
    },
    {
      label: 'High',
      value: formatCurrency(data.high_price),
      key: 'high'
    },
    {
      label: 'Low',
      value: formatCurrency(data.low_price),
      key: 'low'
    }
  ]

  return (
    <div className="mt-6 grid grid-cols-2 gap-4">
      {stats.map((stat) => (
        <div key={stat.key} className="bg-dark-surface border border-dark-border rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">{stat.label}</div>
          <div className="text-xl font-semibold text-white">{stat.value}</div>
        </div>
      ))}
    </div>
  )
}

