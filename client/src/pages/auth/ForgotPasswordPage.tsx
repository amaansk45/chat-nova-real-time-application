import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export const ForgotPasswordPage: React.FC = () => {
  const { forgotPassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      showToast('Please enter your email or registered phone number.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(identifier);
      showToast('Password reset code sent! Please check your messages.', 'success');
      navigate('/verify-otp', {
        state: {
          identifier,
          type: 'reset_password',
        },
      });
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to send reset code. Please check your identifier.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nova-dark flex items-center justify-center p-4 selection:bg-nova-primary selection:text-white">
      <div className="w-full max-w-md bg-nova-card border border-nova-border rounded-3xl p-8 shadow-2xl">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-nova-muted hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>

        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-nova-primary/10 border border-nova-primary/30 flex items-center justify-center text-nova-primary mb-4 shadow-lg shadow-blue-500/10">
            <Mail className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Forgot Your Password?</h2>
          <p className="text-xs text-nova-muted mt-2">
            No worries! Enter your registered email or phone number and we'll dispatch a 6-digit recovery code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email or Phone Number"
            type="text"
            placeholder="alex@example.com or +15551234567"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
            <Send className="w-4 h-4 mr-2" /> Send Reset Code
          </Button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-nova-border/50 text-xs text-nova-muted">
          Remember your password?{' '}
          <Link to="/login" className="text-nova-primary font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
