import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import {
  PERFILES, etiquetaPerfil, COLOR_PERFIL_BG, COLOR_PERFIL_TEXT, COLOR_MANUAL, COLOR_ALERTA, PALETA,
  calcularPolaridad, reconstruirAlertas, formatoFechaHora,
} from '../../utils/perfiles'
import { construirGraficas } from './Graficos'

// ── Utilidades para el PDF ───────────────────────────────────────────────────
const hexARgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const NAVY = hexARgb(PALETA.navy)
const ACENTO = hexARgb(PALETA.acento)
const BORDE = hexARgb(PALETA.borde)

// Convierte un <svg> del DOM en PNG (lo que se ve en pantalla es lo que va al PDF)
const svgAPng = (svg, escala = 3) => new Promise((resolve, reject) => {
  const vb = svg.viewBox.baseVal
  const w = vb && vb.width ? vb.width : svg.clientWidth
  const h = vb && vb.height ? vb.height : svg.clientHeight
  const clon = svg.cloneNode(true)
  clon.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clon.setAttribute('width', w)
  clon.setAttribute('height', h)
  clon.removeAttribute('style')
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = w * escala
    canvas.height = h * escala
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    resolve({ url: canvas.toDataURL('image/png'), w, h })
  }
  img.onerror = () => reject(new Error('No se pudo convertir la gráfica'))
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clon))
})

// Carga jsPDF desde CDN (UMD) si no está ya en window
const cargarJsPDF = () => new Promise((resolve, reject) => {
  if (window.jspdf) { resolve(window.jspdf.jsPDF); return }
  const s = document.createElement('script')
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  s.onload = () => (window.jspdf ? resolve(window.jspdf.jsPDF) : reject(new Error('jsPDF no disponible')))
  s.onerror = () => reject(new Error('No se pudo cargar jsPDF'))
  document.head.appendChild(s)
})

const Seccion = ({ titulo, children, extra }) => (
  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-4">
    <div className="flex items-center justify-between mb-4">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: PALETA.navy }}>
        <span className="w-1 h-4 rounded-full" style={{ backgroundColor: PALETA.acento }} />
        {titulo}
      </h3>
      {extra}
    </div>
    {children}
  </div>
)

