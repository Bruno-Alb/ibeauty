import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="navbar">
      <Link to="/" className="brand">Ibeauty</Link>
      <nav className="nav-links">
        {user ? (
          <>
            <Link to="/minhas-reservas">Minhas reservas</Link>
            {user.role === 'provider' && <Link to="/prestador">Painel prestador</Link>}
            {user.role !== 'provider' && <Link to="/virar-prestador">Virar prestador</Link>}
            <span style={{ color: '#666', fontSize: '0.9rem' }}>Olá, {user.full_name.split(' ')[0]}</span>
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
