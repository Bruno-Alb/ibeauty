import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <span className="brand-dot">iB</span>
        <span>Ibeauty</span>
      </Link>
      <nav className="nav-links">
        <Link to="/planos" className="nav-link-plans">Planos</Link>
        {user ? (
          <>
            <Link to="/minhas-reservas">Minhas reservas</Link>
            {user.role === 'provider' && <Link to="/prestador">Painel</Link>}
            {user.role !== 'provider' && <Link to="/virar-prestador">Virar prestador</Link>}
            <span className="nav-hello">Olá, {user.full_name.split(' ')[0]}</span>
            <button
              className="btn btn-ghost"
              onClick={() => {
                logout()
                navigate('/')
              }}
            >
              Sair
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Entrar</Link>
            <Link to="/cadastro" className="btn btn-primary">Criar conta</Link>
          </>
        )}
      </nav>
    </header>
  )
}
