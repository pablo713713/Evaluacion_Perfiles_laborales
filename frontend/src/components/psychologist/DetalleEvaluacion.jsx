import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'

const PERFIL_COLOR_BG = {
  Dominante: '#FEE2E2',
  Hibrido:   '#DBEAFE',
  Sumiso:    '#D1FAE5',
}
const PERFIL_COLOR_TEXT = {
  Dominante: '#991B1B',
  Hibrido:   '#1E40AF',
  Sumiso:    '#065F46',
}
const PERFIL_COLOR_PIE = {
  Dominante: '#EF4444',
  Hibrido:   '#3B82F6',
  Sumiso:    '#10B981',
}

// ── Gráfico de torta SVG simple ──────────────────────────────────────────────
function GraficoTorta({ dominante, hibrido, sumiso }) {
  const datos = [
    { perfil: 'Dominante', valor: dominante, color: PERFIL_COLOR_PIE.Dominante },
    { perfil: 'Híbrido',   valor: hibrido,   color: PERFIL_COLOR_PIE.Hibrido },
    { perfil: 'Sumiso',    valor: sumiso,     color: PERFIL_COLOR_PIE.Sumiso },
  ]
  const total = dominante + hibrido + sumiso
  if (total === 0) return null

  let startAngle = -Math.PI / 2
  const slices = datos.map(d => {
    const angle = (d.valor / total) * 2 * Math.PI
    const x1 = 80 + 70 * Math.cos(startAngle)
    const y1 = 80 + 70 * Math.sin(startAngle)
    startAngle += angle
    const x2 = 80 + 70 * Math.cos(startAngle)
    const y2 = 80 + 70 * Math.sin(startAngle)
    const large = angle > Math.PI ? 1 : 0
    const path = `M80,80 L${x1},${y1} A70,70 0 ${large},1 ${x2},${y2} Z`
    return { ...d, path, angle }
  })

  return (
    <div className="flex items-center gap-8">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2" />
        ))}
      </svg>
      <div className="space-y-2">
        {datos.map(d => (
          <div key={d.perfil} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PERFIL_COLOR_PIE[d.perfil] || d.color }} />
            <span className="text-sm text-gray-700">{d.perfil}</span>
            <span className="text-sm font-semibold text-gray-900 ml-2">
              {total > 0 ? ((d.valor / total) * 100).toFixed(1) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tooltip de palabra ─────────────────────────────────────────────────────
function TokenPalabra({ token, onClick, activo }) {
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className="cursor-pointer rounded px-0.5 mx-0.5 transition-all"
      style={{
        backgroundColor: PERFIL_COLOR_BG[token.perfil],
        color: PERFIL_COLOR_TEXT[token.perfil],
        fontWeight: activo ? '700' : '500',
        textDecoration: 'underline dotted',
      }}
    >
      {token.palabra}
    </span>
  )
}

// ── Renderiza el texto con palabras resaltadas ─────────────────────────────
function TextoResaltado({ texto, rastros, tokenActivo, setTokenActivo }) {
  if (!rastros || rastros.length === 0) {
    return <span className="text-gray-700 text-sm">{texto}</span>
  }

  // Construir un mapa de palabra → rastro (primera ocurrencia)
  const mapaRastros = {}
  rastros.forEach(r => {
    const key = r.palabra.toLowerCase()
    if (!mapaRastros[key]) mapaRastros[key] = r
  })

  // Tokenizar por espacios preservando puntuación
  const palabras = texto.split(/(\s+)/)

  return (
    <span className="text-sm leading-relaxed">
      {palabras.map((parte, i) => {
        const clave = parte.trim().toLowerCase().replace(/[.,;:!?"""''()]/g, '')
        const rastro = mapaRastros[clave]
        if (rastro && parte.trim()) {
          return (
            <TokenPalabra
              key={i}
              token={rastro}
              activo={tokenActivo?.palabra === rastro.palabra}
              onClick={() => setTokenActivo(
                tokenActivo?.palabra === rastro.palabra ? null : rastro
              )}
            />
          )
        }
        return <span key={i}>{parte}</span>
      })}
    </span>
  )
}

// ── Componente principal ────────────────────────────────────────────────────
function DetalleEvaluacion({ id, onVolver }) {
  const [datos, setDatos]           = useState(null)
  const [cargando, setCargando]     = useState(true)
  const [tokenActivo, setTokenActivo] = useState(null)
  const tooltipRef = useRef(null)

  useEffect(() => {
    api.get(`/api/diagnostico/evaluaciones/${id}/detalle`)
      .then(r => setDatos(r.data))
      .finally(() => setCargando(false))
  }, [id])

  // Cerrar tooltip al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setTokenActivo(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (cargando) return (
    <div className="text-center py-16 text-sm text-gray-400">Cargando evaluación...</div>
  )
  if (!datos) return (
    <div className="text-center py-16 text-sm text-red-400">Error al cargar la evaluación.</div>
  )

  // Distribución final para el gráfico de torta
  const ultimaDistribucion = datos.historial.length > 0
    ? datos.historial[datos.historial.length - 1].distribucion_tras_respuesta
    : { Dominante: 33.3, Hibrido: 33.3, Sumiso: 33.3 }

  return (
    <div className="relative" onClick={() => setTokenActivo(null)}>

      {/* Tooltip flotante */}
      {tokenActivo && (
        <div
          ref={tooltipRef}
          onClick={e => e.stopPropagation()}
          className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-64"
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: PERFIL_COLOR_BG[tokenActivo.perfil],
                color: PERFIL_COLOR_TEXT[tokenActivo.perfil],
              }}
            >
              {tokenActivo.perfil}
            </span>
            <button
              onClick={() => setTokenActivo(null)}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Palabra:</span>
              <span className="font-medium text-gray-800">"{tokenActivo.palabra}"</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Lema:</span>
              <span className="font-medium text-gray-800">{tokenActivo.lema}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Puntos:</span>
              <span className={`font-semibold ${tokenActivo.puntos < 0 ? 'text-red-500' : 'text-gray-800'}`}>
                {tokenActivo.puntos > 0 ? '+' : ''}{tokenActivo.puntos}
              </span>
            </div>
            {tokenActivo.negacion && (
              <div className="text-xs text-orange-500 mt-1">⚠ Negación detectada — peso invertido</div>
            )}
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onVolver}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Volver
        </button>
        <div>
          <h2 className="text-lg font-medium text-gray-800">
            Detalle de evaluación — {datos.candidato.nombre}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {datos.fecha_fin ? new Date(datos.fecha_fin).toLocaleDateString('es-BO', {
              year: 'numeric', month: 'long', day: 'numeric'
            }) : ''}
          </p>
        </div>
      </div>

      {/* Bloque 1: Gráfico de torta + resumen */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
        <h3 className="text-sm font-medium text-gray-600 uppercase tracking-widest mb-4">
          Distribución conductual final
        </h3>
        <GraficoTorta
          dominante={ultimaDistribucion.Dominante}
          hibrido={ultimaDistribucion.Hibrido}
          sumiso={ultimaDistribucion.Sumiso}
        />
        <div className="mt-4 pt-4 border-t border-gray-50 flex gap-6 text-sm text-gray-500">
          <span>Perfil sistema: <strong className="text-gray-800">{datos.perfil_sistema}</strong></span>
          <span>Confianza: <strong className="text-gray-800">{datos.confianza_sistema}%</strong></span>
          <span>Psicólogo: <strong className="text-gray-800">{datos.psicologo.nombre}</strong></span>
        </div>
      </div>

      {/* Bloque 2+3: Historial con rastro léxico integrado */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-600 uppercase tracking-widest mb-4">
          Historial de la evaluación
          <span className="ml-2 text-xs font-normal text-gray-400 normal-case">
            — haz clic en las palabras resaltadas para ver su análisis
          </span>
        </h3>

        <div className="flex gap-3 mb-5 flex-wrap">
          {[
            { label: 'Dominante', color: PERFIL_COLOR_BG.Dominante, text: PERFIL_COLOR_TEXT.Dominante },
            { label: 'Híbrido',   color: PERFIL_COLOR_BG.Hibrido,   text: PERFIL_COLOR_TEXT.Hibrido },
            { label: 'Sumiso',    color: PERFIL_COLOR_BG.Sumiso,     text: PERFIL_COLOR_TEXT.Sumiso },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5 text-xs">
              <span className="px-2 py-0.5 rounded" style={{ backgroundColor: l.color, color: l.text }}>
                {l.label}
              </span>
            </span>
          ))}
        </div>

        <div className="space-y-6">
          {datos.historial.map((item, idx) => (
            <div key={item.id_respuesta} className="border-l-2 border-gray-100 pl-4">
              {/* Pregunta */}
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                Pregunta {idx + 1}
              </p>
              <p className="text-sm text-gray-600 mb-2 italic">"{item.pregunta}"</p>

              {/* Respuesta con palabras resaltadas */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3 leading-relaxed">
                <TextoResaltado
                  texto={item.texto_respuesta}
                  rastros={item.rastro_lexico}
                  tokenActivo={tokenActivo}
                  setTokenActivo={setTokenActivo}
                />
              </div>

              {/* Distribución tras esta respuesta */}
              <div className="flex gap-3 text-xs">
                <span className="text-gray-400">Distribución acumulada tras esta respuesta:</span>
                {Object.entries(item.distribucion_tras_respuesta).map(([perfil, val]) => (
                  <span
                    key={perfil}
                    className="px-2 py-0.5 rounded font-medium"
                    style={{
                      backgroundColor: PERFIL_COLOR_BG[perfil],
                      color: PERFIL_COLOR_TEXT[perfil],
                    }}
                  >
                    {perfil}: {val}%
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DetalleEvaluacion