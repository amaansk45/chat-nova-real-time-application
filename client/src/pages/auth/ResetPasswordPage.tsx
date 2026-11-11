import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export const ResetPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState(location.state?.identifier || '');
  const [otpCode, setOtpCode] = useState(location.state?.otp_code || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier || !otpCode || !newPassword) {
      showToast('All fields are required.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters long.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(identifier, otpCode, newPassword);
      showToast('Password has been reset successfully! Please sign in.', 'success');
      navigate('/login');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to reset password. Verify the code and try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nova-dark flex items-center justify-center p-4 selection:bg-nova-primary selection:text-white">
      <div className="w-full max-w-md bg-nova-card border border-nova-border rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-nova-primary/10 border border-nova-primary/30 flex items-center justify-center text-nova-primary mb-4 shadow-lg shadow-blue-500/10">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Reset Your Password</h2>
          <p className="text-xs text-nova-muted mt-2">
            Create a strong, secure password with at least 8 characters.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!location.state?.identifier && (
            <Input
              label="Email or Phone Number"
              type="text"
              placeholder="alex@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          )}

          {!location.state?.otp_code && (
            <Input
              label="6-Digit Reset Code"
              type="text"
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              required
            />
          )}

          <div className="relative">
            <Input
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
            label="Confirm New Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<ShieldCheck className="w-4 h-4" />}
            required
          />

          <Button type="submit" variant="primary" fullWidth isLoading={isLoading} className="mt-4">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Set New Password
          </Button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-nova-border/50 text-xs text-nova-muted">
          Back to{' '}
          <Link to="/login" className="text-nova-primary font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
