import { createContext, useState, useContext, useEffect } from 'react'
import AuthService from '../services/AuthService'

const AuthContext = createContext(null)

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    // Check authentication status on mount
    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        setLoading(true)
        if (AuthService.isAuthenticated()) {
            const result = await AuthService.getCurrentUser()
            if (result.success) {
                setUser(result.data)
                setIsAuthenticated(true)
            } else {
                setUser(null)
                setIsAuthenticated(false)
            }
        } else {
            setUser(null)
            setIsAuthenticated(false)
        }
        setLoading(false)
    }

    const login = async (email, password) => {
        const result = await AuthService.login(email, password)
        if (result.success) {
            await checkAuth()
            return { success: true }
        }
        return result
    }

    const register = async (email, username, password) => {
        const result = await AuthService.register(email, username, password)
        return result
    }

    const logout = () => {
        AuthService.logout()
        setUser(null)
        setIsAuthenticated(false)
    }

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        checkAuth
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
