import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../services/api'

const PERFIL_COLOR_BG = {
  Dominante: '#FEE2E2',
  Hibrido:   '#DBEAFE',
  Sumiso:    '#D1FAE5',
  manual:    '#FEF9C3',
  alerta:    '#EDE9FE',
}
const PERFIL_COLOR_TEXT = {
  Dominante: '#991B1B',
  Hibrido:   '#1E40AF',
  Sumiso:    '#065F46',
  manual:    '#713F12',
  alerta:    '#5B21B6',
}
const PERFIL_COLOR_PIE = {
  Dominante: '#EF4444',
  Hibrido:   '#3B82F6',
  Sumiso:    '#10B981',
}
const COLOR_ALERTA_BG   = '#EDE9FE'
const COLOR_ALERTA_TEXT = '#5B21B6'
const COLOR_ALERTA_BAR  = '#7C3AED'

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
function TooltipEditable({ token, posicion, onGuardar, onCancelar, onGuardarAlerta }) {
  const [perfil, setPerfil]         = useState(token.perfil)
  const [puntos, setPuntos]         = useState(Math.abs(token.puntos))
  const [guardando, setGuardando]   = useState(false)
  const [modoAlerta, setModoAlerta] = useState(false)
  const [etiqueta, setEtiqueta]     = useState('')
  const [pesoAlerta, setPesoAlerta] = useState(0.5)

  const handleGuardar = async () => {
    setGuardando(true)
    await onGuardar(token.id_rastro, perfil, parseFloat(puntos))
    setGuardando(false)
  }

  const handleGuardarAlerta = () => {
    if (!etiqueta.trim()) return
    const peso = Math.min(1.0, Math.max(0.1, parseFloat(pesoAlerta) || 0.5))
    onGuardarAlerta({
      etiqueta:    etiqueta.trim(),
      peso,
      palabra:     token.palabra,
      idRastro:    token.id_rastro,
      idRespuesta: token.id_respuesta,
    })
    onCancelar()
  }

  return (
    <div
      data-tooltip="true"
      className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 w-80"
      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wide"
          style={{ color: modoAlerta ? COLOR_ALERTA_TEXT : '#6B7280' }}>
          {modoAlerta ? '⚠ Agregar alerta' : (token.origen === 'manual' ? 'Rastro manual' : 'Editar rastro')}
        </span>
        <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
      </div>

      {!modoAlerta ? (
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

          {/* Botón Agregar alerta */}
          <button
            onClick={() => setModoAlerta(true)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border transition-colors"
            style={{ borderColor: COLOR_ALERTA_BAR, color: COLOR_ALERTA_TEXT, backgroundColor: COLOR_ALERTA_BG }}
          >
            ⚠ Agregar alerta
          </button>

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
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg p-2" style={{ backgroundColor: COLOR_ALERTA_BG }}>
            <p className="text-xs mb-1" style={{ color: COLOR_ALERTA_TEXT }}>Palabra marcada</p>
            <p className="text-sm font-medium" style={{ color: COLOR_ALERTA_TEXT }}>"{token.palabra}"</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Tipo de alerta</p>
            <input
              type="text"
              placeholder="ej. narcisismo, bipolaridad…"
              value={etiqueta}
              onChange={e => setEtiqueta(e.target.value)}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              style={{ borderColor: COLOR_ALERTA_BAR }}
              autoFocus
            />
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">
              Peso <span className="text-gray-400">(0.1 – 1.0)</span>
            </p>
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="1"
              value={pesoAlerta}
              onChange={e => setPesoAlerta(e.target.value)}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              style={{ borderColor: COLOR_ALERTA_BAR }}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setModoAlerta(false)}
              className="flex-1 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              ← Volver
            </button>
            <button
              onClick={handleGuardarAlerta}
              disabled={!etiqueta.trim()}
              className="flex-1 px-3 py-1.5 text-sm text-white rounded-lg disabled:opacity-40"
              style={{ backgroundColor: COLOR_ALERTA_BAR }}
            >
              Agregar alerta
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tooltip de selección libre ───────────────────────────────────────────────
function TooltipSeleccion({ texto, idRespuesta, posicion, onGuardar, onCancelar, onGuardarAlerta }) {
  const [perfil, setPerfil]         = useState('Dominante')
  const [puntos, setPuntos]         = useState(0.5)
  const [guardando, setGuardando]   = useState(false)
  const [modoAlerta, setModoAlerta] = useState(false)
  const [etiqueta, setEtiqueta]     = useState('')
  const [pesoAlerta, setPesoAlerta] = useState(0.5)

  const handleGuardar = async () => {
    setGuardando(true)
    await onGuardar(idRespuesta, texto, perfil, parseFloat(puntos))
    setGuardando(false)
  }

  const handleGuardarAlerta = () => {
    if (!etiqueta.trim()) return
    const peso = Math.min(1.0, Math.max(0.1, parseFloat(pesoAlerta) || 0.5))
    onGuardarAlerta({
      etiqueta:    etiqueta.trim(),
      peso,
      palabra:     texto,
      idRastro:    null,
      idRespuesta: idRespuesta,
    })
    onCancelar()
  }

  return (
    <div
      data-tooltip="true"
      className="fixed z-50 bg-white rounded-xl shadow-2xl p-4 w-80"
      style={{
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        border: `1.5px solid ${modoAlerta ? COLOR_ALERTA_BAR : '#FCD34D'}`,
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wide"
          style={{ color: modoAlerta ? COLOR_ALERTA_TEXT : '#D97706' }}>
          {modoAlerta ? '⚠ Agregar alerta' : 'Nuevo rastro manual'}
        </span>
        <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
      </div>

      {!modoAlerta ? (
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

          {/* Botón Agregar alerta */}
          <button
            onClick={() => setModoAlerta(true)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border transition-colors"
            style={{ borderColor: COLOR_ALERTA_BAR, color: COLOR_ALERTA_TEXT, backgroundColor: COLOR_ALERTA_BG }}
          >
            ⚠ Agregar alerta
          </button>

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
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg p-2" style={{ backgroundColor: COLOR_ALERTA_BG }}>
            <p className="text-xs mb-1" style={{ color: COLOR_ALERTA_TEXT }}>Texto seleccionado</p>
            <p className="text-sm font-medium" style={{ color: COLOR_ALERTA_TEXT }}>"{texto}"</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Tipo de alerta</p>
            <input
              type="text"
              placeholder="ej. narcisismo, bipolaridad…"
              value={etiqueta}
              onChange={e => setEtiqueta(e.target.value)}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              style={{ borderColor: COLOR_ALERTA_BAR }}
              autoFocus
            />
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">
              Peso <span className="text-gray-400">(0.1 – 1.0)</span>
            </p>
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="1"
              value={pesoAlerta}
              onChange={e => setPesoAlerta(e.target.value)}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              style={{ borderColor: COLOR_ALERTA_BAR }}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setModoAlerta(false)}
              className="flex-1 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              ← Volver
            </button>
            <button
              onClick={handleGuardarAlerta}
              disabled={!etiqueta.trim()}
              className="flex-1 px-3 py-1.5 text-sm text-white rounded-lg disabled:opacity-40"
              style={{ backgroundColor: COLOR_ALERTA_BAR }}
            >
              Agregar alerta
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Renderiza texto con palabras resaltadas ──────────────────────────────────
function TextoResaltado({ texto, rastros, onClickToken, onSeleccionTexto, idRespuesta, alertas = [] }) {
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

  // Separar rastros: alertas y manuales se procesan a nivel de frase; automáticos por palabra
  const rastrosManuales  = rastros.filter(r => r.origen === 'manual')
  const rastrosAlerta    = rastros.filter(r => r.origen === 'alerta')
  const rastrosAuto      = rastros.filter(r => r.origen !== 'manual' && r.origen !== 'alerta')

  // Mapa de palabra → rastro automático
  const mapaAuto = {}
  rastrosAuto.forEach(r => {
    const key = r.palabra.toLowerCase().replace(/[.,;:!?"""''()]/g, '')
    if (!mapaAuto[key]) mapaAuto[key] = r
  })

  // Construir segmentos del texto marcando frases (manuales y alertas) primero
  // Resultado: array de { texto, rastro | null, esAlerta }
  const construirSegmentos = () => {
    let segmentos = [{ texto, rastro: null, esAlerta: false }]

    // Procesar rastros manuales
    rastrosManuales.forEach(rastro => {
      const frase = rastro.palabra.toLowerCase()
      const nuevos = []
      segmentos.forEach(seg => {
        if (seg.rastro !== null || seg.esAlerta) { nuevos.push(seg); return }
        const idx = seg.texto.toLowerCase().indexOf(frase)
        if (idx === -1) { nuevos.push(seg); return }
        if (idx > 0) nuevos.push({ texto: seg.texto.slice(0, idx), rastro: null, esAlerta: false })
        nuevos.push({ texto: seg.texto.slice(idx, idx + frase.length), rastro, esAlerta: false })
        if (idx + frase.length < seg.texto.length) {
          nuevos.push({ texto: seg.texto.slice(idx + frase.length), rastro: null, esAlerta: false })
        }
      })
      segmentos = nuevos
    })

    // Procesar rastros de alerta (frases o palabras) — misma lógica, color púrpura
    rastrosAlerta.forEach(rastro => {
      const frase = rastro.palabra.toLowerCase()
      const nuevos = []
      segmentos.forEach(seg => {
        if (seg.rastro !== null || seg.esAlerta) { nuevos.push(seg); return }
        const idx = seg.texto.toLowerCase().indexOf(frase)
        if (idx === -1) { nuevos.push(seg); return }
        if (idx > 0) nuevos.push({ texto: seg.texto.slice(0, idx), rastro: null, esAlerta: false })
        nuevos.push({ texto: seg.texto.slice(idx, idx + frase.length), rastro, esAlerta: true })
        if (idx + frase.length < seg.texto.length) {
          nuevos.push({ texto: seg.texto.slice(idx + frase.length), rastro: null, esAlerta: false })
        }
      })
      segmentos = nuevos
    })

    return segmentos
  }

  const segmentos = construirSegmentos()

  // Renderizar cada segmento
  const renderSegmento = (seg, idx) => {
    if (seg.esAlerta) {
      // Frase/palabra de alerta — resaltado en púrpura con subrayado ondulado
      return (
        <span
          key={idx}
          className="cursor-default rounded px-0.5 transition-all hover:opacity-80"
          style={{
            backgroundColor: COLOR_ALERTA_BG,
            color:           COLOR_ALERTA_TEXT,
            fontWeight: '700',
            textDecoration: 'underline',
            textDecorationColor: COLOR_ALERTA_BAR,
            textDecorationStyle: 'wavy',
          }}
        >
          {seg.texto}
        </span>
      )
    }

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

    // Segmento sin rastro manual ni alerta — buscar palabras automáticas
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

// ── Gráfico de barras: D/H/S + alertas ──────────────────────────────────────
function GraficoBarras({ dist, alertas }) {
  // Construir barras: espectros normales + alertas agrupadas
  const alertasAgrupadas = {}
  alertas.forEach(a => {
    const key = a.etiqueta.toLowerCase()
    if (!alertasAgrupadas[key]) {
      alertasAgrupadas[key] = { etiqueta: a.etiqueta, peso: 0 }
    }
    alertasAgrupadas[key].peso = Math.min(1.0, alertasAgrupadas[key].peso + a.peso)
  })

  const total = dist.Dominante + dist.Hibrido + dist.Sumiso || 100
  const barrasEspectro = [
    { label: 'Dominante', valor: dist.Dominante / total, color: PERFIL_COLOR_PIE.Dominante },
    { label: 'Híbrido',   valor: dist.Hibrido   / total, color: PERFIL_COLOR_PIE.Hibrido },
    { label: 'Sumiso',    valor: dist.Sumiso     / total, color: PERFIL_COLOR_PIE.Sumiso },
  ]
  const barrasAlerta = Object.values(alertasAgrupadas).map(a => ({
    label: a.etiqueta,
    valor: a.peso,
    color: COLOR_ALERTA_BAR,
  }))

  const barras = [...barrasEspectro, ...barrasAlerta]
  const svgH   = 160
  const svgW   = 40 + barras.length * 44
  const barH   = 120 // altura máxima en px

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">
        Distribución + alertas
      </p>
      <svg width={svgW} height={svgH} className="overflow-visible">
        {/* Línea base */}
        <line x1="30" y1={barH + 10} x2={svgW - 4} y2={barH + 10} stroke="#E5E7EB" strokeWidth="1" />

        {/* Marcas de porcentaje */}
        {[0, 25, 50, 75, 100].map(pct => {
          const y = 10 + barH - (pct / 100) * barH
          return (
            <g key={pct}>
              <line x1="26" y1={y} x2={svgW - 4} y2={y} stroke="#F3F4F6" strokeWidth="1" />
              <text x="24" y={y + 4} textAnchor="end" fontSize="8" fill="#9CA3AF">{pct}</text>
            </g>
          )
        })}

        {/* Barras */}
        {barras.map((b, i) => {
          const x    = 34 + i * 44
          const h    = Math.max(2, b.valor * barH)
          const y    = 10 + barH - h
          const isAlert = i >= barrasEspectro.length
          return (
            <g key={b.label}>
              <rect
                x={x}
                y={y}
                width={32}
                height={h}
                fill={b.color}
                rx="3"
                opacity={isAlert ? 0.9 : 0.8}
              />
              {/* Valor encima */}
              <text x={x + 16} y={y - 4} textAnchor="middle" fontSize="8" fontWeight="600"
                fill={isAlert ? COLOR_ALERTA_TEXT : '#374151'}>
                {Math.round(b.valor * 100)}%
              </text>
              {/* Etiqueta debajo */}
              <text x={x + 16} y={barH + 23} textAnchor="middle" fontSize="8"
                fill={isAlert ? COLOR_ALERTA_TEXT : '#6B7280'}
                fontWeight={isAlert ? '600' : '400'}>
                {b.label.length > 7 ? b.label.slice(0, 6) + '…' : b.label}
              </text>
            </g>
          )
        })}
      </svg>
      {/* Leyenda de alertas */}
      {barrasAlerta.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {barrasAlerta.map(b => (
            <span key={b.label} className="flex items-center gap-1 text-xs"
              style={{ color: COLOR_ALERTA_TEXT }}>
              <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: COLOR_ALERTA_BAR }} />
              {b.label}: {Math.round(b.valor * 100)}%
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Gráfico de torta híbrida (solo D vs S en proporción relativa) ────────────
function GraficoTortaHibrida({ dominante, sumiso }) {
  const datos = [
    { perfil: 'Dominante', valor: dominante, color: PERFIL_COLOR_PIE.Dominante },
    { perfil: 'Sumiso',    valor: sumiso,    color: PERFIL_COLOR_PIE.Sumiso },
  ]
  const total = dominante + sumiso
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
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">
        Polaridad interna del Híbrido
      </p>
      <div className="flex items-center gap-6">
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
          <p className="text-xs text-gray-400 mt-2 max-w-[160px]">
            Proporción D/S excluyendo puntaje Híbrido
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
function DetalleEvaluacion({ id, onVolver }) {
  const [datos, setDatos]               = useState(null)
  const [cargando, setCargando]         = useState(true)
  const [distribucion, setDistribucion] = useState(null)
  const [distHibrida, setDistHibrida]   = useState(null)

  const [alertas, setAlertas] = useState([])

  const [tooltipEditar, setTooltipEditar]       = useState(null)
  const [tooltipSeleccion, setTooltipSeleccion] = useState(null)

  const [evidenciaExpandida, setEvidenciaExpandida]     = useState(false)
  const [evidenciaSeleccionada, setEvidenciaSeleccionada] = useState(new Set())
  const [filtroEspectro, setFiltroEspectro]             = useState('Todos')
  const [copiadoOk, setCopiadoOk]                       = useState(false)

  useEffect(() => {
    cargar()
  }, [id])

  const cargar = async () => {
    try {
      const res = await api.get(`/api/diagnostico/evaluaciones/${id}/detalle`)
      setDatos(res.data)

      // Distribución final: última entrada del historial
      const ultima = res.data.historial.at(-1)
      if (ultima) {
        setDistribucion(ultima.distribucion_tras_respuesta)

        // Bug 1 fix: calcular híbrida en frontend — el backend no la envía en /detalle
        // Condición A: D≥30% AND S≥30% → ambos polos superan umbral
        // Condición B: Híbrido≥60% → espectro híbrido ganó por mayoría directa
        // En ambos casos la proporción interna es D/(D+S) y S/(D+S)
        const d = ultima.distribucion_tras_respuesta.Dominante
        const h = ultima.distribucion_tras_respuesta.Hibrido
        const s = ultima.distribucion_tras_respuesta.Sumiso
        const esHibrido = (d >= 30 && s >= 30) || (h >= 60)
        if (esHibrido) {
          const totalPolar = d + s
          if (totalPolar > 0) {
            setDistHibrida({
              Dominante: parseFloat((d / totalPolar).toFixed(4)),
              Sumiso:    parseFloat((s / totalPolar).toFixed(4)),
            })
          } else {
            // caso extremo: H=100%, D=0, S=0 — mostrar 50/50
            setDistHibrida({ Dominante: 0.5, Sumiso: 0.5 })
          }
        } else {
          setDistHibrida(null)
        }
      }

      // Bug 2 fix: reconstruir alertas desde rastros con origen='alerta'
      // El backend guarda: lema=etiqueta, dependencia="alerta:0.7", palabra=texto marcado
      const todosRastros = res.data.historial.flatMap(item => item.rastro_lexico)
      const alertasReconstruidas = todosRastros
        .filter(r => r.origen === 'alerta')
        .map(r => {
          // extraer peso del campo dependencia: "alerta:0.7" → 0.7
          const pesoRaw = r.dependencia?.startsWith('alerta:')
            ? parseFloat(r.dependencia.split(':')[1]) || 0.5
            : 0.5
          return {
            etiqueta: r.lema || r.palabra,
            peso:     pesoRaw,
            palabra:  r.palabra,
            idRastro: r.id_rastro,
          }
        })
      setAlertas(alertasReconstruidas)

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
      id_rastro:    rastro.id_rastro,
      id_respuesta: rastro.id_respuesta,   // necesario para persistir alerta
      palabra:      rastro.palabra,
      lema:         rastro.lema,
      perfil:       rastro.perfil,
      puntos:       rastro.puntos,
      origen:       rastro.origen || 'automatico',
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
      if (res.data.distribucion_hibrida) setDistHibrida(res.data.distribucion_hibrida)
      else setDistHibrida(null)
      setTooltipEditar(null)
      await cargar()
    } catch { /* silencioso */ }
  }

  const handleGuardarAlerta = async ({ etiqueta, peso, palabra, idRastro, idRespuesta }) => {
    try {
      // Persistir la alerta como rastro especial con origen='alerta'
      // El campo lema (verbo_lematizado) guarda la etiqueta para reconstrucción
      await api.post(`/api/diagnostico/rastros-alerta`, {
        id_respuesta:  idRespuesta,
        texto_marcado: palabra,
        etiqueta_alerta: etiqueta,
        peso,
      })
      // Recargar para leer las alertas persistidas desde la BD
      await cargar()
    } catch {
      // Fallback local si el endpoint no existe aún (no rompe la sesión)
      setAlertas(prev => [...prev, { etiqueta, peso, palabra, idRastro }])
    }
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
      if (res.data.distribucion_hibrida) setDistHibrida(res.data.distribucion_hibrida)
      else setDistHibrida(null)
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

  // ── Datos para Bloque 3 ──────────────────────────────────────────────────
  const todosLosRastros = datos.historial.flatMap(item => item.rastro_lexico)

  const FILTROS_ESPECTRO = ['Todos', 'Dominante', 'Híbrido', 'Sumiso', 'Manual']

  const rastrosFiltrados = todosLosRastros.filter(r => {
    if (filtroEspectro === 'Todos') return true
    if (filtroEspectro === 'Manual') return r.origen === 'manual'
    if (filtroEspectro === 'Híbrido') return r.perfil === 'Hibrido'
    return r.perfil === filtroEspectro
  })

  const toggleChip = (id) => {
    setEvidenciaSeleccionada(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const seleccionarTodoFiltro = () => {
    setEvidenciaSeleccionada(prev => {
      const next = new Set(prev)
      rastrosFiltrados.forEach(r => next.add(r.id_rastro))
      return next
    })
  }

  const limpiarSeleccion = () => setEvidenciaSeleccionada(new Set())

  const copiarAlPortapapeles = async () => {
    const seleccionados = todosLosRastros.filter(r => evidenciaSeleccionada.has(r.id_rastro))
    const grupos = {}
    seleccionados.forEach(r => {
      const etiqueta = r.origen === 'manual' ? 'MANUAL' : r.perfil.toUpperCase()
      if (!grupos[etiqueta]) grupos[etiqueta] = []
      grupos[etiqueta].push(r.palabra)
    })
    const texto = Object.entries(grupos)
      .map(([etiqueta, palabras]) => `${etiqueta}: ${palabras.join(', ')}`)
      .join('\n')
    try {
      await navigator.clipboard.writeText(texto)
      setCopiadoOk(true)
      setTimeout(() => setCopiadoOk(false), 2000)
    } catch { /* silencioso */ }
  }

  const getChipBg = (rastro) => {
    if (rastro.origen === 'manual') return PERFIL_COLOR_BG.manual
    return PERFIL_COLOR_BG[rastro.perfil] || '#F3F4F6'
  }
  const getChipText = (rastro) => {
    if (rastro.origen === 'manual') return PERFIL_COLOR_TEXT.manual
    return PERFIL_COLOR_TEXT[rastro.perfil] || '#374151'
  }

  const FILTRO_COLOR_BG = {
    Todos:     '#F3F4F6',
    Dominante: PERFIL_COLOR_BG.Dominante,
    Híbrido:   PERFIL_COLOR_BG.Hibrido,
    Sumiso:    PERFIL_COLOR_BG.Sumiso,
    Manual:    PERFIL_COLOR_BG.manual,
  }
  const FILTRO_COLOR_TEXT = {
    Todos:     '#374151',
    Dominante: PERFIL_COLOR_TEXT.Dominante,
    Híbrido:   PERFIL_COLOR_TEXT.Hibrido,
    Sumiso:    PERFIL_COLOR_TEXT.Sumiso,
    Manual:    PERFIL_COLOR_TEXT.manual,
  }

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
          onGuardarAlerta={handleGuardarAlerta}
        />
      )}
      {tooltipSeleccion && (
        <TooltipSeleccion
          texto={tooltipSeleccion.texto}
          idRespuesta={tooltipSeleccion.idRespuesta}
          posicion={tooltipSeleccion.posicion}
          onGuardar={handleGuardarManual}
          onCancelar={() => setTooltipSeleccion(null)}
          onGuardarAlerta={handleGuardarAlerta}
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
        <div className="flex items-start gap-12 flex-wrap">
          <GraficoTorta
            dominante={dist.Dominante}
            hibrido={dist.Hibrido}
            sumiso={dist.Sumiso}
          />
          {distHibrida && (
            <GraficoTortaHibrida
              dominante={distHibrida.Dominante}
              sumiso={distHibrida.Sumiso}
            />
          )}
          {alertas.length > 0 && (
            <GraficoBarras dist={dist} alertas={alertas} />
          )}
        </div>
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
            { label: 'Alerta',    bg: COLOR_ALERTA_BG,            txt: COLOR_ALERTA_TEXT },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5 text-xs">
              <span className="px-2 py-0.5 rounded font-medium" style={{ backgroundColor: l.bg, color: l.txt }}>
                {l.label === 'Alerta' ? '⚠ Alerta' : l.label}
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
                  alertas={alertas}
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

      {/* Bloque 3: Evidencia léxica seleccionada */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 mt-6">
        {/* Header clicable */}
        <button
          className="w-full flex items-center justify-between text-left"
          onClick={() => setEvidenciaExpandida(v => !v)}
        >
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-widest">
              Evidencia léxica para el informe
            </h3>
            {evidenciaSeleccionada.size > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-white">
                {evidenciaSeleccionada.size}
              </span>
            )}
          </div>
          <span className="text-gray-400 text-sm select-none">
            {evidenciaExpandida ? '▾' : '▸'}
          </span>
        </button>

        {/* Contenido expandible */}
        {evidenciaExpandida && (
          <div className="mt-5">
            {/* Filtros de espectro */}
            <div className="flex gap-2 flex-wrap mb-4">
              {FILTROS_ESPECTRO.map(f => {
                const activo = filtroEspectro === f
                return (
                  <button
                    key={f}
                    onClick={() => setFiltroEspectro(f)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all border"
                    style={
                      activo
                        ? {
                            backgroundColor: FILTRO_COLOR_BG[f],
                            color: FILTRO_COLOR_TEXT[f],
                            borderColor: FILTRO_COLOR_TEXT[f],
                          }
                        : {
                            backgroundColor: 'transparent',
                            color: '#6B7280',
                            borderColor: '#E5E7EB',
                          }
                    }
                  >
                    {f}
                  </button>
                )
              })}
            </div>

            {/* Grid de chips */}
            {rastrosFiltrados.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">
                No hay rastros para este filtro.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-5">
                {rastrosFiltrados.map(r => {
                  const seleccionado = evidenciaSeleccionada.has(r.id_rastro)
                  return (
                    <button
                      key={r.id_rastro}
                      onClick={() => toggleChip(r.id_rastro)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border"
                      style={{
                        backgroundColor: getChipBg(r),
                        color: getChipText(r),
                        borderColor: seleccionado ? getChipText(r) : 'transparent',
                        boxShadow: seleccionado ? `0 0 0 1.5px ${getChipText(r)}` : 'none',
                        opacity: seleccionado ? 1 : 0.75,
                      }}
                    >
                      {seleccionado && (
                        <span className="text-xs leading-none">✓</span>
                      )}
                      <span>{r.palabra}</span>
                      <span className="opacity-60">·</span>
                      <span className="opacity-70">
                        {r.origen === 'manual' ? 'manual' : r.perfil.toLowerCase()}
                      </span>
                      <span className="opacity-50 text-[10px]">{r.puntos}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-gray-50">
              <span className="text-xs text-gray-400">
                {evidenciaSeleccionada.size > 0
                  ? `${evidenciaSeleccionada.size} seleccionada${evidenciaSeleccionada.size !== 1 ? 's' : ''}`
                  : 'Ninguna seleccionada'}
              </span>

              <button
                onClick={seleccionarTodoFiltro}
                className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Seleccionar todo el filtro
              </button>

              <button
                onClick={limpiarSeleccion}
                className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Limpiar selección
              </button>

              <button
                onClick={copiarAlPortapapeles}
                disabled={evidenciaSeleccionada.size === 0}
                className="ml-auto text-xs px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={
                  copiadoOk
                    ? { backgroundColor: '#D1FAE5', color: '#065F46' }
                    : { backgroundColor: '#1F2937', color: '#FFFFFF' }
                }
              >
                {copiadoOk ? '✓ Copiado' : '📋 Copiar al portapapeles'}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default DetalleEvaluacion