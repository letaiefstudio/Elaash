import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const field = 'h-12 w-full rounded-2xl border border-blush bg-ivory px-4 text-sm text-charcoal outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/15';

export default function CustomerAuth() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.replace('/account');
    });
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage('');
    setError('');

    if (mode === 'forgot') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/account`,
      });
      setBusy(false);
      if (resetError) setError(resetError.message);
      else setMessage('Password reset email sent.');
      return;
    }

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/account`,
          data: { full_name: fullName.trim(), phone: phone.trim() },
        },
      });
      setBusy(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) window.location.replace('/account');
      else setMessage('Account created. Please check your email to confirm your account.');
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) setError(signInError.message);
    else window.location.replace('/account');
  };

  if (!isSupabaseConfigured) {
    return <div className="min-h-dvh bg-ivory p-6 text-charcoal"><div className="mx-auto mt-20 max-w-lg rounded-3xl border border-blush bg-cream p-7"><h1 className="font-serif text-3xl text-burgundy">Supabase connection required</h1><p className="mt-3 text-sm leading-6 text-muted">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment before using customer accounts.</p></div></div>;
  }

  return (
    <main className="customer-auth-page min-h-dvh bg-ivory px-4 py-8 text-charcoal sm:px-6 sm:py-12">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-5xl overflow-hidden rounded-[2rem] border border-blush bg-cream shadow-2xl lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden overflow-hidden bg-burgundy p-10 text-cream lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #C4963A 0 2px, transparent 2px), radial-gradient(circle at 80% 60%, #EDD5D0 0 2px, transparent 2px)', backgroundSize: '52px 52px' }} />
          <div className="relative">
            <img src="/images/logo.png" alt="Elaash" className="h-20 w-auto brightness-0 invert" />
            <p className="mt-10 text-xs font-semibold uppercase tracking-[0.34em] text-gold">My Elaash</p>
            <h1 className="mt-4 max-w-sm font-serif text-5xl leading-tight">Your appointments and packages, in one place.</h1>
          </div>
          <p className="relative max-w-sm text-sm leading-7 text-cream/75">Sign in to see upcoming appointments, previous visits and the packages assigned to your account.</p>
        </section>

        <section className="flex items-center justify-center p-5 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-burgundy hover:text-burgundy-dark">← Back to Elaash</a>
            <img src="/images/logo.png" alt="Elaash" className="mx-auto mt-5 h-20 w-auto lg:hidden" />
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.28em] text-gold">My Elaash</p>
            <h2 className="mt-2 font-serif text-4xl text-burgundy">{mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{mode === 'signup' ? 'Register to keep your salon visits and packages together.' : mode === 'forgot' ? 'Enter your email and we will send you a reset link.' : 'Sign in to your customer account.'}</p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              {mode === 'signup' && <>
                <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Full name</span><input className={field} value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required /></label>
                <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Phone number</span><input className={field} value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" /></label>
              </>}
              <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Email</span><input className={field} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
              {mode !== 'forgot' && <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Password</span><input className={field} type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /></label>}

              {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              {message && <p className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-burgundy">{message}</p>}

              <button disabled={busy} className="h-12 w-full rounded-full bg-burgundy px-5 text-sm font-bold text-cream transition hover:bg-burgundy-dark disabled:opacity-60">{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}</button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
              {mode === 'signin' && <button type="button" onClick={() => { setMode('forgot'); setError(''); setMessage(''); }} className="font-semibold text-muted hover:text-burgundy">Forgot password?</button>}
              {mode === 'forgot' && <button type="button" onClick={() => { setMode('signin'); setError(''); setMessage(''); }} className="font-semibold text-muted hover:text-burgundy">Back to sign in</button>}
              {mode !== 'forgot' && <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); }} className="ml-auto font-semibold text-burgundy hover:text-burgundy-dark">{mode === 'signin' ? 'Create an account' : 'Already have an account? Sign in'}</button>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
