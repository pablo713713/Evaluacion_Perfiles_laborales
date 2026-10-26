import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../services/api'
import {
  PERFILES, etiquetaPerfil, COLOR_PERFIL_BG, COLOR_PERFIL_TEXT, COLOR_MANUAL, COLOR_ALERTA, PALETA,
  calcularPolaridad, reconstruirAlertas, formatoFechaHora,
} from '../../utils/perfiles'
import { construirGraficas } from './Graficos'

// ── Estilos comunes ──────────────────────────────────────────────────────────
const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#1e5263]'
const BTN_SEC = 'flex-1 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50'
const BTN_PRI = 'flex-1 px-3 py-1.5 text-sm text-[#0f3846] font-semibold bg-[#fef08a] rounded-lg hover:bg-[#fef9c3] disabled:opacity-50'

function Modal({ children, borde }) {
  return (
    <div
      data-tooltip="true"
      className="fixed z-50 bg-white rounded-xl shadow-2xl p-4 w-80"
      style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: `1.5px solid ${borde || '#E5E7EB'}` }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

function CabeceraModal({ titulo, color, onCerrar }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>{titulo}</span>
      <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
    </div>
  )
}

function SelectorPerfil({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT}>
      {PERFILES.map((p) => <option key={p} value={p}>{etiquetaPerfil(p)}</option>)}
    </select>
  )
}

// Formulario para crear una alerta (desde un rastro o desde texto seleccionado)
function FormAlerta({ texto, onVolver, onGuardar }) {
  const [etiqueta, setEtiqueta] = useState('')
  const [peso, setPeso] = useState(0.5)
  return (
    <div className="space-y-3">
      <div className="rounded-lg p-2" style={{ backgroundColor: COLOR_ALERTA.bg }}>
        <p className="text-xs mb-1" style={{ color: COLOR_ALERTA.text }}>Texto marcado</p>
        <p className="text-sm font-medium" style={{ color: COLOR_ALERTA.text }}>"{texto}"</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Tipo de alerta</p>
        <input autoFocus value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)}
          placeholder="ej. narcisismo, impulsividad…" className={INPUT} style={{ borderColor: COLOR_ALERTA.barra }} />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Peso <span className="text-gray-400">(0.1 – 1.0)</span></p>
        <input type="number" step="0.05" min="0.1" max="1" value={peso} onChange={(e) => setPeso(e.target.value)}
          className={INPUT} style={{ borderColor: COLOR_ALERTA.barra }} />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onVolver} className={BTN_SEC}>← Volver</button>
        <button
          disabled={!etiqueta.trim()}
          onClick={() => onGuardar(etiqueta.trim(), Math.min(1, Math.max(0.1, parseFloat(peso) || 0.5)))}
          className="flex-1 px-3 py-1.5 text-sm text-white rounded-lg disabled:opacity-40"
          style={{ backgroundColor: COLOR_ALERTA.barra }}
        >
          Agregar alerta
        </button>
      </div>
    </div>
  )
}

function BotonAgregarAlerta({ onClick }) {
  return (
    <button onClick={onClick} className="w-full px-3 py-1.5 text-xs rounded-lg border font-medium"
      style={{ borderColor: COLOR_ALERTA.barra, color: COLOR_ALERTA.text, backgroundColor: COLOR_ALERTA.bg }}>
      ▲ Agregar alerta
    </button>
  )
}

