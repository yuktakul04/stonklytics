import React, { useState, useEffect } from 'react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { api } from '../api'

export default function HistoricalChart({ ticker }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [chartType, setChartType] = useState('combined') // 'combined' or 'candlestick'
  
  // Default to last 30 days
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
    
    const fromStr = from.toISOString().split('T')[0]
    const toStr = to.toISOString().split('T')[0]

    try {
      const response = await api.get(`/stock/data/historical/?ticker=${ticker}&from=${fromStr}&to=${toStr}`)
      if (response.data.prices && response.data.prices.length > 0) {
        setData(response.data.prices)
      } else {
        setData([])
      }
    } catch (err) {
      console.error('Error fetching historical data:', err)
      setError('Failed to load historical data')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistoricalData(fromDate, toDate)
  }, [ticker, fromDate, toDate])

  const handleFromDateChange = (date) => {
    if (date && date <= toDate) {
      setFromDate(date)
    }
  }

  const handleToDateChange = (date) => {
    if (date && date >= fromDate) {
      setToDate(date)
    }
  }

  if (loading) {
    return (
      <div className="pt-6 border-t border-dark-border">
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-400">Loading chart...</span>
        </div>
      </div>
    )
  }

  if (error || !data || data.length === 0) {
    return (
      <div className="pt-6 border-t border-dark-border">
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">{error || 'No historical data available'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-6 border-t border-dark-border">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
        <h3 className="text-lg font-semibold text-white">Historical Stock Prices</h3>
        
        {/* Date Pickers */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">From:</label>
            <DatePicker
              selected={fromDate}
              onChange={handleFromDateChange}
              maxDate={toDate}
              dateFormat="yyyy-MM-dd"
              className="px-3 py-1.5 bg-dark-surface border border-dark-border rounded-lg text-white text-sm focus:ring-2 focus:ring-gray-600 focus:border-dark-border outline-none"
              wrapperClassName="date-picker-wrapper"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">To:</label>
            <DatePicker
              selected={toDate}
              onChange={handleToDateChange}
              minDate={fromDate}
              maxDate={new Date()}
              dateFormat="yyyy-MM-dd"
              className="px-3 py-1.5 bg-dark-surface border border-dark-border rounded-lg text-white text-sm focus:ring-2 focus:ring-gray-600 focus:border-dark-border outline-none"
              wrapperClassName="date-picker-wrapper"
            />
          </div>
        </div>
      </div>

      {/* Chart Type Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setChartType('combined')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            chartType === 'combined'
              ? 'bg-blue-600 text-white'
              : 'bg-dark-surface border border-dark-border text-gray-400 hover:text-white'
          }`}
        >
          Price & Volume
        </button>
        <button
          onClick={() => setChartType('candlestick')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            chartType === 'candlestick'
              ? 'bg-blue-600 text-white'
              : 'bg-dark-surface border border-dark-border text-gray-400 hover:text-white'
          }`}
        >
          Candlestick
        </button>
      </div>

      {/* Combined Chart (Line + Bar) */}
      {chartType === 'combined' && (
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9CA3AF' }}
            />
            <YAxis 
              yAxisId="price"
              domain={['auto', 'auto']}
              stroke="#3B82F6"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#3B82F6' }}
              label={{ value: 'Price ($)', angle: -90, position: 'insideLeft', style: { fill: '#3B82F6' } }}
            />
            <YAxis 
              yAxisId="volume"
              orientation="right"
              domain={[0, 'auto']}
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6B7280' }}
              label={{ value: 'Volume', angle: 90, position: 'insideRight', style: { fill: '#6B7280' } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6'
              }}
              formatter={(value, name) => {
                if (name === 'close') return [`$${value.toFixed(2)}`, 'Close Price']
                if (name === 'volume') return [value.toLocaleString(), 'Volume']
                return [value, name]
              }}
            />
            <Bar 
              yAxisId="volume"
              dataKey="volume" 
              fill="#6B7280" 
              opacity={0.6}
              name="volume"
            />
            <Line 
              yAxisId="price"
              type="monotone" 
              dataKey="close" 
              stroke="#3B82F6" 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 4 }}
              name="close"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* Candlestick Chart - OHLC visualization with lines */}
      {chartType === 'candlestick' && (
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9CA3AF' }}
            />
            <YAxis 
              domain={['auto', 'auto']}
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9CA3AF' }}
              label={{ value: 'Price ($)', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6'
              }}
              formatter={(value, name) => {
                if (name === 'open') return [`$${value.toFixed(2)}`, 'Open']
                if (name === 'high') return [`$${value.toFixed(2)}`, 'High']
                if (name === 'low') return [`$${value.toFixed(2)}`, 'Low']
                if (name === 'close') return [`$${value.toFixed(2)}`, 'Close']
                return [value, name]
              }}
            />
            {/* High price line */}
            <Line 
              type="monotone" 
              dataKey="high" 
              stroke="#10B981" 
              strokeWidth={1.5}
              dot={{ fill: '#10B981', r: 2 }}
              name="high"
            />
            {/* Low price line */}
            <Line 
              type="monotone" 
              dataKey="low" 
              stroke="#EF4444" 
              strokeWidth={1.5}
              dot={{ fill: '#EF4444', r: 2 }}
              name="low"
            />
            {/* Open price line */}
            <Line 
              type="monotone" 
              dataKey="open" 
              stroke="#F59E0B" 
              strokeWidth={2}
              dot={{ fill: '#F59E0B', r: 3 }}
              strokeDasharray="5 5"
              name="open"
            />
            {/* Close price line */}
            <Line 
              type="monotone" 
              dataKey="close" 
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={{ fill: '#3B82F6', r: 3 }}
              name="close"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
