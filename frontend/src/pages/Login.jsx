import { useState } from 'react'
import api from '../services/api'

function Login() {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleLogin = async () => {
    if (!correo || !password) {
      setError('Complete todos los campos.')
      return
    }
    setCargando(true)
    setError('')

    try {
      // FastAPI OAuth2 espera form-data, no JSON
      const formData = new URLSearchParams()
      formData.append('username', correo)
      formData.append('password', password)

      const res = await api.post('/api/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })

      const { access_token, rol } = res.data

      localStorage.setItem('token', access_token)
      localStorage.setItem('rol', rol)

      // Redirigir según rol
      if (rol === 'Candidato') {
        window.location.href = '/evaluacion'
      } else if (rol === 'Psicologo') {
        window.location.href = '/dashboard'
      } else if (rol === 'Administrador') {
        window.location.href = '/admin'
      }

    } catch (err) {
      if (err.response?.status === 401) {
        setError('Correo o contraseña incorrectos.')
      } else {
        setError('Error de conexión. Intente nuevamente.')
      }
    } finally {
      setCargando(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-10">
          <div className="w-8 h-px bg-gray-300 mb-8" />
          <h1 className="text-2xl font-light text-gray-800">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-gray-400">
            Sistema de Evaluación de Perfiles
          </p>
        </div>

        {/* Formulario */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="correo@ejemplo.com"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-700
                         focus:outline-none focus:border-gray-400 transition-colors duration-200"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-700
                         focus:outline-none focus:border-gray-400 transition-colors duration-200"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={cargando}
            className="w-full bg-gray-800 text-white py-3 rounded-lg text-sm
                       hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                       transition-colors duration-200 mt-2"
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </div>

      </div>
    </div>
  )
}

export default Login
