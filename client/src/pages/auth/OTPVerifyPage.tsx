import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { KeyRound, RefreshCw, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';

export const OTPVerifyPage: React.FC = () => {
  const { verifyOTP, resendOTP } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const stateIdentifier = location.state?.identifier || '';
  const stateType = location.state?.type || 'registration';

  const [identifier, setIdentifier] = useState(stateIdentifier);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Timer countdown
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    // Auto advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().slice(0, 6);
    if (/^\d+$/.test(pasted)) {
      const newDigits = [...digits];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      if (pasted.length === 6) {
        inputRefs.current[5]?.focus();
      }
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) {
      showToast('Please enter the complete 6-digit verification code.', 'error');
      return;
    }

    if (!identifier) {
      showToast('Identifier missing. Please re-enter email or phone.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOTP(identifier, code, stateType);
      showToast('Verification successful!', 'success');
      if (stateType === 'reset_password') {
        navigate('/reset-password', { state: { identifier, otp_code: code } });
      } else {
        navigate('/chat');
      }
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Invalid or expired OTP code.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !identifier) return;
    try {
      await resendOTP(identifier, stateType);
      showToast('A fresh OTP code has been sent.', 'success');
      setCountdown(60);
      setCanResend(false);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to resend OTP.', 'error');
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
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Enter Verification Code</h2>
          <p className="text-xs text-nova-muted mt-2">
            We sent a 6-digit verification code to
          </p>
          <p className="text-sm font-semibold text-nova-accent mt-0.5">
            {identifier || 'your email or phone'}
          </p>
        </div>

        {!stateIdentifier && (
          <div className="mb-6">
            <label className="block text-xs font-semibold text-nova-muted uppercase tracking-wider mb-2">
              Email or Phone Number
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="alex@example.com"
              className="w-full bg-nova-dark border border-nova-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-nova-muted focus:outline-none focus:border-nova-primary focus:ring-1 focus:ring-nova-primary transition-all"
            />
          </div>
        )}

        {/* 6 Digit Inputs */}
        <form onSubmit={handleVerify}>
          <div className="flex justify-between gap-2 mb-8" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 text-center text-xl font-bold bg-nova-dark border border-nova-border rounded-xl text-white focus:outline-none focus:border-nova-primary focus:ring-2 focus:ring-nova-primary/50 transition-all shadow-inner"
              />
            ))}
          </div>

          <Button type="submit" variant="primary" fullWidth isLoading={isLoading} className="mb-4">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Verify & Continue
          </Button>
        </form>

        {/* Resend actions */}
        <div className="text-center text-xs text-nova-muted">
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="inline-flex items-center gap-1.5 text-nova-primary font-semibold hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Resend Code
            </button>
          ) : (
            <span>
              Resend code in <strong className="text-white">{countdown}s</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default OTPVerifyPage;