function RedaccionDiagnostico({ id, onVolver }) {
  const [datos, setDatos] = useState(null)
  const [fechaEvaluacion, setFechaEvaluacion] = useState(null)
  const [texto, setTexto] = useState('')
  const [espectro, setEspectro] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const [distribucion, setDistribucion] = useState(null)
  const [historial, setHistorial] = useState([])
  const [evidencias, setEvidencias] = useState([])
  const [respuestaSelec, setRespuestaSelec] = useState('')
  const [notaEvidencia, setNotaEvidencia] = useState('')
  const graficasRef = useRef(null)

  useEffect(() => {
    let cancelado = false
    const cargar = async () => {
      try {
        const [rDiag, rDetalle] = await Promise.all([
          api.get(`/api/diagnostico/evaluaciones/${id}/diagnostico`),
          api.get(`/api/diagnostico/evaluaciones/${id}/detalle`),
        ])
        if (cancelado) return
        setDatos(rDiag.data)
        setTexto(rDiag.data.texto_diagnostico || '')
        setEspectro(rDiag.data.espectro_confirmado || rDiag.data.perfil_sistema || 'Dominante')
        setFechaEvaluacion(rDetalle.data.fecha_fin || null)
        const hist = rDetalle.data.historial || []
        setHistorial(hist)
        if (hist.length > 0) setDistribucion(hist[hist.length - 1].distribucion_tras_respuesta)
      } catch {
        if (!cancelado) setError('Error al cargar los datos del informe.')
      } finally {
        if (!cancelado) setCargando(false)
      }
    }
    cargar()
    return () => { cancelado = true }
  }, [id])

  const polaridad = calcularPolaridad(distribucion)
  const alertas = reconstruirAlertas(historial)
  const graficas = construirGraficas({ dist: distribucion, polaridad, alertas, historial })

  const guardar = async () => {
    if (!texto.trim()) { setError('El diagnóstico no puede estar vacío.'); return }
    setGuardando(true); setError('')
    try {
      await api.post(`/api/diagnostico/evaluaciones/${id}/diagnostico`, { texto_diagnostico: texto, espectro_confirmado: espectro })
      setExito('Diagnóstico guardado correctamente.')
      setTimeout(() => setExito(''), 3000)
    } catch {
      setError('Error al guardar el diagnóstico.')
    } finally {
      setGuardando(false)
    }
  }

  const agregarEvidencia = () => {
    if (!respuestaSelec) return
    const item = historial.find((h) => String(h.id_respuesta) === String(respuestaSelec))
    if (!item) return
    setEvidencias((prev) => {
      const i = prev.findIndex((e) => String(e.idRespuesta) === String(respuestaSelec))
      if (i !== -1) {
        const copia = [...prev]
        copia[i] = { ...copia[i], nota: notaEvidencia.trim() }
        return copia
      }
      return [...prev, { idRespuesta: item.id_respuesta, pregunta: item.pregunta, respuesta: item.texto_respuesta,
        rastros: item.rastro_lexico || [], nota: notaEvidencia.trim() }]
    })
    setNotaEvidencia(''); setRespuestaSelec('')
  }

  // ── Exportación PDF ────────────────────────────────────────────────────────
  const exportarPDF = async () => {
    if (!texto.trim()) { setError('Guarde el diagnóstico antes de exportar.'); return }
    setGenerandoPDF(true); setError('')
    try {
      const JsPDF = await cargarJsPDF()
      const doc = new JsPDF({ unit: 'mm', format: 'a4' })
      const ANCHO = 210, ALTO = 297, M = 18, UTIL = ANCHO - 2 * M
      const LIMITE = ALTO - 22
      const emision = new Date().toLocaleString('es-BO', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
      let y = 0

      const nuevaPagina = () => { doc.addPage(); y = 20 }
      const espacio = (mm) => { if (y + mm > LIMITE) nuevaPagina() }
      const tituloSeccion = (t) => {
        espacio(16)
        doc.setFillColor(...ACENTO); doc.rect(M, y - 4, 1.6, 6, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...NAVY)
        doc.text(t, M + 4, y + 0.6)
        y += 8
      }

      // Encabezado con color
      doc.setFillColor(...NAVY); doc.rect(0, 0, ANCHO, 34, 'F')
      doc.setFillColor(...ACENTO); doc.rect(0, 34, ANCHO, 1.4, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
      doc.text('Informe de Diagnóstico Psicológico Laboral', M, 15)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(207, 250, 254)
      doc.text('Sistema de Evaluación de Perfiles Laborales — NLP Adaptativo', M, 22)
      doc.setTextColor(...ACENTO)
      doc.text(`Emitido: ${emision}`, ANCHO - M, 29, { align: 'right' })
      y = 46

      // Datos del candidato en tarjeta
      tituloSeccion('Datos de la evaluación')
      const filas = [
        ['Candidato', datos?.candidato_nombre || '—'],
        ['Psicólogo evaluador', datos?.psicologo_nombre || '—'],
        ['Fecha y hora de la evaluación', formatoFechaHora(fechaEvaluacion)],
        ['Fecha y hora de emisión', emision],
        ['Perfil detectado por el sistema', etiquetaPerfil(datos?.perfil_sistema)],
        ['Espectro confirmado por el psicólogo', etiquetaPerfil(espectro)],
      ]
      const altoTarjeta = Math.ceil(filas.length / 2) * 13 + 6
      doc.setFillColor(241, 247, 249); doc.setDrawColor(220, 235, 239)
      doc.roundedRect(M, y, UTIL, altoTarjeta, 2.5, 2.5, 'FD')
      filas.forEach(([k, v], i) => {
        const x = M + 6 + (i % 2) * (UTIL / 2)
        const fy = y + 8 + Math.floor(i / 2) * 13
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...BORDE)
        doc.text(k.toUpperCase(), x, fy)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(31, 41, 55)
        doc.text(doc.splitTextToSize(String(v), UTIL / 2 - 10)[0], x, fy + 5.5)
      })
      y += altoTarjeta + 10

      // Gráficas (todas las que tenga el candidato), justo después de los datos
      const nodos = graficasRef.current ? [...graficasRef.current.querySelectorAll('[data-pdf-grafica]')] : []
      if (nodos.length) {
        tituloSeccion('Perfil conductual')
        for (const nodo of nodos) {
          const svg = nodo.querySelector('svg')
          if (!svg) continue
          const { url, w, h } = await svgAPng(svg)
          let wmm = Math.min(125, UTIL)
          let hmm = (h / w) * wmm
          if (hmm > 72) { hmm = 72; wmm = (w / h) * hmm }
          espacio(hmm + 12)
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(55, 65, 81)
          doc.text(nodo.dataset.titulo || '', M, y)
          y += 3
          doc.setDrawColor(229, 231, 235)
          doc.roundedRect(M, y, UTIL, hmm + 6, 2, 2, 'S')
          doc.addImage(url, 'PNG', M + (UTIL - wmm) / 2, y + 3, wmm, hmm)
          y += hmm + 13
        }
      }

      // Diagnóstico
      tituloSeccion('Diagnóstico clínico')
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(31, 41, 55)
      doc.splitTextToSize(texto, UTIL).forEach((linea) => { espacio(5.2); doc.text(linea, M, y); y += 5.2 })
      y += 6

      // Evidencia clínica
      if (evidencias.length > 0) {
        tituloSeccion('Evidencia clínica seleccionada')
        evidencias.forEach((ev, i) => {
          espacio(24)
          doc.setFillColor(...NAVY); doc.roundedRect(M, y - 4.5, 26, 6.5, 1.5, 1.5, 'F')
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...ACENTO)
          doc.text(`Evidencia ${i + 1}`, M + 13, y, { align: 'center' })
          y += 7
          const bloque = (rotulo, contenido, estilo = 'normal', color = [31, 41, 55]) => {
            espacio(10)
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...BORDE)
            doc.text(rotulo, M, y); y += 4.5
            doc.setFont('helvetica', estilo); doc.setFontSize(9.5); doc.setTextColor(...color)
            doc.splitTextToSize(contenido, UTIL).forEach((l) => { espacio(4.6); doc.text(l, M, y); y += 4.6 })
            y += 2
          }
          bloque('Pregunta', ev.pregunta || '')
          bloque('Respuesta del candidato', ev.respuesta || '(sin respuesta)')
          const lemas = ev.rastros.filter((r) => r.origen !== 'alerta')
            .map((r) => `${r.palabra} (${r.origen === 'manual' ? 'manual, ' : ''}${etiquetaPerfil(r.perfil)}, ${r.puntos > 0 ? '+' : ''}${r.puntos})`)
          const alertasEv = ev.rastros.filter((r) => r.origen === 'alerta').map((r) => `${r.palabra} [alerta: ${r.lema}]`)
          if (lemas.length || alertasEv.length) bloque('Marcadores léxicos', [...lemas, ...alertasEv].join('   ·   '))
          if (ev.nota) bloque('Nota clínica', ev.nota, 'italic', [75, 85, 99])
          if (i < evidencias.length - 1) { doc.setDrawColor(229, 231, 235); doc.line(M, y, ANCHO - M, y); y += 7 }
        })
      }

      // Pie de página en todas las hojas
      const total = doc.internal.getNumberOfPages()
      for (let p = 1; p <= total; p++) {
        doc.setPage(p)
        doc.setDrawColor(229, 231, 235); doc.line(M, ALTO - 16, ANCHO - M, ALTO - 16)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(140)
        doc.text('Informe de apoyo al diagnóstico. El veredicto final es responsabilidad exclusiva del psicólogo evaluador.', M, ALTO - 11)
        doc.text(`Página ${p} de ${total}`, ANCHO - M, ALTO - 11, { align: 'right' })
      }

      doc.save(`${(datos?.candidato_nombre || 'candidato').replace(/\s+/g, '_')}_informe.pdf`)
    } catch (err) {
      console.error(err)
      setError('Error al generar el PDF. Verifique su conexión e intente nuevamente.')
    } finally {
      setGenerandoPDF(false)
    }
  }

  if (cargando) return <div className="text-center py-16 text-sm text-gray-400">Cargando diagnóstico...</div>

  return (
    <div className="max-w-4xl mx-auto">
      {/* Encabezado */}
      <div className="rounded-2xl px-6 py-5 mb-4 text-white" style={{ backgroundColor: PALETA.navyOscuro, border: `1px solid ${PALETA.borde}` }}>
        <button onClick={onVolver} className="text-sm text-cyan-100/70 hover:text-white transition-colors">← Volver</button>
        <div className="mt-3">
          <div className="w-8 h-px mb-3" style={{ backgroundColor: PALETA.acento }} />
          <h2 className="text-xl font-light">Redacción del informe — {datos?.candidato_nombre}</h2>
          <p className="text-xs text-cyan-100/60 mt-1">Psicólogo: {datos?.psicologo_nombre}</p>
        </div>
      </div>

      {exito && <div className="mb-4 px-4 py-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">{exito}</div>}
      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>}

      {/* 1. Datos */}
      <Seccion titulo="Datos del diagnóstico">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['Candidato', datos?.candidato_nombre],
            ['Psicólogo evaluador', datos?.psicologo_nombre],
            ['Fecha y hora de la evaluación', formatoFechaHora(fechaEvaluacion)],
            ['Perfil detectado por el sistema', etiquetaPerfil(datos?.perfil_sistema)],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs mb-1" style={{ color: PALETA.borde }}>{k}</p>
              <p className="font-medium text-gray-800">{v || '—'}</p>
            </div>
          ))}
          <div className="col-span-2">
            <p className="text-xs mb-1" style={{ color: PALETA.borde }}>Espectro confirmado por el psicólogo</p>
            <div className="flex gap-2">
              {PERFILES.map((p) => {
                const on = espectro === p
                return (
                  <button key={p} onClick={() => setEspectro(p)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold border transition-all"
                    style={on
                      ? { backgroundColor: COLOR_PERFIL_BG[p], color: COLOR_PERFIL_TEXT[p], borderColor: COLOR_PERFIL_TEXT[p] }
                      : { backgroundColor: '#FFFFFF', color: '#6B7280', borderColor: '#E5E7EB' }}>
                    {etiquetaPerfil(p)}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Seccion>

      {/* 2. Gráficas: todas las del candidato (también van al PDF) */}
      {graficas.length > 0 && (
        <Seccion titulo={`Perfil conductual — ${graficas.length} gráfica${graficas.length > 1 ? 's' : ''}`}>
          <div ref={graficasRef} className="grid md:grid-cols-2 gap-4">
            {graficas.map((g) => (
              <div key={g.id} data-pdf-grafica data-titulo={g.titulo} className="rounded-xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-700">{g.titulo}</p>
                <p className="text-xs text-gray-400 mb-3">{g.descripcion}</p>
                {g.render()}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Estas gráficas se incluyen en el informe PDF, después de los datos y antes del diagnóstico.</p>
        </Seccion>
      )}

      {/* 3. Diagnóstico */}
      <Seccion titulo="Diagnóstico clínico">
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={12}
          placeholder="Redacte aquí el diagnóstico clínico del candidato basándose en los datos del sistema y su criterio profesional..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e5263] resize-none leading-relaxed" />
        <p className="text-xs text-gray-400 mt-2">Editable en cualquier momento. El sistema conserva la última versión guardada.</p>
      </Seccion>

      {/* 4. Evidencias */}
      <Seccion titulo="Evidencia clínica seleccionada">
        <div className="flex flex-col gap-2 mb-5">
          <div className="flex gap-2">
            <select value={respuestaSelec} onChange={(e) => setRespuestaSelec(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e5263] text-gray-700">
              <option value="">— Seleccione una pregunta como evidencia —</option>
              {historial.map((h, i) => (
                <option key={h.id_respuesta} value={h.id_respuesta}>
                  P{i + 1}: {h.pregunta.length > 80 ? h.pregunta.slice(0, 80) + '…' : h.pregunta}
                </option>
              ))}
            </select>
            <button onClick={agregarEvidencia} disabled={!respuestaSelec}
              className="px-4 py-2 text-sm rounded-lg font-semibold disabled:opacity-40 whitespace-nowrap"
              style={{ backgroundColor: PALETA.navy, color: PALETA.acento }}>
              + Agregar
            </button>
          </div>
          {respuestaSelec && (
            <input value={notaEvidencia} onChange={(e) => setNotaEvidencia(e.target.value)}
              placeholder="Nota clínica sobre esta respuesta (opcional)..."
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarEvidencia() } }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e5263]" />
          )}
        </div>

        {evidencias.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
            Sin evidencias seleccionadas. Elija respuestas relevantes para incluirlas en el informe.
          </p>
        ) : (
          <div className="space-y-4">
            {evidencias.map((ev, i) => (
              <div key={ev.idRespuesta} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: '#F0F7F9' }}>
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: PALETA.navy }}>Evidencia {i + 1}</span>
                  <button onClick={() => setEvidencias((p) => p.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 text-xs">✕ Quitar</button>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1">Pregunta</p>
                    <p className="text-sm text-gray-700">{ev.pregunta}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1">Respuesta del candidato</p>
                    <p className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 border-l-4" style={{ borderLeftColor: PALETA.acento }}>
                      {ev.respuesta || <span className="text-gray-400 italic">Sin respuesta registrada</span>}
                    </p>
                  </div>
                  {ev.rastros.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {ev.rastros.map((r, j) => {
                        const est = r.origen === 'alerta' ? { bg: COLOR_ALERTA.bg, txt: COLOR_ALERTA.text }
                          : r.origen === 'manual' ? { bg: COLOR_MANUAL.bg, txt: COLOR_MANUAL.text }
                          : { bg: COLOR_PERFIL_BG[r.perfil], txt: COLOR_PERFIL_TEXT[r.perfil] }
                        return (
                          <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: est.bg, color: est.txt }}>
                            {r.origen === 'alerta' ? `▲ ${r.lema || r.palabra}` : r.palabra}
                            {r.origen !== 'alerta' && <span className="opacity-60">{etiquetaPerfil(r.perfil)}</span>}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {ev.nota && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs font-medium text-gray-400 mb-1">Nota clínica</p>
                      <p className="text-sm text-gray-700 italic">{ev.nota}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">Las evidencias seleccionadas se incluyen en el informe PDF.</p>
      </Seccion>

      {/* Botones */}
      <div className="flex gap-3 justify-between">
        <button onClick={exportarPDF} disabled={generandoPDF || !texto.trim()}
          className="px-5 py-2.5 border text-sm rounded-lg font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
          style={{ borderColor: PALETA.borde, color: PALETA.navy }}>
          {generandoPDF ? 'Generando PDF...' : '⬇ Exportar PDF'}
        </button>
        <button onClick={guardar} disabled={guardando}
          className="px-6 py-2.5 text-sm rounded-lg font-semibold disabled:opacity-50 transition-colors"
          style={{ backgroundColor: PALETA.acento, color: PALETA.navy }}>
          {guardando ? 'Guardando...' : 'Guardar diagnóstico'}
        </button>
      </div>
    </div>
  )
}

export default RedaccionDiagnostico
