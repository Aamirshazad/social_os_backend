'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, Sparkles, TrendingUp, Users, Calendar, Zap, CheckCircle2, ArrowRight, Shield, BarChart3 } from 'lucide-react'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isLogin) {
        // Sign in
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        }
      } else {
        // Sign up
        if (!fullName.trim()) {
          setError('Please enter your full name')
          setLoading(false)
          return
        }

        const { error } = await signUp(email, password, fullName)
        if (error) {
          setError(error.message)
        } else {
          // Success message - check if email confirmation is required
          setError(null)
          setIsLogin(true)
          // Reset form
          setEmail('')
          setPassword('')
          setFullName('')
          alert('Account created successfully! Please sign in.')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50">
      {/* Left Side - Branding & Value Proposition */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-white via-blue-50/50 to-violet-50/50 relative overflow-hidden">
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-100/30 via-transparent to-violet-100/30"></div>
          <div className="absolute top-20 left-20 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-violet-200/20 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-indigo-200/15 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '3s'}}></div>
        </div>

        {/* Decorative grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>

        <div className="relative z-10 px-12 pt-12">
          {/* Logo with premium styling */}
          <div className="flex items-center gap-3 mb-20">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl blur-md opacity-50"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-violet-600 p-3 rounded-2xl shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-violet-700 bg-clip-text text-transparent tracking-tight">ContentOS</span>
              <div className="text-xs text-blue-600 font-medium mt-0.5">Enterprise Edition</div>
            </div>
          </div>

          {/* Main Headline with premium typography */}
          <div className="max-w-xl">
            
            <h1 className="text-6xl font-bold text-slate-900 leading-[1.1] mb-6 tracking-tight">
              Build your B2B<br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                content pipeline
              </span>
            </h1>
            
            <p className="text-xl text-slate-700 leading-relaxed mb-12">
              From <span className="text-slate-900 font-semibold">generating</span> with AI to 
              <span className="text-slate-900 font-semibold"> scheduling</span> and 
              <span className="text-slate-900 font-semibold"> publishing</span> across all platforms — so prospects find you, trust you, and book meetings before your competitors even get a reply.
            </p>

            {/* Key Features with enhanced design */}
            <div className="space-y-3">
              <div className="group flex items-start gap-4 bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-blue-200 hover:border-blue-400 transition-all duration-300 hover:bg-white hover:shadow-lg hover:shadow-blue-200/50">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-blue-400 rounded-xl blur-md opacity-0 group-hover:opacity-30 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-blue-100 to-indigo-100 p-3 rounded-xl border border-blue-200">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-slate-900 font-semibold text-lg mb-1.5">Autonomous Content Creation</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">AI drafts posts, carousels, and comments indistinguishable from your own writing. Your authentic voice, automated in seconds.</p>
                </div>
              </div>

              <div className="group flex items-start gap-4 bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-indigo-200 hover:border-indigo-400 transition-all duration-300 hover:bg-white hover:shadow-lg hover:shadow-indigo-200/50">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-indigo-400 rounded-xl blur-md opacity-0 group-hover:opacity-30 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-indigo-100 to-purple-100 p-3 rounded-xl border border-indigo-200">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-slate-900 font-semibold text-lg mb-1.5">B2B Content Funnel</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">Strategic content for every stage of the buyer's journey—from top-of-funnel awareness to bottom-of-funnel conversion.</p>
                </div>
              </div>

              <div className="group flex items-start gap-4 bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-violet-200 hover:border-violet-400 transition-all duration-300 hover:bg-white hover:shadow-lg hover:shadow-violet-200/50">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-violet-400 rounded-xl blur-md opacity-0 group-hover:opacity-30 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-violet-100 to-purple-100 p-3 rounded-xl border border-violet-200">
                    <Calendar className="w-5 h-5 text-violet-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-slate-900 font-semibold text-lg mb-1.5">Multi-Platform Distribution</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">Publish and schedule across LinkedIn, Twitter, Facebook, and more from one unified dashboard.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl blur-md opacity-75"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-violet-600 p-3 rounded-xl shadow-xl shadow-blue-500/50">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold text-charcoal-dark">ContentOS</span>
                <div className="text-xs text-slate-600 font-medium">Enterprise Edition</div>
              </div>
            </div>
            <p className="text-slate-600 text-sm max-w-sm mx-auto">
              Build your B2B content pipeline and convert prospects faster
            </p>
          </div>

          {/* Auth Card with premium styling */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-slate-900/10 p-10 border border-slate-200/50">
            <div className="mb-10">
              <h2 className="text-4xl font-bold text-charcoal-dark tracking-tight">
                {isLogin ? 'Welcome back' : 'Get started'}
              </h2>
              <p className="text-slate-600 text-base mt-3">
                {isLogin
                  ? 'Sign in to access your content pipeline'
                  : 'Join thousands of B2B teams winning with content'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                <div className="bg-red-100 rounded-full p-1 flex-shrink-0">
                  <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                </div>
                <p className="text-red-700 text-sm font-medium flex-1">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-charcoal-dark mb-3">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-5 py-4 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50 hover:bg-white text-base"
                    required={!isLogin}
                    disabled={loading}
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-charcoal-dark mb-3">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-5 py-4 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50 hover:bg-white text-base"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-charcoal-dark mb-3">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50 hover:bg-white text-base"
                  required
                  minLength={6}
                  disabled={loading}
                />
                {!isLogin && (
                  <p className="text-xs text-slate-500 mt-3 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Must be at least 6 characters
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white py-4 px-6 rounded-2xl font-semibold text-base hover:shadow-2xl hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative flex items-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isLogin ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    <>
                      {isLogin ? 'Sign in to dashboard' : 'Create free account'}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>

            
            {/* Toggle Login/Signup */}
            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError(null)
                }}
                disabled={loading}
                className="text-sm text-slate-600 hover:text-charcoal-dark font-semibold disabled:opacity-50 transition-colors inline-flex items-center gap-1 group"
              >
                {isLogin
                  ? "Don't have an account? Sign up free"
                  : 'Already have an account? Sign in'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500">
              By continuing, you agree to our{' '}
              <a href="#" className="text-slate-700 font-medium hover:text-charcoal-dark underline decoration-slate-300 hover:decoration-slate-700 transition-colors">
                Terms of Service
              </a>
              {' '}and{' '}
              <a href="#" className="text-slate-700 font-medium hover:text-charcoal-dark underline decoration-slate-300 hover:decoration-slate-700 transition-colors">
                Privacy Policy
              </a>
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5" />
              <span>SOC 2 Type II Certified • GDPR Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
