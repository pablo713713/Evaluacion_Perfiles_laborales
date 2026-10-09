import { useState } from 'react'
import BancoPreguntas from '../components/psychologist/BancoPreguntas'
import Dashboard from '../components/psychologist/Dashboard'

function PsicologoPage() {
  const rol = localStorage.getItem('rol')          // 'Psicologo' | 'PsicologoLider'
  const esLider = rol === 'PsicologoLider'
  const [vista, setVista] = useState(esLider ? 'banco' : 'dashboard')

  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('rol')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header en Azul Petróleo */}
      <div className="bg-[#0f3846] border-b border-[#0b2a35] px-8 py-4 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-lg font-medium text-white">Panel del Psicólogo</h1>
          <p className="text-xs text-cyan-100/70 mt-0.5">Configuración y análisis del sistema</p>
        </div>
        <div className="flex items-center gap-6">
          <nav className="flex gap-2">
            {esLider && (
              <button
                onClick={() => setVista('banco')}
                className={`px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                  vista === 'banco'
                    ? 'bg-[#fef08a] text-[#0f3846] font-semibold'
                    : 'text-gray-200 hover:bg-[#fef08a] hover:text-[#0f3846]'
                }`}
              >
                Banco de preguntas
              </button>
            )}
            <button
              onClick={() => setVista('dashboard')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                vista === 'dashboard'
                  ? 'bg-[#fef08a] text-[#0f3846] font-semibold'
                  : 'text-gray-200 hover:bg-[#fef08a] hover:text-[#0f3846]'
              }`}
            >
              Panel analítico
            </button>
          </nav>
          <button
            onClick={cerrarSesion}
            className="text-sm text-gray-200 hover:text-[#fef08a] transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-5xl mx-auto px-8 py-10">
        {vista === 'banco' && <BancoPreguntas />}
        {vista === 'dashboard' && <Dashboard />}
      </div>
    </div>
  )
}

export default PsicologoPage