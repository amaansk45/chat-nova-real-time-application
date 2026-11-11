import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

export const LoginPage: React.FC = () => {
  const { login, verify2FA } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 2FA state
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAIdentifier, setTwoFAIdentifier] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      showToast('Please fill in both identifier and password.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(identifier, password);
      if (res.requires_2fa) {
        setTwoFAIdentifier(res.identifier || identifier);
        setIs2FAModalOpen(true);
        showToast('Two-Factor Authentication code required.', 'info');
      } else {
        showToast('Welcome back to ChatNova!', 'success');
        navigate('/chat');
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid email or password.';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFACode) return;
    setIsLoading(true);
    try {
      await verify2FA(twoFAIdentifier, twoFACode);
      setIs2FAModalOpen(false);
      showToast('2FA verification successful!', 'success');
      navigate('/chat');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Invalid 2FA code.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nova-dark flex items-center justify-center p-4 selection:bg-nova-primary selection:text-white">
      <div className="w-full max-w-md bg-nova-card border border-nova-border rounded-3xl p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-nova-primary to-nova-accent p-0.5 shadow-lg shadow-blue-500/20">
              <div className="w-full h-full bg-nova-dark rounded-[14px] flex items-center justify-center">
                <span className="text-xl font-black bg-gradient-to-tr from-nova-primary to-nova-accent bg-clip-text text-transparent">
                  N
                </span>
              </div>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">ChatNova</span>
          </Link>
          <h2 className="text-xl font-bold text-white">Sign In to Your Account</h2>
          <p className="text-xs text-nova-muted mt-1">Connect, communicate, and share securely</p>
        </div>

        {/* Mode Toggle (Email / Phone) */}
        <div className="flex bg-nova-dark p-1 rounded-xl mb-6 border border-nova-border">
          <button
            type="button"
            onClick={() => setMode('email')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'email' ? 'bg-nova-card text-white shadow-md' : 'text-nova-muted hover:text-white'
            }`}
          >
            Email Address
          </button>
          <button
            type="button"
            onClick={() => setMode('phone')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'phone' ? 'bg-nova-card text-white shadow-md' : 'text-nova-muted hover:text-white'
            }`}
          >
            Phone Number
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label={mode === 'email' ? 'Email Address' : 'Phone Number'}
            type={mode === 'email' ? 'email' : 'tel'}
            placeholder={mode === 'email' ? 'name@chatnova.io' : '+1234567890'}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            icon={mode === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            required
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-nova-muted">Password</label>
              <Link to="/forgot-password" className="text-xs text-nova-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-nova-muted hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />
          </div>

          <Button type="submit" size="lg" variant="primary" isLoading={isLoading} className="mt-2 w-full">
            Sign In <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="mt-8 text-center text-xs text-nova-muted">
          Don't have an account?{' '}
          <Link to="/register" className="text-nova-primary font-semibold hover:underline">
            Create account
          </Link>
        </div>
      </div>

      {/* 2FA Verification Modal */}
      <Modal
        isOpen={is2FAModalOpen}
        onClose={() => setIs2FAModalOpen(false)}
        title="Two-Factor Authentication"
        description="Enter the 6-digit security code sent to your account."
      >
        <form onSubmit={handle2FASubmit} className="flex flex-col gap-4 mt-2">
          <Input
            type="text"
            placeholder="123456"
            value={twoFACode}
            onChange={(e) => setTwoFACode(e.target.value)}
            maxLength={6}
            className="text-center text-xl tracking-widest font-mono"
            required
          />
          <Button type="submit" variant="primary" isLoading={isLoading} className="w-full">
            Verify & Sign In
          </Button>
        </form>
      </Modal>
    </div>
  );
};

export default LoginPage;
