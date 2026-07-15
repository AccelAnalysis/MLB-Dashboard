import { useState } from 'react';
import { AUTH_PASSWORD_MIN_LENGTH } from '../../config/authConfig';
import { useAuth } from '../../auth/AuthContext';

const AuthShell = ({ eyebrow, title, description, children }) => (
  <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900">
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
      <div className="grid w-full overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden bg-slate-900 p-12 text-white lg:block">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">Major League Builders</p>
          <h1 className="mt-5 text-4xl font-black leading-tight">Production visibility with controlled operational access.</h1>
          <p className="mt-5 max-w-xl text-lg font-medium leading-8 text-slate-300">
            The dashboard replaces the production whiteboard and Critical Path Book while protecting customer, financial, sales, and workflow data by role.
          </p>
          <div className="mt-10 space-y-4 text-sm font-semibold text-slate-300">
            <p>• Invitation-only accounts</p>
            <p>• Role-based sales, production, financial, and administrative access</p>
            <p>• Shared records protected by database Row Level Security</p>
          </div>
        </section>

        <section className="p-7 sm:p-10 lg:p-12">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">{title}</h2>
          {description && <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>}
          <div className="mt-8">{children}</div>
        </section>
      </div>
    </div>
  </div>
);

const Message = ({ children, tone = 'red' }) => {
  const tones = {
    red: 'border-red-200 bg-red-50 text-red-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
  };
  return <div className={`rounded-xl border p-4 text-sm font-semibold ${tones[tone] || tones.red}`}>{children}</div>;
};

const SignInScreen = () => {
  const { login, requestPasswordReset, working, actionError, clearActionError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [notice, setNotice] = useState('');

  const submitLogin = async (event) => {
    event.preventDefault();
    setNotice('');
    clearActionError();
    await login({ email, password });
  };

  const submitRecovery = async (event) => {
    event.preventDefault();
    setNotice('');
    clearActionError();
    await requestPasswordReset(email);
    setNotice('Password-reset instructions were sent when the address matches an invited or active account.');
  };

  return (
    <AuthShell
      eyebrow={recoveryMode ? 'Account recovery' : 'Secure sign in'}
      title={recoveryMode ? 'Reset your password' : 'Sign in to the dashboard'}
      description={recoveryMode
        ? 'Enter the email address connected to your MLB Dashboard account.'
        : 'Use the email and password associated with your invitation.'}
    >
      <form onSubmit={recoveryMode ? submitRecovery : submitLogin} className="space-y-5">
        {actionError && <Message>{actionError.message || 'The authentication request failed.'}</Message>}
        {notice && <Message tone="blue">{notice}</Message>}

        <label className="block text-sm font-bold text-slate-700">
          Email address
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
          />
        </label>

        {!recoveryMode && (
          <label className="block text-sm font-bold text-slate-700">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
            />
          </label>
        )}

        <button
          type="submit"
          disabled={working}
          className="w-full rounded-xl bg-slate-950 px-5 py-3.5 text-base font-black text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
        >
          {working ? 'Working…' : recoveryMode ? 'Send reset instructions' : 'Sign in'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          clearActionError();
          setNotice('');
          setRecoveryMode((current) => !current);
        }}
        className="mt-5 text-sm font-bold text-blue-700 hover:text-blue-900"
      >
        {recoveryMode ? 'Return to sign in' : 'Forgot your password?'}
      </button>
    </AuthShell>
  );
};

const PasswordCompletionScreen = () => {
  const {
    profile,
    recoveryRequired,
    completePasswordRecovery,
    working,
    actionError,
    clearActionError,
  } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [localError, setLocalError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    clearActionError();
    setLocalError('');

    if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
      setLocalError(`Password must contain at least ${AUTH_PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirmation) {
      setLocalError('The password confirmation does not match.');
      return;
    }

    await completePasswordRecovery(password);

    const url = new URL(window.location.href);
    url.searchParams.delete('authAction');
    url.searchParams.delete('type');
    url.hash = '';
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  };

  const invited = profile?.status === 'invited';

  return (
    <AuthShell
      eyebrow={invited ? 'Accept invitation' : 'Password recovery'}
      title={invited ? 'Create your dashboard password' : 'Choose a new password'}
      description={invited
        ? `Complete the invitation for ${profile?.email || 'your account'}. Your profile becomes active only after this step succeeds.`
        : 'Set a new password to finish recovering your account.'}
    >
      <form onSubmit={submit} className="space-y-5">
        {(localError || actionError) && <Message>{localError || actionError?.message}</Message>}
        {!recoveryRequired && invited && <Message tone="amber">Your invitation still requires a password before dashboard access can be activated.</Message>}

        <label className="block text-sm font-bold text-slate-700">
          New password
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
          />
        </label>

        <label className="block text-sm font-bold text-slate-700">
          Confirm password
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
          />
        </label>

        <p className="text-xs font-semibold text-slate-500">Minimum length: {AUTH_PASSWORD_MIN_LENGTH} characters.</p>

        <button
          type="submit"
          disabled={working}
          className="w-full rounded-xl bg-blue-700 px-5 py-3.5 text-base font-black text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
        >
          {working ? 'Updating…' : invited ? 'Create password and activate account' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  );
};

const AccessBlockedScreen = ({ state, error, logout, working }) => {
  const content = {
    inactive: {
      eyebrow: 'Account inactive',
      title: 'Dashboard access has been disabled',
      description: 'Your authentication account is valid, but the MLB Dashboard profile is inactive. Contact an owner or business administrator.',
    },
    unlinked: {
      eyebrow: 'Profile not linked',
      title: 'This account is not connected to the dashboard',
      description: 'An administrator must link this authentication account to an MLB Dashboard user profile.',
    },
    configuration_error: {
      eyebrow: 'Configuration required',
      title: 'Authentication is not configured',
      description: 'Supabase authentication was selected, but the required project URL or publishable key is missing.',
    },
    error: {
      eyebrow: 'Access check failed',
      title: 'The dashboard could not verify your access',
      description: error?.message || 'Review the authentication configuration and database migrations.',
    },
  }[state] || {
    eyebrow: 'Access unavailable',
    title: 'The dashboard cannot be opened',
    description: error?.message || 'Contact an administrator.',
  };

  return (
    <AuthShell {...content}>
      {error && <Message>{error.message}</Message>}
      <button
        type="button"
        onClick={logout}
        disabled={working}
        className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-800 hover:bg-slate-50 disabled:opacity-60"
      >
        Sign out
      </button>
    </AuthShell>
  );
};

export default function AuthenticationGate({ children }) {
  const auth = useAuth();

  if (!auth.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-blue-400" />
          <p className="mt-4 text-sm font-bold">Verifying dashboard access…</p>
        </div>
      </div>
    );
  }

  if (auth.accessState === 'signed_out') return <SignInScreen />;
  if (auth.recoveryRequired || auth.accessState === 'invited') return <PasswordCompletionScreen />;
  if (auth.accessState !== 'active') {
    return <AccessBlockedScreen state={auth.accessState} error={auth.error} logout={auth.logout} working={auth.working} />;
  }

  return children;
}
