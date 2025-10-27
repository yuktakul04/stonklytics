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
        // Handle YYYYMMDD format from API
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

    // Helper function to safely get value from financial data object
    const getValue = (obj) => {
        if (!obj) return null
        return obj.value !== undefined ? obj.value : null
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold">Fundamentals</h2>
                        <p className="text-purple-100 mt-1">{ticker} - {companyName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all duration-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 bg-gray-50 px-6">
                    <div className="flex space-x-4">
                        <button
                            onClick={() => setActiveTab('cashflow')}
                            className={`py-4 px-6 font-medium transition-all duration-200 border-b-2 ${
                                activeTab === 'cashflow'
                                    ? 'border-purple-600 text-purple-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Cash Flow Statements
                        </button>
                        {/* Future tabs can be added here */}
                        <button
                            disabled
                            className="py-4 px-6 font-medium text-gray-400 cursor-not-allowed"
                        >
                            Income Statements (Coming Soon)
                        </button>
                        <button
                            disabled
                            className="py-4 px-6 font-medium text-gray-400 cursor-not-allowed"
                        >
                            Balance Sheets (Coming Soon)
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="ml-3 text-gray-600">Loading financial data...</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div className="whitespace-pre-line">{error}</div>
                            </div>
                        </div>
                    )}

                    {!loading && !error && activeTab === 'cashflow' && (
                        <div>
                            {cashFlowData.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    No cash flow data available for {ticker}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-gray-300">
                                                <th className="text-left py-3 px-4 font-semibold text-gray-700 sticky left-0 bg-white">
                                                    Period
                                                </th>
                                                {cashFlowData.map((data, idx) => (
                                                    <th key={idx} className="text-right py-3 px-4 font-semibold text-gray-700">
                                                        <div>{formatDate(data.end_date)}</div>
                                                        <div className="text-xs font-normal text-gray-500">
                                                            FY{data.fiscal_year} {data.fiscal_period}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {/* Operating Activities */}
                                            <tr className="bg-purple-50">
                                                <td className="py-2 px-4 font-semibold text-purple-900 sticky left-0 bg-purple-50" colSpan={cashFlowData.length + 1}>
                                                    Operating Activities
                                                </td>
                                            </tr>
                                            <tr className="border-b border-gray-200 hover:bg-gray-50">
                                                <td className="py-2 px-4 text-gray-700 sticky left-0 bg-white">Net Income</td>
                                                {cashFlowData.map((data, idx) => {
                                                    const value = getValue(data.financials?.income_statement?.net_income_loss)
                                                    return (
                                                        <td key={idx} className="py-2 px-4 text-right text-gray-900">
                                                            {formatCurrency(value)}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                            <tr className="border-b-2 border-gray-300 hover:bg-gray-50 font-semibold">
                                                <td className="py-2 px-4 text-gray-900 sticky left-0 bg-white">Net Cash from Operating Activities</td>
                                                {cashFlowData.map((data, idx) => {
                                                    const value = getValue(data.financials?.cash_flow_statement?.net_cash_flow_from_operating_activities)
                                                    return (
                                                        <td key={idx} className={`py-2 px-4 text-right ${value !== null && value >= 0 ? 'text-green-600' : value !== null ? 'text-red-600' : 'text-gray-900'}`}>
                                                            {formatCurrency(value)}
                                                        </td>
                                                    )
                                                })}
                                            </tr>

                                            {/* Investing Activities */}
                                            <tr className="bg-blue-50">
                                                <td className="py-2 px-4 font-semibold text-blue-900 sticky left-0 bg-blue-50" colSpan={cashFlowData.length + 1}>
                                                    Investing Activities
                                                </td>
                                            </tr>
                                            <tr className="border-b-2 border-gray-300 hover:bg-gray-50 font-semibold">
                                                <td className="py-2 px-4 text-gray-900 sticky left-0 bg-white">Net Cash from Investing Activities</td>
                                                {cashFlowData.map((data, idx) => {
                                                    const value = getValue(data.financials?.cash_flow_statement?.net_cash_flow_from_investing_activities)
                                                    return (
                                                        <td key={idx} className={`py-2 px-4 text-right ${value !== null && value >= 0 ? 'text-green-600' : value !== null ? 'text-red-600' : 'text-gray-900'}`}>
                                                            {formatCurrency(value)}
                                                        </td>
                                                    )
                                                })}
                                            </tr>

                                            {/* Financing Activities */}
                                            <tr className="bg-orange-50">
                                                <td className="py-2 px-4 font-semibold text-orange-900 sticky left-0 bg-orange-50" colSpan={cashFlowData.length + 1}>
                                                    Financing Activities
                                                </td>
                                            </tr>
                                            <tr className="border-b-2 border-gray-300 hover:bg-gray-50 font-semibold">
                                                <td className="py-2 px-4 text-gray-900 sticky left-0 bg-white">Net Cash from Financing Activities</td>
                                                {cashFlowData.map((data, idx) => {
                                                    const value = getValue(data.financials?.cash_flow_statement?.net_cash_flow_from_financing_activities)
                                                    return (
                                                        <td key={idx} className={`py-2 px-4 text-right ${value !== null && value >= 0 ? 'text-green-600' : value !== null ? 'text-red-600' : 'text-gray-900'}`}>
                                                            {formatCurrency(value)}
                                                        </td>
                                                    )
                                                })}
                                            </tr>

                                            {/* Net Change */}
                                            <tr className="bg-gray-100 font-bold">
                                                <td className="py-3 px-4 text-gray-900 sticky left-0 bg-gray-100">Net Change in Cash</td>
                                                {cashFlowData.map((data, idx) => {
                                                    const value = getValue(data.financials?.cash_flow_statement?.net_cash_flow)
                                                    return (
                                                        <td key={idx} className={`py-3 px-4 text-right text-lg ${value !== null && value >= 0 ? 'text-green-600' : value !== null ? 'text-red-600' : 'text-gray-900'}`}>
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
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                    <div className="flex justify-between items-center text-sm text-gray-600">
                        <div>Data source: Polygon.io</div>
                        <button
                            onClick={onClose}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

