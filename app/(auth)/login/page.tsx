'use client';
import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSiteUrl } from '@/lib/config/site';

type Tab = 'login' | 'signup';

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackError = searchParams.get('error');

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showMagicLink, setShowMagicLink] = useState(false);

  async function handlePasswordAuth(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError(null);
    const supabase = createClient();

    if (tab === 'signup') {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        setStatus('error');
        setError(signUpError.message);
        return;
      }
      setStatus('success');
      return;
    }

    // Login
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setStatus('error');
      setError(signInError.message);
      return;
    }

    // Fetch role and redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .single();

    const role = profile?.role ?? 'student';
    router.push(role === 'teacher' ? '/teacher/dashboard' : '/student/home');
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${getSiteUrl()}/auth/callback` },
    });
    if (authError) {
      setStatus('error');
      setError(authError.message);
      return;
    }
    setStatus('sent');
  }

  function reset() {
    setStatus('idle');
    setError(null);
    setPassword('');
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 rounded border p-6">
        <h1 className="text-xl font-semibold">
          {tab === 'login' ? '로그인' : '회원가입'}
        </h1>

        {callbackError && status === 'idle' && (
          <p className="text-sm text-red-700">로그인 실패: {callbackError}</p>
        )}

        {/* Tab toggle */}
        <div className="flex border-b text-sm">
          <button
            type="button"
            onClick={() => { setTab('login'); reset(); }}
            className={`px-3 py-1.5 ${tab === 'login' ? 'border-b-2 border-black font-medium' : 'text-gray-500'}`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); reset(); }}
            className={`px-3 py-1.5 ${tab === 'signup' ? 'border-b-2 border-black font-medium' : 'text-gray-500'}`}
          >
            회원가입
          </button>
        </div>

        {status === 'success' && tab === 'signup' ? (
          <div className="space-y-2">
            <p className="text-sm text-green-700">
              가입 완료! 이제 로그인 탭에서 로그인하세요.
            </p>
            <button
              type="button"
              onClick={() => { setTab('login'); reset(); }}
              className="text-sm text-gray-600 underline"
            >
              로그인으로 이동
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordAuth} className="space-y-3">
            <input
              type="email"
              required
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border px-3 py-2"
              disabled={status === 'loading'}
            />
            <input
              type="password"
              required
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border px-3 py-2"
              minLength={6}
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-50"
              disabled={status === 'loading'}
            >
              {status === 'loading'
                ? '처리 중…'
                : tab === 'login'
                  ? '로그인'
                  : '가입하기'}
            </button>
          </form>
        )}

        {status === 'error' && error && (
          <p className="text-sm text-red-700">{error}</p>
        )}

        {/* Magic link fallback */}
        {tab === 'login' && (
          <div className="border-t pt-3">
            {!showMagicLink ? (
              <button
                type="button"
                onClick={() => setShowMagicLink(true)}
                className="text-xs text-gray-400 hover:underline"
              >
                매직 링크로 로그인
              </button>
            ) : status === 'sent' ? (
              <div className="space-y-2">
                <p className="text-sm text-green-700">
                  이메일을 확인해 주세요. 링크를 클릭하면 로그인됩니다.
                </p>
                <button type="button" onClick={reset} className="text-sm text-gray-600 underline">
                  다시 시도
                </button>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-2">
                <input
                  type="email"
                  required
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm"
                  disabled={status === 'loading'}
                />
                <button
                  type="submit"
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? '전송 중…' : '매직 링크 받기'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
