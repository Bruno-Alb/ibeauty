import { useEffect, useRef } from 'react'
import type { UserRole } from '../types'
import { useAuth } from '../auth'

interface GoogleCredentialResponse {
  credential: string
  select_by?: string
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
    use_fedcm_for_prompt?: boolean
  }) => void
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black'
      size?: 'small' | 'medium' | 'large'
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
      shape?: 'rectangular' | 'pill' | 'circle' | 'square'
      logo_alignment?: 'left' | 'center'
      width?: number | string
      locale?: string
    },
  ) => void
}

declare global {
  interface Window {
    google?: {
      accounts: { id: GoogleAccountsId }
    }
  }
}

interface Props {
  role?: UserRole
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  onSuccess?: (user: { role: UserRole | string }) => void
  onError?: (message: string) => void
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export default function GoogleSignInButton({ role, text = 'continue_with', onSuccess, onError }: Props) {
  const { loginWithGoogle } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!CLIENT_ID || !containerRef.current) return

    let attempts = 0
    const tryRender = () => {
      const gid = window.google?.accounts?.id
      if (!gid) {
        if (attempts++ < 40) {
          setTimeout(tryRender, 100)
        } else if (onError) {
          onError('Não foi possível carregar Login com Google. Verifique sua conexão.')
        }
        return
      }
      gid.initialize({
        client_id: CLIENT_ID,
        callback: async (resp) => {
          try {
            const user = await loginWithGoogle(resp.credential, role)
            onSuccess?.(user)
          } catch (err) {
            onError?.((err as Error).message)
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
      })
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
        gid.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'left',
          width: containerRef.current.clientWidth || 320,
          locale: 'pt-BR',
        })
      }
    }
    tryRender()
  }, [loginWithGoogle, onError, onSuccess, role, text])

  if (!CLIENT_ID) {
    return (
      <button type="button" className="btn btn-outline" disabled title="Google OAuth não configurado">
        Entrar com Google (em breve)
      </button>
    )
  }

  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />
}
