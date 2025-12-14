import React, { useState, useEffect } from 'react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area
} from 'recharts'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { api } from '../api'

export default function HistoricalChart({ ticker }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [chartType, setChartType] = useState('line')
  
  const getDefaultDates = () => {
    const toDate = new Date()
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 30)
    return { fromDate, toDate }
  }
  
  const { fromDate: defaultFrom, toDate: defaultTo } = getDefaultDates()
  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(defaultTo)

  const fetchHistoricalData = async (from, to) => {
    if (!ticker) return
    setLoading(true)
    setError(null)
    
    try {
      const fromStr = from.toISOString().split('T')[0]
      const toStr = to.toISOString().split('T')[0]
      const response = await api.get(`/stock/data/historical/?ticker=${ticker}&from=${fromStr}&to=${toStr}`)
      setData(response.data.prices?.length > 0 ? response.data.prices : [])
    } catch (err) {
      setError('Failed to load chart data')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistoricalData(fromDate, toDate)
  }, [ticker, fromDate, toDate])

  const handleFromDateChange = (date) => {
    if (date && date <= toDate) setFromDate(date)
  }

  const handleToDateChange = (date) => {
    if (date && date >= fromDate) setToDate(date)
  }

  const handleRefresh = () => fetchHistoricalData(fromDate, toDate)

  // Calculate change
  const priceChange = data.length > 1 
    ? ((data[data.length - 1]?.close - data[0]?.close) / data[0]?.close * 100).toFixed(2)
    : 0
  const isPositive = priceChange >= 0

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="px-3 py-2 rounded-lg text-xs" style={{ background: '#18181b', border: '1px solid #27272a' }}>
        <p className="text-zinc-500 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex justify-between gap-4">
            <span className="text-zinc-400">{entry.name === 'close' ? 'Price' : entry.name}</span>
            <span className="font-mono text-white">
              {entry.name === 'volume' ? entry.value?.toLocaleString() : `$${entry.value?.toFixed(2)}`}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="text-center">
          <div className="w-6 h-6 mx-auto border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div>
          <p className="text-xs text-zinc-500 mt-2">Loading chart...</p>
        </div>
      </div>
    )
  }

  if (error || !data?.length) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="text-center">
          <svg className="w-8 h-8 mx-auto text-zinc-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm text-zinc-500">{error || 'No data available'}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-white">Price History</h3>
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {isPositive ? '+' : ''}{priceChange}%
          </span>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Range */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs" style={{ background: '#18181b', border: '1px solid #27272a' }}>
            <DatePicker
              selected={fromDate}
              onChange={handleFromDateChange}
              maxDate={toDate}
              dateFormat="MMM d"
              className="w-14 bg-transparent text-zinc-300 text-xs outline-none cursor-pointer"
            />
            <span className="text-zinc-600">–</span>
            <DatePicker
              selected={toDate}
              onChange={handleToDateChange}
              minDate={fromDate}
              maxDate={new Date()}
              dateFormat="MMM d"
              className="w-14 bg-transparent text-zinc-300 text-xs outline-none cursor-pointer"
            />
          </div>

          {/* Chart Type */}
          <div className="flex items-center rounded-lg overflow-hidden" style={{ background: '#18181b', border: '1px solid #27272a' }}>
            {['line', 'area', 'volume'].map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${chartType === type ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors text-zinc-500 hover:text-white"
            style={{ background: '#18181b', border: '1px solid #27272a' }}
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="close" stroke={isPositive ? '#22c55e' : '#ef4444'} strokeWidth={2} fill="url(#areaGradient)" name="close" />
            </ComposedChart>
          ) : chartType === 'volume' ? (
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="price" tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} domain={['auto', 'auto']} />
              <YAxis yAxisId="volume" orientation="right" tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : v} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="volume" dataKey="volume" fill="#3f3f46" radius={[2, 2, 0, 0]} name="volume" />
              <Line yAxisId="price" type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} dot={false} name="close" />
            </ComposedChart>
          ) : (
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="close" stroke={isPositive ? '#22c55e' : '#ef4444'} strokeWidth={2} dot={false} name="close" />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
