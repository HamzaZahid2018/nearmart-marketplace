/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, User, Store, ShieldCheck, Lock, Mail, Phone, LogIn, UserPlus, Sparkles, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authService } from '../api/services';
import apiClient from '../api/client';
import { ViewRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: any, token: string, role: ViewRole) => void;
  addToast: (message: string, type: 'success' | 'info' | 'error') => void;
}

export default function AuthModal({ isOpen, initialMode = 'login', onClose, onSuccess, addToast }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<ViewRole>('customer');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Reset form fields when modal opens or mode switches
  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setErrorMessage(null);
    setShowPassword(false);
  };

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      resetForm();
    }
  }, [isOpen, initialMode]);

  const handleModeSwitch = (newMode: 'login' | 'register') => {
    setMode(newMode);
    resetForm();
    setSelectedRole('customer');
  };

  if (!isOpen) return null;

  // Client-side validation
  const validateForm = (): string | null => {
    if (!username.trim()) return 'Username is required.';
    if (username.trim().length < 3) return 'Username must be at least 3 characters.';
    if (!password.trim()) return 'Password is required.';
    if (password.trim().length < 8) return 'Password must be at least 8 characters.';

    if (mode === 'register') {
      if (!email.trim()) return 'Email address is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email address.';
      if (!firstName.trim()) return 'First name is required.';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await authService.login({
          username: username.trim(),
          password: password.trim(),
        });

        const token = res.token;
        const user = res.user;

        // Derive role solely from backend response
        let role: ViewRole = 'customer';
        if (user && user.role) {
          if (user.role === 'merchant') role = 'owner';
          else if (user.role === 'admin') role = 'admin';
          else role = 'customer';
        }

        localStorage.setItem('authToken', token);
        localStorage.setItem('userRole', role);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        const roleName = role === 'owner' ? 'Shop Owner' : role === 'admin' ? 'Administrator' : 'Customer';
        addToast(`Welcome back, ${user.username || 'User'}! Logged in as ${roleName}.`, 'success');
        onSuccess(user, token, role);
        onClose();
      } else {
        // Registration
        const apiRole = selectedRole === 'owner' ? 'merchant' : selectedRole === 'admin' ? 'admin' : 'customer';

        const res = await authService.register({
          username: username.trim(),
          email: email.trim(),
          password: password.trim(),
          role: apiRole,
          first_name: firstName.trim(),
          last_name: lastName.trim() || '',
          phone_number: phone.trim() || '',
        });

        const token = res.token;
        const user = res.user;

        // Derive role from backend response
        let role: ViewRole = 'customer';
        if (user && user.role) {
          if (user.role === 'merchant') role = 'owner';
          else if (user.role === 'admin') role = 'admin';
          else role = 'customer';
        }

        localStorage.setItem('authToken', token);
        localStorage.setItem('userRole', role);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        const roleName = role === 'owner' ? 'Shop Owner' : role === 'admin' ? 'Administrator' : 'Customer';
        addToast(`Account created! Logged in as ${roleName}.`, 'success');
        onSuccess(user, token, role);
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err.response?.data);
      let msg = 'Authentication failed. Please check your credentials and try again.';

      if (err.response?.data) {
        const data = err.response.data;
        if (data.detail) msg = data.detail;
        else if (data.non_field_errors) msg = Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : data.non_field_errors;
        else if (data.username) msg = `Username: ${Array.isArray(data.username) ? data.username.join(' ') : data.username}`;
        else if (data.email) msg = `Email: ${Array.isArray(data.email) ? data.email.join(' ') : data.email}`;
        else if (data.password) msg = `Password: ${Array.isArray(data.password) ? data.password.join(' ') : data.password}`;
        else if (data.role) msg = `Role: ${Array.isArray(data.role) ? data.role.join(' ') : data.role}`;
      }

      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/50 z-50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#FAF8F5] dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-800 w-full max-w-[520px] rounded-3xl shadow-xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden my-auto">
        
        {/* Modal Header (Soft, Clean, Editorial — Removed NEARMART ACCOUNT Badge) */}
        <div className="p-5 sm:p-6 pb-0 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-stone-200/60 dark:hover:bg-slate-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="pr-8">
            <h3 className="font-serif text-2xl font-black text-stone-900 dark:text-white leading-tight">
              {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-normal leading-relaxed">
              {mode === 'login'
                ? 'Sign in to access your local orders and store dashboard'
                : 'Join your neighborhood marketplace community'}
            </p>
          </div>

          {/* Mode Switcher Tabs (Segmented Control) */}
          <div className="grid grid-cols-2 bg-[#EFECE6] dark:bg-slate-800 p-1 rounded-xl border border-[#E5DFD5] dark:border-slate-700 mt-4">
            <button
              type="button"
              onClick={() => handleModeSwitch('login')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs border border-[#E5DFD5] dark:border-slate-700'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white font-medium'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('register')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs border border-[#E5DFD5] dark:border-slate-700'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white font-medium'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <div className="p-5 sm:p-6 space-y-3.5">
          
          {/* Account Type Segmented Selector — Shown during registration */}
          {mode === 'register' && (
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">Account Type</span>
              <div className="grid grid-cols-3 gap-1.5 bg-[#EFECE6] dark:bg-slate-800 p-1 rounded-xl border border-[#E5DFD5] dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSelectedRole('customer')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    selectedRole === 'customer'
                      ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 border border-[#E5DFD5] dark:border-slate-700 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 font-medium hover:text-stone-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('owner')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    selectedRole === 'owner'
                      ? 'bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-400 border border-[#E5DFD5] dark:border-slate-700 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 font-medium hover:text-stone-900'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Merchant</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('admin')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    selectedRole === 'admin'
                      ? 'bg-white dark:bg-slate-900 text-blue-800 dark:text-blue-400 border border-[#E5DFD5] dark:border-slate-700 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 font-medium hover:text-stone-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="bg-rose-50 text-rose-800 border border-rose-200 p-2.5 rounded-xl flex items-start space-x-2 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {mode === 'login' ? (
              <>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 text-sm text-stone-900 dark:text-stone-100 pl-8.5 pr-3 py-2 rounded-xl border border-[#E5DFD5] dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800/15 focus:border-emerald-800 transition-colors"
                      autoComplete="username"
                    />
                    <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 text-sm text-stone-900 dark:text-stone-100 pl-8.5 pr-10 py-2 rounded-xl border border-[#E5DFD5] dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800/15 focus:border-emerald-800 transition-colors"
                      autoComplete="current-password"
                    />
                    <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2 text-stone-400 hover:text-stone-600 transition cursor-pointer"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* 2-Column Grid: First Name & Last Name */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">First Name <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 text-sm text-stone-900 dark:text-stone-100 px-3 py-1.5 rounded-xl border border-[#E5DFD5] dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800/15 focus:border-emerald-800 transition-colors"
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">Last Name</label>
                    <input
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 text-sm text-stone-900 dark:text-stone-100 px-3 py-1.5 rounded-xl border border-[#E5DFD5] dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800/15 focus:border-emerald-800 transition-colors"
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                {/* 2-Column Grid: Username & Phone */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">Username <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 text-sm text-stone-900 dark:text-stone-100 pl-8 pr-2.5 py-1.5 rounded-xl border border-[#E5DFD5] dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800/15 focus:border-emerald-800 transition-colors"
                        autoComplete="username"
                      />
                      <User className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">Phone Number</label>
                    <div className="relative">
                      <input
                        type="tel"
                        placeholder="+92 300 1234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 text-sm text-stone-900 dark:text-stone-100 pl-8 pr-2.5 py-1.5 rounded-xl border border-[#E5DFD5] dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800/15 focus:border-emerald-800 transition-colors"
                        autoComplete="tel"
                      />
                      <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">Email Address <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 text-sm text-stone-900 dark:text-stone-100 pl-8 pr-3 py-1.5 rounded-xl border border-[#E5DFD5] dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800/15 focus:border-emerald-800 transition-colors"
                      autoComplete="email"
                    />
                    <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">Password <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      className="w-full bg-white dark:bg-slate-900 text-sm text-stone-900 dark:text-stone-100 pl-8 pr-9 py-1.5 rounded-xl border border-[#E5DFD5] dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800/15 focus:border-emerald-800 transition-colors"
                      autoComplete="new-password"
                    />
                    <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600 transition cursor-pointer"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Action Submit Button (Matching Landing Page CTA) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Footer hint */}
          <p className="text-center text-xs text-stone-500 font-normal pt-1">
            {mode === 'login'
              ? "Don't have an account? Switch to Register above."
              : 'Already have an account? Switch to Sign In above.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
