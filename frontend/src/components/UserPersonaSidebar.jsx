import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'

export default function UserPersonaSidebar({ isOpen, onClose }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Unknown'
        return new Date(timestamp).toLocaleDateString()
    }

    if (loading) {
        return (
            <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6">
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6">
                    <div className="text-center text-gray-500">
                        <p>Please log in to view your profile</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={onClose}
                />
            )}
            
            {/* Sidebar */}
            <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">User Profile</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* User Info */}
                        <div className="mb-6">
                            <div className="flex items-center space-x-4 mb-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {user.displayName || 'User'}
                                    </h3>
                                    <p className="text-sm text-gray-600">{user.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Account Details */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <p className="text-sm text-gray-600">{user.email}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                                <p className="text-xs text-gray-600 font-mono">{user.uid}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Verified</label>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                    user.emailVerified 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                }`}>
                                    {user.emailVerified ? 'Verified' : 'Not Verified'}
                                </span>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                                <p className="text-sm text-gray-600">{formatDate(user.metadata?.creationTime)}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Last Sign In</label>
                                <p className="text-sm text-gray-600">{formatDate(user.metadata?.lastSignInTime)}</p>
                            </div>
                        </div>

                        {/* Provider Info */}
                        {user.providerData && user.providerData.length > 0 && (
                            <div className="pt-4 border-t border-gray-200">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Sign-in Method</h4>
                                <div className="space-y-1 text-sm text-gray-600">
                                    {user.providerData.map((provider, index) => (
                                        <p key={index}>
                                            <span className="font-medium">{provider.providerId}:</span> {provider.email || provider.uid}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-200">
                        <div className="text-center text-sm text-gray-500">
                            <p>Stonklytics User Profile</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
