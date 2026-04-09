'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSiteUrl } from '@/lib/config/site';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${getSiteUrl()}/auth/confirm` },
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
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded border p-6">
        <h1 className="text-xl font-semibold">로그인</h1>
        {callbackError && status === 'idle' && (
          <p className="text-sm text-red-700">로그인 실패: {callbackError}</p>
        )}
        <input
          type="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border px-3 py-2"
          disabled={status === 'sending' || status === 'sent'}
        />
        <button
          type="submit"
          className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-50"
          disabled={status === 'sending' || status === 'sent'}
        >
          {status === 'sending' ? '전송 중…' : '매직 링크 받기'}
        </button>
        {status === 'sent' && (
          <div className="space-y-2">
            <p className="text-sm text-green-700">
              이메일을 확인해 주세요. 링크를 클릭하면 로그인됩니다.
            </p>
            <button
              type="button"
              onClick={reset}
              className="text-sm text-gray-600 underline"
            >
              다른 이메일로 다시 시도
            </button>
          </div>
        )}
        {status === 'error' && error && (
          <p className="text-sm text-red-700">{error}</p>
        )}
      </form>
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
