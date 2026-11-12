import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !email || !password) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    if (password.length < 8) {
      showToast('Password must be at least 8 characters long.', 'error');
      return;
    }

    if (!agreeTerms) {
      showToast('Please agree to the Terms of Service and Privacy Policy.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const parts = (fullName || username).trim().split(' ');
      const firstName = parts[0] || username;
      const lastName = parts.slice(1).join(' ') || '';

      const res = await register({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        phone_number: phoneNumber ? phoneNumber.trim() : undefined,
        password,
        password_confirm: confirmPassword || password,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName.trim() || username.trim(),
      });

      if (res.requires_otp) {
        showToast('Registration successful! Please verify your OTP code.', 'success');
        navigate('/verify-otp', { state: { identifier: email, type: 'registration' } });
      } else {
        showToast('Account created successfully! Welcome to ChatNova.', 'success');
        navigate('/chat');
      }
    } catch (err: any) {
      let msg = 'Registration failed.';
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          msg = data;
        } else if (data.detail) {
          msg = data.detail;
        } else if (data.message) {
          msg = data.message;
        } else if (typeof data === 'object') {
          // Extract first validation error
          const keys = Object.keys(data);
          if (keys.length > 0) {
            const firstKey = keys[0];
            const val = data[firstKey];
            const errorText = Array.isArray(val) ? val[0] : String(val);
            msg = firstKey === 'non_field_errors' ? errorText : `${firstKey}: ${errorText}`;
          }
        }
      } else if (err.message && err.message.includes('Network Error')) {
        msg = 'Cannot connect to backend server. Please verify the server is running on port 8000.';
      }
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nova-dark flex items-center justify-center p-4 selection:bg-nova-primary selection:text-white">
      <div className="w-full max-w-lg bg-nova-card border border-nova-border rounded-3xl p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
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
          <h2 className="text-xl font-bold text-white">Create Your Account</h2>
          <p className="text-xs text-nova-muted mt-1">Join the next-generation secure communication platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="Alex Walker"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              icon={<User className="w-4 h-4" />}
            />
            <Input
              label="Username"
              type="text"
              placeholder="alexwalker"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
              icon={<span className="text-xs font-bold text-nova-muted">@</span>}
              required
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            placeholder="alex@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />}
            required
          />

          <Input
            label="Phone Number (Optional)"
            type="tel"
            placeholder="+1 555 123 4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            icon={<Phone className="w-4 h-4" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-nova-muted hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Input
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<ShieldCheck className="w-4 h-4" />}
              required
            />
          </div>

          {/* Terms checkbox */}
          <div className="flex items-start gap-2 pt-2">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-nova-border bg-nova-dark text-nova-primary focus:ring-nova-primary"
            />
            <label htmlFor="terms" className="text-xs text-nova-muted leading-relaxed">
              I agree to ChatNova's{' '}
              <Link to="/terms" className="text-nova-accent hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-nova-accent hover:underline">
                Privacy Policy
              </Link>
              , including end-to-end encryption protocols.
            </label>
          </div>

          <Button type="submit" variant="primary" fullWidth isLoading={isLoading} className="mt-4">
            Create Account <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-nova-border/50 text-xs text-nova-muted">
          Already have a ChatNova account?{' '}
          <Link to="/login" className="text-nova-primary font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
