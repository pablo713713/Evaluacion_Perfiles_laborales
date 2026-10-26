import { useState } from 'react'
import BancoPreguntas from '../components/psychologist/BancoPreguntas'
import Dashboard from '../components/psychologist/Dashboard'
import LexiconPanel from '../components/psychologist/LexiconPanel'

function PsicologoPage() {
  const rol = localStorage.getItem('rol') // 'Psicologo' | 'PsicologoLider'
  const esLider = rol === 'PsicologoLider'
  const [vista, setVista] = useState(esLider ? 'banco' : 'dashboard')

  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('rol')
    window.location.href = '/login'
  }

  const pestanas = [
    ...(esLider ? [{ id: 'banco', label: 'Banco de preguntas' }] : []),
    { id: 'dashboard', label: 'Panel analítico' },
    { id: 'lexico', label: 'Lexicón' },
  ]

  return (
    <div className="min-h-screen bg-[#F4F7F9]">
      {/* Header */}
      <div className="bg-[#0f3846] border-b border-[#1e5263] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-px h-8 bg-[#fef08a]" />
          <div>
            <h1 className="text-lg font-light text-white">Panel del Psicólogo{esLider ? ' Líder' : ''}</h1>
            <p className="text-xs text-cyan-100/60 mt-0.5">Configuración y análisis del sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <nav className="flex gap-1">
            {pestanas.map((p) => (
              <button
                key={p.id}
                onClick={() => setVista(p.id)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  vista === p.id
                    ? 'bg-[#fef08a] text-[#0f3846] font-semibold'
                    : 'text-cyan-100/70 hover:text-white hover:bg-[#0b2a35]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </nav>
          <button onClick={cerrarSesion} className="text-sm text-cyan-100/60 hover:text-white transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        {vista === 'banco' && <BancoPreguntas />}
        {vista === 'dashboard' && <Dashboard />}
        {vista === 'lexico' && <LexiconPanel esLider={esLider} />}
      </div>
    </div>
  )
}

export default PsicologoPage
