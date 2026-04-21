import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, formatPrice } from '../api'
import { useAuth } from '../auth'
import type { PlanInfo } from '../types'

function qrImageUrl(payload: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(payload)}`
}

export default function Plans() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<PlanInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [copyMsg, setCopyMsg] = useState('')

  const isProvider = user?.role === 'provider'

  async function loadPlan() {
    if (!isProvider) return
    setLoading(true)
    setErr('')
    try {
      setPlan(await api.myPlan())
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlan()
  }, [isProvider])

  async function requestPro() {
    setLoading(true)
    setErr('')
    try {
      setPlan(await api.requestPro())
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function copyPayload() {
    if (!plan?.pix_payload) return
    try {
      await navigator.clipboard.writeText(plan.pix_payload)
      setCopyMsg('Copiado! Cole no seu app do banco.')
      setTimeout(() => setCopyMsg(''), 2500)
    } catch {
      setCopyMsg('Selecione o texto e copie manualmente.')
    }
  }

  const price = plan?.price_cents ?? 990

  return (
    <div className="container">
      <h1 className="page-title" style={{ margin: '12px 0 4px' }}>Planos para prestadores</h1>
      <p style={{ color: '#666', maxWidth: 600 }}>
        No Ibeauty, cliente nunca paga nada. Quem paga é o prestador, só se quiser
        destaque e ferramentas Pro. Todo valor da cliente fica com você — zero comissão por agendamento.
      </p>

      <div className="plan-grid">
        <div className="plan-card">
          <h3>Free</h3>
          <div className="plan-price">R$ 0 <small>/ sempre</small></div>
          <p style={{ color: '#666', margin: 0 }}>Ideal pra começar e testar o app.</p>
          <ul>
            <li>Perfil público compartilhável</li>
            <li>Agenda online com confirmação automática</li>
            <li>Lembrete manual no WhatsApp</li>
            <li>Recebe avaliações das clientes</li>
            <li className="off">Selo Pro + aparecer primeiro na busca</li>
            <li className="off">Galeria de fotos do trabalho</li>
            <li className="off">Link curto ibeauty.app/p/&lt;seu-nome&gt;</li>
          </ul>
          <span className="muted" style={{ margin: 0 }}>É o que você já tem hoje.</span>
        </div>

        <div className="plan-card featured">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Pro</h3>
            <span className="pro-badge">Recomendado</span>
          </div>
          <div className="plan-price">
            {formatPrice(price)} <small>/ mês · via Pix</small>
          </div>
          <p style={{ color: '#666', margin: 0 }}>Pro = mais clientes. Pague só quando der retorno.</p>
          <ul>
            <li>Tudo do Free</li>
            <li><strong>Selo Pro dourado</strong> no card e ordena antes na busca</li>
            <li><strong>Galeria de fotos</strong> do seu trabalho no perfil público</li>
            <li>Link curto ibeauty.app/p/&lt;seu-nome&gt;</li>
            <li>Perfil público com avaliações e serviços</li>
            <li>Lembrete WhatsApp destacado (reduz no-show)</li>
            <li>Suporte prioritário</li>
          </ul>
          {!user ? (
            <button className="btn btn-primary" onClick={() => navigate('/cadastro')}>
              Criar conta de prestador
            </button>
          ) : !isProvider ? (
            <Link className="btn btn-primary" to="/virar-prestador">
              Cadastrar meu negócio para assinar
            </Link>
          ) : loading ? (
            <button className="btn btn-primary" disabled>Carregando...</button>
          ) : plan?.plan === 'pro' ? (
            <button className="btn btn-outline" disabled>Você já é Pro 🎉</button>
          ) : plan?.plan === 'pro_pending' ? (
            <button className="btn btn-outline" disabled>Aguardando confirmação do pagamento</button>
          ) : (
            <button className="btn btn-primary" onClick={requestPro}>
              Assinar Pro por {formatPrice(price)}/mês
            </button>
          )}
        </div>
      </div>

      {err && <p className="error" style={{ marginTop: 12 }}>{err}</p>}

      {isProvider && plan && plan.plan === 'pro_pending' && (
        <div className="card" style={{ marginTop: 24 }}>
          <h2 style={{ marginTop: 0 }}>Como finalizar sua assinatura Pro</h2>
          <ol style={{ color: '#444', lineHeight: 1.6 }}>
            <li>Abra o app do seu banco e escolha pagar por Pix.</li>
            <li>
              {plan.pix_payload
                ? <>Escaneie o <strong>QR Code</strong> abaixo <strong>ou</strong> copie o código Pix Copia e Cola.</>
                : <>Use a chave Pix abaixo para transferir <strong>{formatPrice(price)}</strong>.</>}
            </li>
            <li>
              {plan.admin_whatsapp_url ? (
                <>
                  Clique em <a href={plan.admin_whatsapp_url} target="_blank" rel="noreferrer"><strong>Avisar admin no WhatsApp</strong></a> e anexe o comprovante.
                </>
              ) : (
                <>Envie o comprovante por WhatsApp para o admin do Ibeauty.</>
              )}
            </li>
            <li>
              Assim que confirmarmos, o selo <span className="pro-badge">Pro</span> vai aparecer no seu perfil.
            </li>
          </ol>

          {plan.pix_payload ? (
            <div className="qr-box" style={{ maxWidth: 320, margin: '12px auto' }}>
              <img src={qrImageUrl(plan.pix_payload)} alt="QR Code Pix" />
              <div className="qr-copy">{plan.pix_payload}</div>
              <button className="btn btn-primary btn-sm" onClick={copyPayload}>
                📋 Copiar Pix Copia e Cola
              </button>
              {copyMsg && <span className="muted">{copyMsg}</span>}
              {plan.admin_whatsapp_url && (
                <a
                  className="btn btn-outline btn-sm"
                  href={plan.admin_whatsapp_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ marginTop: 8 }}
                >
                  💬 Avisar admin no WhatsApp
                </a>
              )}
            </div>
          ) : (
            <div className="qr-box" style={{ maxWidth: 380, margin: '12px auto' }}>
              <p style={{ margin: 0, textAlign: 'center' }}>
                <strong>Chave Pix do Ibeauty ainda não configurada.</strong><br />
                Fale com o admin para receber os dados de pagamento.
              </p>
            </div>
          )}

          <p className="muted" style={{ textAlign: 'center' }}>
            Enquanto o admin não confirmar, seu perfil continua no plano Free. Se preferir, você
            pode <button className="btn btn-ghost btn-sm" onClick={async () => setPlan(await api.cancelProRequest())}>cancelar a solicitação</button>.
          </p>
        </div>
      )}

      {isProvider && plan?.plan === 'pro' && plan.pro_expires_at && (
        <div className="card" style={{ marginTop: 24, background: '#fff8e1', borderColor: '#fcd34d' }}>
          <strong>Você é Pro até {new Date(plan.pro_expires_at).toLocaleDateString('pt-BR')}.</strong>
          <p style={{ margin: '4px 0 0', color: '#666' }}>
            Assinatura mensal — renovamos o período após cada pagamento confirmado.
          </p>
        </div>
      )}
    </div>
  )
}
