import { useState } from 'react';
import {
  AlertTriangle,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { AUTH_PASSWORD_MIN_LENGTH } from '../../config/authConfig';
import { useAuth } from '../../auth/AuthContext';

const AuthShell = ({ children, eyebrow = 'Major League Builders', title, description }) => (
  <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900">
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg items-center">
      <div className="w-full overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-slate-50 px-7 py-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{title}</h1>
          {description && <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>}
        </div>
        <div className="p-7">{children}</div>
      </div>
    </div>
  </div>
);

const ErrorMessage = ({ error }) => {
  if (!error) return null;
  return (
    <div className="mb-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertTriangle className="mt-0.5 shrink-0" size={18} />
      <span>{error.message || String(error)}</span>
    </div>
  );
};

const LoginForm = () => {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [message, setMessage] = useState('');

  const submitLogin = async (event) => {
    event.preventDefault();
    setMessage('');
    await auth.login({ email, password }).catch(() => {});
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await auth.requestPasswordReset(email);
      setMessage('If an account exists for that email, a password-reset message has been sent.');
    } catch {
      // The shared error panel provides the actionable failure without exposing account existence.
    }
  };

  return (
    <AuthShell
      title={forgotMode ? 'Reset your password' : 'Sign in to the dashboard'}
      description={forgotMode
        ? 'Enter your approved account email. The recovery link returns you to this dashboard to choose a new password.'
        : 'Access is limited to invited Major League Builders users with an active dashboard profile.'}
    >
      <ErrorMessage error={auth.actionError} />
      {message && <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{message}</div>}

      <form className="space-y-4" onSubmit={forgotMode ? submitReset : submitLogin}>
        <label className="block text-sm font-bold text-slate-700">
          Email address
          <div className="mt-1 flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
            <Mail size={18} className="text-slate-400" />
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full border-0 bg-transparent px-3 py-3 text-sm outline-none"
              placeholder="name@company.com"
            />
          </div>
        </label>

        {!forgotMode && (
          <label className="block text-sm font-bold text-slate-700">
            Password
            <div className="mt-1 flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
              <KeyRound size={18} className="text-slate-400" />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border-0 bg-transparent px-3 py-3 text-sm outline-none"
                placeholder="Your password"
              />
            </div>
          </label>
        )}

        <button
          type="submit"
          disabled={auth.working}
          className="flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {auth.working && <Loader2 className="mr-2 animate-spin" size={18} />}
          {forgotMode ? 'Send recovery email' : 'Sign in'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          auth.clearActionError();
          setMessage('');
          setForgotMode((current) => !current);
        }}
        className="mt-5 w-full text-center text-sm font-bold text-blue-700 hover:text-blue-900"
      >
        {forgotMode ? 'Return to sign in' : 'Forgot your password?'}
      </button>

      <div className="mt-6 flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
        <ShieldCheck className="mt-0.5 shrink-0 text-slate-700" size={18} />
        <p>There is no public registration. Account access must be issued by an authorized MLB Dashboard administrator.</p>
      </div>
    </AuthShell>
  );
};

const PasswordRecoveryForm = () => {
  const auth = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) return;
    await auth.completePasswordRecovery(password).catch(() => {});
  };

  const mismatch = confirmPassword && password !== confirmPassword;

  return (
    <AuthShell
      title="Choose a new password"
      description={`Use at least ${AUTH_PASSWORD_MIN_LENGTH} characters. This password is stored and verified by Supabase Auth, not by the dashboard database.`}
    >
      <ErrorMessage error={auth.actionError} />
      <form className="space-y-4" onSubmit={submit}>
        <label className="block text-sm font-bold text-slate-700">
          New password
          <input
            type="password"
            autoComplete="new-password"
            minLength={AUTH_PASSWORD_MIN_LENGTH}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block text-sm font-bold text-slate-700">
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            minLength={AUTH_PASSWORD_MIN_LENGTH}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        {mismatch && <p className="text-sm font-bold text-red-700">The passwords do not match.</p>}
        <button
          type="submit"
          disabled={auth.working || Boolean(mismatch)}
          className="flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {auth.working && <Loader2 className="mr-2 animate-spin" size={18} />}
          Save new password
        </button>
      </form>
    </AuthShell>
  );
};

const AccessBlocked = ({ title, description }) => {
  const auth = useAuth();
  return (
    <AuthShell title={title} description={description}>
      <ErrorMessage error={auth.error || auth.actionError} />
      <button
        type="button"
        onClick={() => auth.logout().catch(() => {})}
        disabled={auth.working}
        className="flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50 disabled:opacity-60"
      >
        <LogOut className="mr-2" size={18} /> Sign out
      </button>
    </AuthShell>
  );
};

export default function AuthGate({ children }) {
  const auth = useAuth();

  if (!auth.ready) {
    return (
      <AuthShell title="Verifying access" description="Checking the authentication session and dashboard profile.">
        <div className="flex items-center justify-center py-8 text-slate-600">
          <Loader2 className="mr-3 animate-spin" size={24} />
          <span className="font-bold">Loading secure session…</span>
        </div>
      </AuthShell>
    );
  }

  if (auth.recoveryRequired) return <PasswordRecoveryForm />;
  if (auth.accessGranted) return children;
  if (auth.accessState === 'signed_out') return <LoginForm />;

  if (auth.accessState === 'configuration_error') {
    return <AccessBlocked title="Authentication is not configured" description="Supabase authentication is selected, but the required browser environment values are missing." />;
  }

  if (auth.accessState === 'inactive') {
    return <AccessBlocked title="Account inactive" description="This dashboard profile has been deactivated. Contact an MLB Dashboard owner or business administrator." />;
  }

  if (auth.accessState === 'unlinked') {
    return <AccessBlocked title="Profile link required" description="Your authentication account exists, but it is not linked to an approved MLB Dashboard user profile." />;
  }

  if (auth.accessState === 'invited') {
    return (
      <AuthShell title="Finishing account activation" description="The invitation is valid, but the dashboard profile has not finished activating.">
        <ErrorMessage error={auth.error || auth.actionError} />
        <button type="button" onClick={() => auth.refresh()} disabled={auth.working} className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60">
          Retry activation
        </button>
      </AuthShell>
    );
  }

  return <AccessBlocked title="Dashboard access unavailable" description="The secure session could not be completed. Sign out and try again, or contact an administrator." />;
}
