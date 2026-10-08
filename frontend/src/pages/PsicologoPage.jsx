import { useState } from 'react'
import BancoPreguntas from '../components/psychologist/BancoPreguntas'
import Dashboard from '../components/psychologist/Dashboard'

function PsicologoPage() {
  const [vista, setVista] = useState('banco')

  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('rol')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-800">Panel del Psicólogo</h1>
          <p className="text-xs text-gray-400 mt-0.5">Configuración y análisis del sistema</p>
        </div>
        <div className="flex items-center gap-6">
          <nav className="flex gap-1">
            <button
              onClick={() => setVista('banco')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                vista === 'banco'
                  ? 'bg-gray-100 text-gray-800 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Banco de preguntas
            </button>
            <button
              onClick={() => setVista('dashboard')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                vista === 'dashboard'
                  ? 'bg-gray-100 text-gray-800 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Panel analítico
            </button>
          </nav>
          <button
            onClick={cerrarSesion}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="w-full px-4 py-6">
        {vista === 'banco' && <BancoPreguntas />}
        {vista === 'dashboard' && <Dashboard />}
      </div>
    </div>
  )
}

export default PsicologoPage