// ── Editar un rastro automático o manual ─────────────────────────────────────
function TooltipEditable({ token, onGuardar, onCancelar, onGuardarAlerta }) {
  const [perfil, setPerfil] = useState(token.perfil)
  const [puntos, setPuntos] = useState(Math.abs(token.puntos))
  const [guardando, setGuardando] = useState(false)
  const [modoAlerta, setModoAlerta] = useState(false)
  const esManual = token.origen === 'manual'

  return (
    <Modal borde={modoAlerta ? COLOR_ALERTA.barra : esManual ? COLOR_MANUAL.borde : '#E5E7EB'}>
      <CabeceraModal
        titulo={modoAlerta ? '▲ Agregar alerta' : esManual ? 'Rastro manual' : 'Editar rastro'}
        color={modoAlerta ? COLOR_ALERTA.text : esManual ? COLOR_MANUAL.text : '#6B7280'}
        onCerrar={onCancelar}
      />
      {modoAlerta ? (
        <FormAlerta
          texto={token.palabra}
          onVolver={() => setModoAlerta(false)}
          onGuardar={(etiqueta, peso) => {
            onGuardarAlerta({ etiqueta, peso, palabra: token.palabra, idRastro: token.id_rastro, idRespuesta: token.id_respuesta })
            onCancelar()
          }}
        />
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Texto</p>
            <p className="text-sm font-medium text-gray-800">"{token.palabra}"</p>
          </div>
          {token.lema && !esManual && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Lema detectado</p>
              <p className="text-sm text-gray-700">{token.lema}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 mb-1">Espectro</p>
            <SelectorPerfil value={perfil} onChange={setPerfil} />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Puntos</p>
            <input type="number" step="0.05" min="0" max="1" value={puntos} onChange={(e) => setPuntos(e.target.value)} className={INPUT} />
          </div>
          <BotonAgregarAlerta onClick={() => setModoAlerta(true)} />
          <div className="flex gap-2 pt-1">
            <button onClick={onCancelar} className={BTN_SEC}>Cancelar</button>
            <button
              disabled={guardando}
              onClick={async () => { setGuardando(true); await onGuardar(token.id_rastro, perfil, parseFloat(puntos)); setGuardando(false) }}
              className={BTN_PRI}
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Crear rastro manual desde texto seleccionado ─────────────────────────────
function TooltipSeleccion({ texto, idRespuesta, onGuardar, onCancelar, onGuardarAlerta }) {
  const [perfil, setPerfil] = useState('Dominante')
  const [puntos, setPuntos] = useState(0.5)
  const [guardando, setGuardando] = useState(false)
  const [modoAlerta, setModoAlerta] = useState(false)

  return (
    <Modal borde={modoAlerta ? COLOR_ALERTA.barra : COLOR_MANUAL.borde}>
      <CabeceraModal
        titulo={modoAlerta ? '▲ Agregar alerta' : 'Nuevo rastro manual'}
        color={modoAlerta ? COLOR_ALERTA.text : COLOR_MANUAL.text}
        onCerrar={onCancelar}
      />
      {modoAlerta ? (
        <FormAlerta
          texto={texto}
          onVolver={() => setModoAlerta(false)}
          onGuardar={(etiqueta, peso) => {
            onGuardarAlerta({ etiqueta, peso, palabra: texto, idRastro: null, idRespuesta })
            onCancelar()
          }}
        />
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Texto seleccionado</p>
            <p className="text-sm font-medium px-2 py-1 rounded" style={{ backgroundColor: COLOR_MANUAL.bg, color: COLOR_MANUAL.text }}>"{texto}"</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Espectro</p>
            <SelectorPerfil value={perfil} onChange={setPerfil} />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Puntos</p>
            <input type="number" step="0.05" min="0" max="1" value={puntos} onChange={(e) => setPuntos(e.target.value)} className={INPUT} />
          </div>
          <BotonAgregarAlerta onClick={() => setModoAlerta(true)} />
          <div className="flex gap-2 pt-1">
            <button onClick={onCancelar} className={BTN_SEC}>Cancelar</button>
            <button
              disabled={guardando}
              onClick={async () => { setGuardando(true); await onGuardar(idRespuesta, texto, perfil, parseFloat(puntos)); setGuardando(false) }}
              className="flex-1 px-3 py-1.5 text-sm text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: COLOR_MANUAL.borde }}
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Ver / editar / eliminar una alerta (antes no se podía abrir) ─────────────
function TooltipAlerta({ alerta, onGuardar, onEliminar, onCancelar }) {
  const [etiqueta, setEtiqueta] = useState(alerta.etiqueta)
  const [peso, setPeso] = useState(alerta.peso)
  const [guardando, setGuardando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)

  return (
    <Modal borde={COLOR_ALERTA.barra}>
      <CabeceraModal titulo="▲ Alerta clínica" color={COLOR_ALERTA.text} onCerrar={onCancelar} />
      <div className="space-y-3">
        <div className="rounded-lg p-2" style={{ backgroundColor: COLOR_ALERTA.bg }}>
          <p className="text-xs mb-1" style={{ color: COLOR_ALERTA.text }}>Texto marcado</p>
          <p className="text-sm font-medium" style={{ color: COLOR_ALERTA.text }}>"{alerta.palabra}"</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Tipo de alerta</p>
          <input value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} className={INPUT} style={{ borderColor: COLOR_ALERTA.barra }} />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Peso <span className="text-gray-400">(0.1 – 1.0)</span></p>
          <input type="number" step="0.05" min="0.1" max="1" value={peso} onChange={(e) => setPeso(e.target.value)}
            className={INPUT} style={{ borderColor: COLOR_ALERTA.barra }} />
        </div>
        <p className="text-xs text-gray-400">Las alertas no modifican la distribución D / M / C; se muestran aparte en las gráficas y en el informe.</p>

        {confirmar ? (
          <div className="flex gap-2 pt-1">
            <button onClick={() => setConfirmar(false)} className={BTN_SEC}>No</button>
            <button onClick={() => onEliminar(alerta.idRastro)} className="flex-1 px-3 py-1.5 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600">
              Sí, eliminar
            </button>
          </div>
        ) : (
          <div className="flex gap-2 pt-1">
            <button onClick={() => setConfirmar(true)} className="px-3 py-1.5 text-sm text-red-500 border border-red-100 rounded-lg hover:bg-red-50">
              Eliminar
            </button>
            <button
              disabled={guardando || !etiqueta.trim()}
              onClick={async () => {
                setGuardando(true)
                await onGuardar(alerta.idRastro, etiqueta.trim(), Math.min(1, Math.max(0.1, parseFloat(peso) || 0.5)))
                setGuardando(false)
              }}
              className="flex-1 px-3 py-1.5 text-sm text-white rounded-lg disabled:opacity-40"
              style={{ backgroundColor: COLOR_ALERTA.barra }}
            >
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Texto de la respuesta con palabras resaltadas ────────────────────────────
function TextoResaltado({ texto, rastros, onClickToken, onClickAlerta, onSeleccionTexto, idRespuesta }) {
  const handleMouseUp = (e) => {
    if (e.target.closest('[data-tooltip]')) return
    setTimeout(() => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) return
      const textoSel = sel.toString().trim()
      if (!textoSel || textoSel.length < 2) return
      onSeleccionTexto({ texto: textoSel, idRespuesta })
      sel.removeAllRanges()
    }, 10)
  }

  if (!rastros || rastros.length === 0) {
    return <span className="text-gray-700 select-text" onMouseUp={handleMouseUp}>{texto}</span>
  }

  const manuales = rastros.filter((r) => r.origen === 'manual')
  const alertasR = rastros.filter((r) => r.origen === 'alerta')
  const automaticos = rastros.filter((r) => r.origen !== 'manual' && r.origen !== 'alerta')

  const limpiar = (s) => s.toLowerCase().replace(/[.,;:!?"“”‘’'()]/g, '')
  const mapaAuto = {}
  automaticos.forEach((r) => { const k = limpiar(r.palabra); if (!mapaAuto[k]) mapaAuto[k] = r })

  // Marca frases (manuales y alertas) antes de procesar palabra por palabra
  let segmentos = [{ texto, rastro: null, tipo: null }]
  const marcar = (lista, tipo) => {
    lista.forEach((rastro) => {
      const frase = rastro.palabra.toLowerCase()
      const nuevos = []
      segmentos.forEach((seg) => {
        if (seg.rastro) { nuevos.push(seg); return }
        const idx = seg.texto.toLowerCase().indexOf(frase)
        if (idx === -1) { nuevos.push(seg); return }
        if (idx > 0) nuevos.push({ texto: seg.texto.slice(0, idx), rastro: null, tipo: null })
        nuevos.push({ texto: seg.texto.slice(idx, idx + frase.length), rastro, tipo })
        if (idx + frase.length < seg.texto.length) nuevos.push({ texto: seg.texto.slice(idx + frase.length), rastro: null, tipo: null })
      })
      segmentos = nuevos
    })
  }
  marcar(manuales, 'manual')
  marcar(alertasR, 'alerta')

  return (
    <span className="select-text" onMouseUp={handleMouseUp}>
      {segmentos.map((seg, i) => {
        if (seg.tipo === 'alerta') {
          return (
            <span key={i}
              onClick={(e) => { e.stopPropagation(); onClickAlerta(seg.rastro) }}
              title="Ver o editar alerta"
              className="cursor-pointer rounded px-0.5 transition-all hover:brightness-95"
              style={{ backgroundColor: COLOR_ALERTA.bg, color: COLOR_ALERTA.text, fontWeight: 700,
                textDecoration: 'underline', textDecorationColor: COLOR_ALERTA.barra, textDecorationStyle: 'wavy' }}>
              {seg.texto}
            </span>
          )
        }
        if (seg.tipo === 'manual') {
          return (
            <span key={i}
              onClick={(e) => { e.stopPropagation(); onClickToken(seg.rastro) }}
              className="cursor-pointer rounded px-0.5 transition-all hover:brightness-95"
              style={{ backgroundColor: COLOR_MANUAL.bg, color: COLOR_MANUAL.text, fontWeight: 600, textDecoration: 'underline dotted' }}>
              {seg.texto}
            </span>
          )
        }
        return (
          <span key={i}>
            {seg.texto.split(/(\s+)/).map((parte, j) => {
              const rastro = mapaAuto[limpiar(parte.trim())]
              if (rastro && parte.trim()) {
                return (
                  <span key={j}
                    onClick={(e) => { e.stopPropagation(); onClickToken(rastro) }}
                    className="cursor-pointer rounded px-0.5 mx-0.5 transition-all hover:brightness-95"
                    style={{ backgroundColor: COLOR_PERFIL_BG[rastro.perfil] || '#F3F4F6',
                      color: COLOR_PERFIL_TEXT[rastro.perfil] || '#374151', fontWeight: 600, textDecoration: 'underline dotted' }}>
                    {parte}
                  </span>
                )
              }
              return <span key={j}>{parte}</span>
            })}
          </span>
        )
      })}
    </span>
  )
}

// ── Pestañas superiores estilo "Siguiendo | Para ti" ─────────────────────────
function Pestanas({ activa, onCambiar, totalGraficas }) {
  const items = [
    { id: 'preguntas', label: 'Preguntas' },
    { id: 'graficas', label: 'Gráficas', badge: totalGraficas },
  ]
  return (
    <div className="sticky top-0 z-30 flex justify-center gap-10 py-3 mb-6 rounded-xl"
      style={{ backgroundColor: PALETA.navy }}>
      {items.map((it) => {
        const on = activa === it.id
        return (
          <button key={it.id} onClick={() => onCambiar(it.id)} className="relative pb-1.5 text-base transition-colors"
            style={{ color: on ? '#FFFFFF' : 'rgba(207,250,254,0.55)', fontWeight: on ? 700 : 500 }}>
            {it.label}
            {it.badge > 0 && (
              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle"
                style={{ backgroundColor: on ? PALETA.acento : PALETA.borde, color: on ? PALETA.navy : '#CFFAFE' }}>
                {it.badge}
              </span>
            )}
            <span className="absolute left-1/2 -translate-x-1/2 -bottom-0.5 h-[3px] rounded-full transition-all"
              style={{ width: on ? '60%' : 0, backgroundColor: PALETA.acento }} />
          </button>
        )
      })}
    </div>
  )
}

// ── Feed vertical de gráficas (deslizar arriba / abajo) ──────────────────────
function FeedGraficas({ graficas }) {
  const contenedor = useRef(null)
  const [actual, setActual] = useState(0)

  const irA = useCallback((i) => {
    const el = contenedor.current
    if (!el) return
    const destino = Math.max(0, Math.min(graficas.length - 1, i))
    el.scrollTo({ top: destino * el.clientHeight, behavior: 'smooth' })
  }, [graficas.length])

  useEffect(() => {
    const el = contenedor.current
    if (!el) return
    const onScroll = () => setActual(Math.round(el.scrollTop / el.clientHeight))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); irA(actual + 1) }
      if (e.key === 'ArrowUp') { e.preventDefault(); irA(actual - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [actual, irA])

  if (graficas.length === 0) {
    return <div className="text-center py-16 text-sm text-gray-400">No hay datos suficientes para graficar.</div>
  }

  return (
    <div className="relative">
      <div ref={contenedor} className="overflow-y-auto snap-y snap-mandatory rounded-2xl"
        style={{ height: 'calc(100vh - 260px)', minHeight: 460, scrollbarWidth: 'none' }}>
        {graficas.map((g, i) => (
          <section key={g.id} className="snap-start h-full p-2">
            <div className="h-full bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: PALETA.borde }}>
                    Gráfica {i + 1} de {graficas.length}
                  </p>
                  <h3 className="text-lg font-semibold text-gray-800 mt-0.5">{g.titulo}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{g.descripcion}</p>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center p-6 min-h-0">
                <div className="w-full max-w-3xl">{g.render()}</div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Navegación lateral */}
      {graficas.length > 1 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
          <button onClick={() => irA(actual - 1)} disabled={actual === 0}
            className="w-9 h-9 rounded-full text-white shadow disabled:opacity-30" style={{ backgroundColor: PALETA.navy }}
            aria-label="Gráfica anterior">▲</button>
          {graficas.map((g, i) => (
            <button key={g.id} onClick={() => irA(i)} aria-label={g.titulo}
              className="rounded-full transition-all"
              style={{ width: 8, height: i === actual ? 22 : 8, backgroundColor: i === actual ? PALETA.navy : '#CBD5E1' }} />
          ))}
          <button onClick={() => irA(actual + 1)} disabled={actual === graficas.length - 1}
            className="w-9 h-9 rounded-full text-white shadow disabled:opacity-30" style={{ backgroundColor: PALETA.navy }}
            aria-label="Gráfica siguiente">▼</button>
        </div>
      )}
      <p className="text-center text-xs text-gray-400 mt-2">Desliza o usa ↑ ↓ para cambiar de gráfica</p>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
function DetalleEvaluacion({ id, onVolver }) {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [distribucion, setDistribucion] = useState(null)
  const [alertas, setAlertas] = useState([])
  const [pestana, setPestana] = useState('preguntas')

  const [tooltipEditar, setTooltipEditar] = useState(null)
  const [tooltipSeleccion, setTooltipSeleccion] = useState(null)
  const [tooltipAlerta, setTooltipAlerta] = useState(null)
  const [error, setError] = useState('')

  const [evidenciaExpandida, setEvidenciaExpandida] = useState(false)
  const [evidenciaSeleccionada, setEvidenciaSeleccionada] = useState(new Set())
  const [filtroEspectro, setFiltroEspectro] = useState('Todos')
  const [copiadoOk, setCopiadoOk] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const res = await api.get(`/api/diagnostico/evaluaciones/${id}/detalle`)
      setDatos(res.data)
      const ultima = res.data.historial.at(-1)
      setDistribucion(ultima ? ultima.distribucion_tras_respuesta : null)
      setAlertas(reconstruirAlertas(res.data.historial))
    } catch {
      setError('Error al cargar la evaluación.')
    } finally {
      setCargando(false)
    }
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  const cerrarTodo = () => { setTooltipEditar(null); setTooltipSeleccion(null); setTooltipAlerta(null) }
  const fallo = (msg) => { setError(msg); setTimeout(() => setError(''), 4000) }

  const handleGuardarEdicion = async (idRastro, perfil, puntos) => {
    try {
      await api.patch(`/api/diagnostico/rastros/${idRastro}`, { perfil_asignado: perfil, puntos_sumados: puntos })
      cerrarTodo(); await cargar()
    } catch { fallo('No se pudo guardar el rastro.') }
  }

  const handleGuardarManual = async (idRespuesta, textoSel, perfil, puntos) => {
    try {
      await api.post('/api/diagnostico/rastros-manuales', {
        id_respuesta: idRespuesta, texto_seleccionado: textoSel, perfil_asignado: perfil, puntos_sumados: puntos,
      })
      cerrarTodo(); await cargar()
    } catch { fallo('No se pudo crear el rastro manual.') }
  }

  const handleGuardarAlerta = async ({ etiqueta, peso, palabra, idRespuesta }) => {
    try {
      await api.post('/api/diagnostico/rastros-alerta', {
        id_respuesta: idRespuesta, texto_marcado: palabra, etiqueta_alerta: etiqueta, peso,
      })
      await cargar()
    } catch { fallo('No se pudo guardar la alerta.') }
  }

  const handleEditarAlerta = async (idRastro, etiqueta, peso) => {
    try {
      await api.patch(`/api/diagnostico/rastros-alerta/${idRastro}`, { etiqueta_alerta: etiqueta, peso })
      cerrarTodo(); await cargar()
    } catch { fallo('No se pudo actualizar la alerta.') }
  }

  const handleEliminarAlerta = async (idRastro) => {
    try {
      await api.delete(`/api/diagnostico/rastros-alerta/${idRastro}`)
      cerrarTodo(); await cargar()
    } catch { fallo('No se pudo eliminar la alerta.') }
  }

  if (cargando) return <div className="text-center py-16 text-sm text-gray-400">Cargando evaluación...</div>
  if (!datos) return <div className="text-center py-16 text-sm text-red-400">Error al cargar la evaluación.</div>

  const polaridad = calcularPolaridad(distribucion)
  const graficas = construirGraficas({ dist: distribucion, polaridad, alertas, historial: datos.historial })

  // ── Evidencia léxica ──
  const todos = datos.historial.flatMap((item) => item.rastro_lexico)
  const FILTROS = ['Todos', 'Dominante', 'Hibrido', 'Sumiso', 'Manual', 'Alerta']
  const tipoDe = (r) => (r.origen === 'alerta' ? 'Alerta' : r.origen === 'manual' ? 'Manual' : r.perfil)
  const etiquetaFiltro = (f) => (PERFILES.includes(f) ? etiquetaPerfil(f) : f)
  const estiloTipo = (t) =>
    t === 'Alerta' ? { bg: COLOR_ALERTA.bg, txt: COLOR_ALERTA.text }
    : t === 'Manual' ? { bg: COLOR_MANUAL.bg, txt: COLOR_MANUAL.text }
    : t === 'Todos' ? { bg: '#F3F4F6', txt: '#374151' }
    : { bg: COLOR_PERFIL_BG[t], txt: COLOR_PERFIL_TEXT[t] }

  const filtrados = todos.filter((r) => filtroEspectro === 'Todos' || tipoDe(r) === filtroEspectro)

  const toggleChip = (rid) => setEvidenciaSeleccionada((prev) => {
    const n = new Set(prev); n.has(rid) ? n.delete(rid) : n.add(rid); return n
  })

  const copiar = async () => {
    const grupos = {}
    todos.filter((r) => evidenciaSeleccionada.has(r.id_rastro)).forEach((r) => {
      const t = tipoDe(r)
      const clave = (PERFILES.includes(t) ? etiquetaPerfil(t) : t).toUpperCase()
      ;(grupos[clave] = grupos[clave] || []).push(r.origen === 'alerta' ? `${r.palabra} (${r.lema})` : r.palabra)
    })
    try {
      await navigator.clipboard.writeText(Object.entries(grupos).map(([k, v]) => `${k}: ${v.join(', ')}`).join('\n'))
      setCopiadoOk(true); setTimeout(() => setCopiadoOk(false), 2000)
    } catch { /* silencioso */ }
  }

  return (
    <div>
      {/* Overlay + modales */}
      {(tooltipEditar || tooltipSeleccion || tooltipAlerta) && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={cerrarTodo} />
      )}
      {tooltipEditar && (
        <TooltipEditable token={tooltipEditar} onGuardar={handleGuardarEdicion} onCancelar={cerrarTodo} onGuardarAlerta={handleGuardarAlerta} />
      )}
      {tooltipSeleccion && (
        <TooltipSeleccion texto={tooltipSeleccion.texto} idRespuesta={tooltipSeleccion.idRespuesta}
          onGuardar={handleGuardarManual} onCancelar={cerrarTodo} onGuardarAlerta={handleGuardarAlerta} />
      )}
      {tooltipAlerta && (
        <TooltipAlerta alerta={tooltipAlerta} onGuardar={handleEditarAlerta} onEliminar={handleEliminarAlerta} onCancelar={cerrarTodo} />
      )}

      {/* Encabezado */}
      <div className="rounded-2xl px-6 py-5 mb-4 text-white" style={{ backgroundColor: PALETA.navyOscuro, border: `1px solid ${PALETA.borde}` }}>
        <button onClick={onVolver} className="text-sm text-cyan-100/70 hover:text-white transition-colors">← Volver</button>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="w-8 h-px mb-3" style={{ backgroundColor: PALETA.acento }} />
            <h2 className="text-xl font-light">{datos.candidato.nombre}</h2>
            <p className="text-xs text-cyan-100/60 mt-1">Evaluación finalizada el {formatoFechaHora(datos.fecha_fin)}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: PALETA.navy, border: `1px solid ${PALETA.borde}` }}>
              Perfil sistema: <strong style={{ color: PALETA.acento }}>{etiquetaPerfil(datos.perfil_sistema)}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: PALETA.navy, border: `1px solid ${PALETA.borde}` }}>
              Confianza: <strong style={{ color: PALETA.acento }}>{datos.confianza_sistema}%</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: PALETA.navy, border: `1px solid ${PALETA.borde}` }}>
              Psicólogo: <strong className="text-white">{datos.psicologo.nombre}</strong>
            </span>
          </div>
        </div>
      </div>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>}

      <Pestanas activa={pestana} onCambiar={setPestana} totalGraficas={graficas.length} />

      {pestana === 'graficas' && <FeedGraficas graficas={graficas} />}

      {pestana === 'preguntas' && (
        <>
          {/* Instrucciones + leyenda */}
          <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Haz clic en una palabra resaltada para editarla. Selecciona texto con el mouse para crear un rastro manual o una alerta.
            </p>
            <div className="flex gap-2 flex-wrap">
              {[...PERFILES.map((p) => ({ l: etiquetaPerfil(p), ...estiloTipo(p) })),
                { l: 'Manual', ...estiloTipo('Manual') }, { l: '▲ Alerta', ...estiloTipo('Alerta') }].map((x) => (
                <span key={x.l} className="px-2 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: x.bg, color: x.txt }}>{x.l}</span>
              ))}
            </div>
          </div>

          {/* Preguntas */}
          <div className="space-y-4">
            {datos.historial.map((item, idx) => {
              const d = item.distribucion_tras_respuesta || {}
              return (
                <div key={item.id_respuesta} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-start gap-3 px-5 py-4" style={{ backgroundColor: '#F0F7F9', borderBottom: '1px solid #DCEBEF' }}>
                    <span className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: PALETA.navy, color: PALETA.acento }}>{idx + 1}</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: PALETA.borde }}>Pregunta {idx + 1}</p>
                      <p className="text-sm text-gray-700 mt-0.5">{item.pregunta}</p>
                    </div>
                    {item.modalidad && item.modalidad !== 'texto' && (
                      <span className="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-100"
                        title="El candidato dictó esta respuesta por voz">
                        🎙 {item.modalidad === 'mixta' ? 'Voz + texto' : 'Por voz'}
                      </span>
                    )}
                  </div>

                  <div className="px-5 py-4">
                    <div className="text-[15px] leading-relaxed text-gray-800 rounded-xl p-4 border-l-4"
                      style={{ backgroundColor: '#FAFBFC', borderLeftColor: PALETA.acento }}>
                      <TextoResaltado
                        texto={item.texto_respuesta}
                        rastros={item.rastro_lexico}
                        idRespuesta={item.id_respuesta}
                        onClickToken={(r) => { cerrarTodo(); setTooltipEditar({ ...r, origen: r.origen || 'automatico' }) }}
                        onClickAlerta={(r) => { cerrarTodo(); setTooltipAlerta(reconstruirAlertas([{ rastro_lexico: [r] }])[0]) }}
                        onSeleccionTexto={(info) => { cerrarTodo(); setTooltipSeleccion(info) }}
                      />
                    </div>

                    {/* Distribución tras la respuesta: barra apilada */}
                    <div className="mt-3">
                      <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                        {PERFILES.map((p) => (
                          <div key={p} style={{ width: `${d[p] || 0}%`, backgroundColor: COLOR_PERFIL_TEXT[p], opacity: 0.75 }} />
                        ))}
                      </div>
                      <div className="flex gap-2 text-xs flex-wrap mt-2">
                        <span className="text-gray-400">Tras esta respuesta:</span>
                        {PERFILES.map((p) => (
                          <span key={p} className="px-2 py-0.5 rounded font-medium" style={{ backgroundColor: COLOR_PERFIL_BG[p], color: COLOR_PERFIL_TEXT[p] }}>
                            {etiquetaPerfil(p)}: {d[p] ?? 0}%
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Evidencia léxica para el informe */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mt-6">
            <button className="w-full flex items-center justify-between text-left" onClick={() => setEvidenciaExpandida((v) => !v)}>
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: PALETA.navy }}>Evidencia léxica para el informe</h3>
                {evidenciaSeleccionada.size > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: PALETA.navy, color: PALETA.acento }}>
                    {evidenciaSeleccionada.size}
                  </span>
                )}
              </div>
              <span className="text-gray-400 text-sm select-none">{evidenciaExpandida ? '▾' : '▸'}</span>
            </button>

            {evidenciaExpandida && (
              <div className="mt-5">
                <div className="flex gap-2 flex-wrap mb-4">
                  {FILTROS.map((f) => {
                    const on = filtroEspectro === f
                    const e = estiloTipo(f)
                    return (
                      <button key={f} onClick={() => setFiltroEspectro(f)}
                        className="px-3 py-1 rounded-full text-xs font-medium transition-all border"
                        style={on ? { backgroundColor: e.bg, color: e.txt, borderColor: e.txt } : { color: '#6B7280', borderColor: '#E5E7EB' }}>
                        {etiquetaFiltro(f)}
                      </button>
                    )
                  })}
                </div>

                {filtrados.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">No hay rastros para este filtro.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {filtrados.map((r) => {
                      const sel = evidenciaSeleccionada.has(r.id_rastro)
                      const t = tipoDe(r)
                      const e = estiloTipo(t)
                      return (
                        <button key={r.id_rastro} onClick={() => toggleChip(r.id_rastro)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border"
                          style={{ backgroundColor: e.bg, color: e.txt, borderColor: sel ? e.txt : 'transparent',
                            boxShadow: sel ? `0 0 0 1.5px ${e.txt}` : 'none', opacity: sel ? 1 : 0.8 }}>
                          {sel && <span>✓</span>}
                          <span>{r.palabra}</span>
                          <span className="opacity-60">·</span>
                          <span className="opacity-75">{t === 'Alerta' ? r.lema : PERFILES.includes(t) ? etiquetaPerfil(t).toLowerCase() : 'manual'}</span>
                          {t !== 'Alerta' && <span className="opacity-50 text-[10px]">{r.puntos}</span>}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    {evidenciaSeleccionada.size > 0 ? `${evidenciaSeleccionada.size} seleccionada${evidenciaSeleccionada.size !== 1 ? 's' : ''}` : 'Ninguna seleccionada'}
                  </span>
                  <button onClick={() => setEvidenciaSeleccionada((p) => { const n = new Set(p); filtrados.forEach((r) => n.add(r.id_rastro)); return n })}
                    className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Seleccionar todo el filtro</button>
                  <button onClick={() => setEvidenciaSeleccionada(new Set())}
                    className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Limpiar selección</button>
                  <button onClick={copiar} disabled={evidenciaSeleccionada.size === 0}
                    className="ml-auto text-xs px-4 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={copiadoOk ? { backgroundColor: '#D1FAE5', color: '#065F46' } : { backgroundColor: PALETA.navy, color: PALETA.acento }}>
                    {copiadoOk ? '✓ Copiado' : 'Copiar al portapapeles'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default DetalleEvaluacion
