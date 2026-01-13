import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Mail } from 'lucide-react'

type LoginPageProps = {
  onSuccess: () => void
}

type LoginMode = 'password' | 'magic-link'

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [loginMode, setLoginMode] = useState<LoginMode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      onSuccess()
    }
  }

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setMagicLinkSent(true)
      setLoading(false)
    }
  }

  const switchToMagicLink = () => {
    setLoginMode('magic-link')
    setError(null)
    setPassword('')
  }

  const switchToPassword = () => {
    setLoginMode('password')
    setError(null)
    setMagicLinkSent(false)
  }

  const resetMagicLink = () => {
    setMagicLinkSent(false)
    setEmail('')
    setError(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">NiwaLog</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            現場記録管理システム
          </p>
        </CardHeader>
        <CardContent>
          {loginMode === 'password' ? (
            <>
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">パスワード</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'ログイン中...' : 'ログイン'}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={switchToMagicLink}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  マジックリンクでログイン →
                </button>
              </div>
            </>
          ) : magicLinkSent ? (
            <div className="space-y-4 text-center py-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <div>
                <p className="font-medium">ログインリンクを送信しました</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {email} にメールを送信しました。
                  <br />
                  メール内のリンクをクリックしてログインしてください。
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={resetMagicLink}
                className="w-full"
              >
                別のメールアドレスで試す
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleMagicLinkLogin} className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Mail className="h-4 w-4" />
                  <span>パスワード不要でログインできます</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="magic-email">メールアドレス</Label>
                  <Input
                    id="magic-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '送信中...' : 'ログインリンクを送信'}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={switchToPassword}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  ← パスワードでログイン
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
