import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../services/api'

const PERFIL_COLOR_BG = {
  Dominante: '#FEE2E2',
  Hibrido:   '#DBEAFE',
  Sumiso:    '#D1FAE5',
  manual:    '#FEF9C3',
}
const PERFIL_COLOR_TEXT = {
  Dominante: '#991B1B',
  Hibrido:   '#1E40AF',
  Sumiso:    '#065F46',
  manual:    '#713F12',
}
const PERFIL_COLOR_PIE = {
  Dominante: '#EF4444',
  Hibrido:   '#3B82F6',
  Sumiso:    '#10B981',
}

// ── Gráfico de torta SVG ─────────────────────────────────────────────────────
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
    return { ...d, path }
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
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
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

// ── Tooltip editable (para rastros existentes y manuales) ────────────────────
function TooltipEditable({ token, posicion, onGuardar, onCancelar }) {
  const [perfil, setPerfil]   = useState(token.perfil)
  const [puntos, setPuntos]   = useState(Math.abs(token.puntos))
  const [guardando, setGuardando] = useState(false)

  const handleGuardar = async () => {
    setGuardando(true)
    await onGuardar(token.id_rastro, perfil, parseFloat(puntos))
    setGuardando(false)
  }

  return (
    <div
      data-tooltip="true"
      className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 w-80"
      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {token.origen === 'manual' ? 'Rastro manual' : 'Editar rastro'}
        </span>
        <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Texto</p>
          <p className="text-sm font-medium text-gray-800">"{token.palabra}"</p>
        </div>

        {token.lema && token.origen !== 'manual' && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Lema detectado</p>
            <p className="text-sm text-gray-700">{token.lema}</p>
          </div>
        )}

        <div>
          <p className="text-xs text-gray-500 mb-1">Espectro</p>
          <select
            value={perfil}
            onChange={e => setPerfil(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
          >
            <option value="Dominante">Dominante</option>
            <option value="Hibrido">Híbrido</option>
            <option value="Sumiso">Sumiso</option>
          </select>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">Puntos</p>
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={puntos}
            onChange={e => setPuntos(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancelar}
            className="flex-1 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex-1 px-3 py-1.5 text-sm text-white bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tooltip de selección libre ───────────────────────────────────────────────
function TooltipSeleccion({ texto, idRespuesta, posicion, onGuardar, onCancelar }) {
  const [perfil, setPerfil]   = useState('Dominante')
  const [puntos, setPuntos]   = useState(0.5)
  const [guardando, setGuardando] = useState(false)

  const handleGuardar = async () => {
    setGuardando(true)
    await onGuardar(idRespuesta, texto, perfil, parseFloat(puntos))
    setGuardando(false)
  }

  return (
    <div
      data-tooltip="true"
      className="fixed z-50 bg-white border border-yellow-300 rounded-xl shadow-2xl p-4 w-80"
      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-yellow-600 uppercase tracking-wide">
          Nuevo rastro manual
        </span>
        <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Texto seleccionado</p>
          <p className="text-sm font-medium text-gray-800 bg-yellow-50 px-2 py-1 rounded">"{texto}"</p>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">Espectro</p>
          <select
            value={perfil}
            onChange={e => setPerfil(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
          >
            <option value="Dominante">Dominante</option>
            <option value="Hibrido">Híbrido</option>
            <option value="Sumiso">Sumiso</option>
          </select>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">Puntos</p>
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={puntos}
            onChange={e => setPuntos(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancelar}
            className="flex-1 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex-1 px-3 py-1.5 text-sm text-white bg-yellow-600 rounded-lg hover:bg-yellow-500 disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Renderiza texto con palabras resaltadas ──────────────────────────────────
function TextoResaltado({ texto, rastros, onClickToken, onSeleccionTexto, idRespuesta }) {
  const contenedorRef = useRef(null)

  const handleMouseUp = (e) => {
    if (e.target.closest('[data-tooltip]')) return
    setTimeout(() => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) return
      const textoSel = sel.toString().trim()
      if (!textoSel || textoSel.length < 2) return
      const range = sel.getRangeAt(0)
      const rect  = range.getBoundingClientRect()
      onSeleccionTexto({
        texto: textoSel,
        idRespuesta,
        posicion: {
          x: Math.min(rect.left, window.innerWidth - 300),
          y: rect.bottom + window.scrollY + 8,
        }
      })
      sel.removeAllRanges()
    }, 10)
  }

  if (!rastros || rastros.length === 0) {
    return (
      <span
        ref={contenedorRef}
        className="text-gray-700 text-sm leading-relaxed select-text"
        onMouseUp={handleMouseUp}
      >
        {texto}
      </span>
    )
  }

  // Separar rastros en manuales (frases) y automáticos (palabras)
  const rastrosManuales  = rastros.filter(r => r.origen === 'manual')
  const rastrosAuto      = rastros.filter(r => r.origen !== 'manual')

  // Mapa de palabra → rastro automático
  const mapaAuto = {}
  rastrosAuto.forEach(r => {
    const key = r.palabra.toLowerCase().replace(/[.,;:!?"""''()]/g, '')
    if (!mapaAuto[key]) mapaAuto[key] = r
  })

  // Construir segmentos del texto marcando frases manuales primero
  // Resultado: array de { texto, rastro | null }
  const construirSegmentos = () => {
    let segmentos = [{ texto, rastro: null }]

    // Para cada rastro manual, dividir los segmentos sin rastro
    rastrosManuales.forEach(rastro => {
      const frase = rastro.palabra.toLowerCase()
      const nuevos = []
      segmentos.forEach(seg => {
        if (seg.rastro !== null) { nuevos.push(seg); return }
        const idx = seg.texto.toLowerCase().indexOf(frase)
        if (idx === -1) { nuevos.push(seg); return }
        if (idx > 0) nuevos.push({ texto: seg.texto.slice(0, idx), rastro: null })
        nuevos.push({ texto: seg.texto.slice(idx, idx + frase.length), rastro })
        if (idx + frase.length < seg.texto.length) {
          nuevos.push({ texto: seg.texto.slice(idx + frase.length), rastro: null })
        }
      })
      segmentos = nuevos
    })

    return segmentos
  }

  const segmentos = construirSegmentos()

  // Renderizar cada segmento
  const renderSegmento = (seg, idx) => {
    if (seg.rastro !== null) {
      // Frase manual
      return (
        <span
          key={idx}
          onClick={e => { e.stopPropagation(); onClickToken(seg.rastro, e) }}
          className="cursor-pointer rounded px-0.5 transition-all hover:opacity-80"
          style={{ backgroundColor: '#FEF9C3', color: '#713F12', fontWeight: '500', textDecoration: 'underline dotted' }}
        >
          {seg.texto}
        </span>
      )
    }

    // Segmento sin rastro manual — buscar palabras automáticas
    const palabras = seg.texto.split(/(\s+)/)
    return (
      <span key={idx}>
        {palabras.map((parte, j) => {
          const clave  = parte.trim().toLowerCase().replace(/[.,;:!?"""''()]/g, '')
          const rastro = mapaAuto[clave]
          if (rastro && parte.trim()) {
            return (
              <span
                key={j}
                onClick={e => { e.stopPropagation(); onClickToken(rastro, e) }}
                className="cursor-pointer rounded px-0.5 mx-0.5 transition-all hover:opacity-80"
                style={{
                  backgroundColor: PERFIL_COLOR_BG[rastro.perfil]  || '#F3F4F6',
                  color:           PERFIL_COLOR_TEXT[rastro.perfil] || '#374151',
                  fontWeight: '500',
                  textDecoration: 'underline dotted',
                }}
              >
                {parte}
              </span>
            )
          }
          return <span key={j}>{parte}</span>
        })}
      </span>
    )
  }

  return (
    <span
      ref={contenedorRef}
      className="text-sm leading-relaxed select-text"
      onMouseUp={handleMouseUp}
    >
      {segmentos.map((seg, idx) => renderSegmento(seg, idx))}
    </span>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
function DetalleEvaluacion({ id, onVolver }) {
  const [datos, setDatos]               = useState(null)
  const [cargando, setCargando]         = useState(true)
  const [distribucion, setDistribucion] = useState(null)

  const [tooltipEditar, setTooltipEditar]       = useState(null)
  const [tooltipSeleccion, setTooltipSeleccion] = useState(null)

  useEffect(() => {
    cargar()
  }, [id])

  const cargar = async () => {
    try {
      const res = await api.get(`/api/diagnostico/evaluaciones/${id}/detalle`)
      setDatos(res.data)
      const ultima = res.data.historial.at(-1)
      if (ultima) {
        setDistribucion(ultima.distribucion_tras_respuesta)
      }
    } catch { /* silencioso */ }
    finally { setCargando(false) }
  }

  // Cerrar tooltips al click fuera — pero NO durante selección de texto
  useEffect(() => {
    const handler = (e) => {
      // No cerrar si el click fue dentro de un tooltip
      if (e.target.closest('[data-tooltip]')) return
      setTooltipEditar(null)
      setTooltipSeleccion(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleClickToken = (rastro, e) => {
    setTooltipSeleccion(null)
    setTooltipEditar({
      id_rastro: rastro.id_rastro,
      palabra:   rastro.palabra,
      lema:      rastro.lema,
      perfil:    rastro.perfil,
      puntos:    rastro.puntos,
      origen:    rastro.origen || 'automatico',
      posicion: {
        x: Math.min(e.clientX, window.innerWidth - 310),
        y: e.clientY + window.scrollY + 10,
      }
    })
  }

  const handleSeleccionTexto = (info) => {
    setTooltipEditar(null)
    setTooltipSeleccion(info)
  }

  const handleGuardarEdicion = async (idRastro, perfil, puntos) => {
    try {
      const res = await api.patch(`/api/diagnostico/rastros/${idRastro}`, {
        perfil_asignado: perfil,
        puntos_sumados:  puntos,
      })
      setDistribucion(res.data.distribucion)
      setTooltipEditar(null)
      await cargar()
    } catch { /* silencioso */ }
  }

  const handleGuardarManual = async (idRespuesta, textoSel, perfil, puntos) => {
    try {
      const res = await api.post(`/api/diagnostico/rastros-manuales`, {
        id_respuesta:       idRespuesta,
        texto_seleccionado: textoSel,
        perfil_asignado:    perfil,
        puntos_sumados:     puntos,
      })
      setDistribucion(res.data.distribucion)
      setTooltipSeleccion(null)
      await cargar()
    } catch { /* silencioso */ }
  }

  if (cargando) return (
    <div className="text-center py-16 text-sm text-gray-400">Cargando evaluación...</div>
  )
  if (!datos) return (
    <div className="text-center py-16 text-sm text-red-400">Error al cargar la evaluación.</div>
  )

  const dist = distribucion || { Dominante: 33.3, Hibrido: 33.3, Sumiso: 33.3 }

  return (
    <div>

      {/* Overlay + Tooltips flotantes centrados */}
      {(tooltipEditar || tooltipSeleccion) && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-30"
          onClick={() => { setTooltipEditar(null); setTooltipSeleccion(null) }}
        />
      )}
      {tooltipEditar && (
        <TooltipEditable
          token={tooltipEditar}
          posicion={tooltipEditar.posicion}
          onGuardar={handleGuardarEdicion}
          onCancelar={() => setTooltipEditar(null)}
        />
      )}
      {tooltipSeleccion && (
        <TooltipSeleccion
          texto={tooltipSeleccion.texto}
          idRespuesta={tooltipSeleccion.idRespuesta}
          posicion={tooltipSeleccion.posicion}
          onGuardar={handleGuardarManual}
          onCancelar={() => setTooltipSeleccion(null)}
        />
      )}

      {/* Encabezado */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onVolver} className="text-sm text-gray-500 hover:text-gray-700">← Volver</button>
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

      {/* Bloque 1: Gráfico */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
        <h3 className="text-sm font-medium text-gray-600 uppercase tracking-widest mb-4">
          Distribución conductual
          <span className="ml-2 text-xs font-normal text-gray-400 normal-case">
            — se actualiza al editar o agregar rastros
          </span>
        </h3>
        <GraficoTorta
          dominante={dist.Dominante}
          hibrido={dist.Hibrido}
          sumiso={dist.Sumiso}
        />
        <div className="mt-4 pt-4 border-t border-gray-50 flex gap-6 text-sm text-gray-500">
          <span>Perfil sistema: <strong className="text-gray-800">{datos.perfil_sistema}</strong></span>
          <span>Confianza: <strong className="text-gray-800">{datos.confianza_sistema}%</strong></span>
          <span>Psicólogo: <strong className="text-gray-800">{datos.psicologo.nombre}</strong></span>
        </div>
      </div>

      {/* Bloque 2+3: Historial con rastro integrado */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-600 uppercase tracking-widest mb-2">
          Historial de la evaluación
        </h3>
        <p className="text-xs text-gray-400 mb-5">
          Haz clic en palabras resaltadas para editarlas. Selecciona texto con el mouse para crear un rastro manual.
        </p>

        {/* Leyenda */}
        <div className="flex gap-3 mb-5 flex-wrap">
          {[
            { label: 'Dominante', bg: PERFIL_COLOR_BG.Dominante, txt: PERFIL_COLOR_TEXT.Dominante },
            { label: 'Híbrido',   bg: PERFIL_COLOR_BG.Hibrido,   txt: PERFIL_COLOR_TEXT.Hibrido },
            { label: 'Sumiso',    bg: PERFIL_COLOR_BG.Sumiso,     txt: PERFIL_COLOR_TEXT.Sumiso },
            { label: 'Manual',    bg: PERFIL_COLOR_BG.manual,     txt: PERFIL_COLOR_TEXT.manual },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5 text-xs">
              <span className="px-2 py-0.5 rounded" style={{ backgroundColor: l.bg, color: l.txt }}>
                {l.label}
              </span>
            </span>
          ))}
        </div>

        <div className="space-y-6">
          {datos.historial.map((item, idx) => (
            <div key={item.id_respuesta} className="border-l-2 border-gray-100 pl-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                Pregunta {idx + 1}
              </p>
              <p className="text-sm text-gray-600 mb-2 italic">"{item.pregunta}"</p>

              <div className="bg-gray-50 rounded-lg p-3 mb-3 leading-relaxed">
                <TextoResaltado
                  texto={item.texto_respuesta}
                  rastros={item.rastro_lexico}
                  onClickToken={handleClickToken}
                  onSeleccionTexto={handleSeleccionTexto}
                  idRespuesta={item.id_respuesta}
                />
              </div>

              <div className="flex gap-3 text-xs flex-wrap">
                <span className="text-gray-400">Distribución tras esta respuesta:</span>
                {Object.entries(item.distribucion_tras_respuesta).map(([perfil, val]) => (
                  <span
                    key={perfil}
                    className="px-2 py-0.5 rounded font-medium"
                    style={{ backgroundColor: PERFIL_COLOR_BG[perfil], color: PERFIL_COLOR_TEXT[perfil] }}
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