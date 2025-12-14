import { useState, useEffect } from 'react'
import { api } from '../api'

export default function FundamentalsModal({ isOpen, onClose, ticker, companyName }) {
    const [activeTab, setActiveTab] = useState('cashflow')
    const [cashFlowData, setCashFlowData] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen && ticker && activeTab === 'cashflow') {
            fetchCashFlowData()
        }
    }, [isOpen, ticker, activeTab])

    const fetchCashFlowData = async () => {
        setLoading(true)
        setError('')
        try {
            const response = await api.get(`/stock/financials/?ticker=${ticker}&limit=4&timeframe=quarterly`)
            setCashFlowData(response.data.results || [])
        } catch (err) {
            console.error('Financials fetch error:', err)
            const errorMessage = err.response?.data?.error || 'Failed to fetch financial data'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (num) => {
        if (num === null || num === undefined) return 'N/A'
        const absNum = Math.abs(num)
        if (absNum >= 1e9) {
            return `${num < 0 ? '-' : ''}$${(absNum / 1e9).toFixed(2)}B`
        } else if (absNum >= 1e6) {
            return `${num < 0 ? '-' : ''}$${(absNum / 1e6).toFixed(2)}M`
        }
        return `${num < 0 ? '-' : ''}$${absNum.toFixed(2)}`
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A'
        if (dateStr.length === 8) {
            const year = dateStr.substring(0, 4)
            const month = dateStr.substring(4, 6)
            const day = dateStr.substring(6, 8)
            const date = new Date(`${year}-${month}-${day}`)
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        }
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }

    const getValue = (obj) => {
        if (!obj) return null
        return obj.value !== undefined ? obj.value : null
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f0f12] border border-[#27272a] rounded-xl shadow-large max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
                {/* Header */}
                <div className="bg-[#18181b] border-b border-[#27272a] px-6 py-5 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Fundamentals</h2>
                        <p className="text-sm text-zinc-500 mt-0.5">{ticker} • {companyName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-[#27272a]"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-[#27272a] bg-[#18181b] px-6">
                    <div className="flex space-x-1">
                        <button
                            onClick={() => setActiveTab('cashflow')}
                            className={`py-3 px-4 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
                                activeTab === 'cashflow'
                                    ? 'border-[#3b82f6] text-white'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            Cash Flow
                        </button>
                        <button
                            disabled
                            className="py-3 px-4 text-sm font-medium text-zinc-700 cursor-not-allowed"
                        >
                            Income Statement
                        </button>
                        <button
                            disabled
                            className="py-3 px-4 text-sm font-medium text-zinc-700 cursor-not-allowed"
                        >
                            Balance Sheet
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#09090b] ui-scrollbar">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div>
                            <span className="ml-3 text-sm text-zinc-500">Loading financial data...</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div className="whitespace-pre-line text-sm">{error}</div>
                            </div>
                        </div>
                    )}

                    {!loading && !error && activeTab === 'cashflow' && (
                        <div>
                            {cashFlowData.length === 0 ? (
                                <div className="text-center py-12 text-zinc-500">
                                    No cash flow data available for {ticker}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-[#27272a]">
                                                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wide sticky left-0 bg-[#09090b] z-10">
                                                    Period
                                                </th>
                                                {cashFlowData.map((data, idx) => (
                                                    <th key={idx} className="text-right py-3 px-4 text-xs font-medium text-zinc-500">
                                                        <div>{formatDate(data.end_date)}</div>
                                                        <div className="font-normal text-zinc-600 mt-0.5">
                                                            FY{data.fiscal_year} {data.fiscal_period}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {/* Operating Activities */}
                                            <tr className="bg-[#18181b]">
                                                <td className="py-2 px-4 text-xs font-medium text-zinc-400 uppercase tracking-wide sticky left-0 bg-[#18181b] z-10" colSpan={cashFlowData.length + 1}>
                                                    Operating Activities
                                                </td>
                                            </tr>
                                            <tr className="border-b border-[#1f1f23] hover:bg-[#18181b] transition-colors">
                                                <td className="py-2.5 px-4 text-zinc-500 sticky left-0 bg-[#09090b] z-10">Net Income</td>
                                                {cashFlowData.map((data, idx) => {
                                                    const value = getValue(data.financials?.income_statement?.net_income_loss)
                                                    return (
                                                        <td key={idx} className="py-2.5 px-4 text-right text-white font-mono text-sm">
                                                            {formatCurrency(value)}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                            <tr className="border-b border-[#27272a] hover:bg-[#18181b] transition-colors">
                                                <td className="py-2.5 px-4 text-white font-medium sticky left-0 bg-[#09090b] z-10">Net Cash from Operating</td>
                                                {cashFlowData.map((data, idx) => {
                                                    const value = getValue(data.financials?.cash_flow_statement?.net_cash_flow_from_operating_activities)
                                                    return (
                                                        <td key={idx} className={`py-2.5 px-4 text-right font-mono text-sm font-medium ${value !== null && value >= 0 ? 'text-green-500' : value !== null ? 'text-red-500' : 'text-white'}`}>
                                                            {formatCurrency(value)}
                                                        </td>
                                                    )
                                                })}
                                            </tr>

                                            {/* Investing Activities */}
                                            <tr className="bg-[#18181b]">
                                                <td className="py-2 px-4 text-xs font-medium text-zinc-400 uppercase tracking-wide sticky left-0 bg-[#18181b] z-10" colSpan={cashFlowData.length + 1}>
                                                    Investing Activities
                                                </td>
                                            </tr>
                                            <tr className="border-b border-[#27272a] hover:bg-[#18181b] transition-colors">
                                                <td className="py-2.5 px-4 text-white font-medium sticky left-0 bg-[#09090b] z-10">Net Cash from Investing</td>
                                                {cashFlowData.map((data, idx) => {
                                                    const value = getValue(data.financials?.cash_flow_statement?.net_cash_flow_from_investing_activities)
                                                    return (
                                                        <td key={idx} className={`py-2.5 px-4 text-right font-mono text-sm font-medium ${value !== null && value >= 0 ? 'text-green-500' : value !== null ? 'text-red-500' : 'text-white'}`}>
                                                            {formatCurrency(value)}
                                                        </td>
                                                    )
                                                })}
                                            </tr>

                                            {/* Financing Activities */}
                                            <tr className="bg-[#18181b]">
                                                <td className="py-2 px-4 text-xs font-medium text-zinc-400 uppercase tracking-wide sticky left-0 bg-[#18181b] z-10" colSpan={cashFlowData.length + 1}>
                                                    Financing Activities
                                                </td>
                                            </tr>
                                            <tr className="border-b border-[#27272a] hover:bg-[#18181b] transition-colors">
                                                <td className="py-2.5 px-4 text-white font-medium sticky left-0 bg-[#09090b] z-10">Net Cash from Financing</td>
                                                {cashFlowData.map((data, idx) => {
                                                    const value = getValue(data.financials?.cash_flow_statement?.net_cash_flow_from_financing_activities)
                                                    return (
                                                        <td key={idx} className={`py-2.5 px-4 text-right font-mono text-sm font-medium ${value !== null && value >= 0 ? 'text-green-500' : value !== null ? 'text-red-500' : 'text-white'}`}>
                                                            {formatCurrency(value)}
                                                        </td>
                                                    )
                                                })}
                                            </tr>

                                            {/* Net Change */}
                                            <tr className="bg-[#18181b]">
                                                <td className="py-3 px-4 text-white font-semibold sticky left-0 bg-[#18181b] z-10">Net Change in Cash</td>
                                                {cashFlowData.map((data, idx) => {
                                                    const value = getValue(data.financials?.cash_flow_statement?.net_cash_flow)
                                                    return (
                                                        <td key={idx} className={`py-3 px-4 text-right font-mono font-semibold ${value !== null && value >= 0 ? 'text-green-500' : value !== null ? 'text-red-500' : 'text-white'}`}>
                                                            {formatCurrency(value)}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-[#27272a] bg-[#18181b] px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="text-xs text-zinc-600">Data source: Polygon.io</div>
                        <button
                            onClick={onClose}
                            className="px-5 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
