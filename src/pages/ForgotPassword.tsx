
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'newPassword'>('email');
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSendResetLink = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Reset Code Sent!",
      description: `A verification code has been sent to ${email}`,
    });
    
    setStep('otp');
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length === 6) {
      toast({
        title: "Code Verified!",
        description: "Please create a new password",
      });
      
      setStep('newPassword');
    } else {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit verification code",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match",
        variant: "destructive",
      });
      return;
    }
    
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Password Reset Successfully!",
      description: "You can now login with your new password",
    });
    
    // Reset form state
    setEmail('');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setStep('email');
    
    // Redirect to login page
    navigate('/login');
  };

  const handleOTPChange = (value: string) => {
    setOtp(value);
  };

  const renderEmailStep = () => (
    <form onSubmit={handleSendResetLink} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          className="input-dark"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full">
        <Mail className="mr-2 h-4 w-4" />
        Send Reset Code
      </Button>
    </form>
  );

  const renderOTPStep = () => (
    <form onSubmit={handleVerifyOTP} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="otp">Verification Code</Label>
        <p className="text-sm text-muted-foreground mb-2">
          We've sent a 6-digit code to {email}
        </p>
        <div className="flex justify-center my-4">
          <InputOTP maxLength={6} value={otp} onChange={handleOTPChange}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
      </div>
      <Button 
        type="submit" 
        className="w-full"
        disabled={otp.length !== 6}
      >
        Verify Code
      </Button>
      <Button 
        type="button" 
        variant="outline" 
        className="w-full"
        onClick={() => setStep('email')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Email
      </Button>
    </form>
  );

  const renderNewPasswordStep = () => (
    <form onSubmit={handleResetPassword} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Must have at least 8 characters"
          className="input-dark"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm your new password"
          className="input-dark"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Reset Password
      </Button>
    </form>
  );

  return (
    <div className="flex flex-col items-center min-h-screen bg-background">
      <div className="w-full text-center py-12">
        <h1 className="text-5xl font-bold text-primary">TaskLoop</h1>
      </div>

      <div className="w-full max-w-md px-4 md:px-0">
        <div className="border-border bg-card p-6 rounded-lg shadow-md space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-accent"></div>
          
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-center">Reset Password</h2>
            <p className="text-center text-muted-foreground text-sm">
              {step === 'email' && "Enter your email to receive a reset code"}
              {step === 'otp' && "Enter the verification code sent to your email"}
              {step === 'newPassword' && "Create a new password for your account"}
            </p>
          </div>
          
          <div className="space-y-6">
            {step === 'email' && renderEmailStep()}
            {step === 'otp' && renderOTPStep()}
            {step === 'newPassword' && renderNewPasswordStep()}
            
            <div className="text-center text-sm">
              Remember your password?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
