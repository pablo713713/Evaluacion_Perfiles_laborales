import { useState, useEffect } from 'react'
import api from '../../services/api'

const PERFILES = ['Dominante', 'Hibrido', 'Sumiso']
const PIE_COLORS = { Dominante: '#EF4444', Hibrido: '#3B82F6', Sumiso: '#10B981' }

// ── Gráfico de torta SVG reutilizable ────────────────────────────────────────
function MiniTorta({ slices, size = 100, label }) {
  const total = slices.reduce((s, d) => s + (d.valor || 0), 0)
  if (total === 0) return null
  let startAngle = -Math.PI / 2
  const paths = slices.map(d => {
    const angle = (d.valor / total) * 2 * Math.PI
    const x1 = size/2 + (size/2 - 4) * Math.cos(startAngle)
    const y1 = size/2 + (size/2 - 4) * Math.sin(startAngle)
    startAngle += angle
    const x2 = size/2 + (size/2 - 4) * Math.cos(startAngle)
    const y2 = size/2 + (size/2 - 4) * Math.sin(startAngle)
    const large = angle > Math.PI ? 1 : 0
    return { path: `M${size/2},${size/2} L${x1},${y1} A${size/2-4},${size/2-4} 0 ${large},1 ${x2},${y2} Z`, color: d.color }
  })
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => (
          <path key={i} d={p.path} fill={p.color} stroke="white" strokeWidth="1.5" />
        ))}
      </svg>
      {label && <span className="text-xs text-gray-400">{label}</span>}
    </div>
  )
}

function RedaccionDiagnostico({ id, onVolver }) {
  const [datos, setDatos]           = useState(null)
  const [texto, setTexto]           = useState('')
  const [espectro, setEspectro]     = useState('')
  const [guardando, setGuardando]   = useState(false)
  const [exito, setExito]           = useState('')
  const [error, setError]           = useState('')
  const [cargando, setCargando]     = useState(true)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const [distribucion, setDistribucion] = useState(null)
  const [distHibrida, setDistHibrida]   = useState(null)
  const [historial, setHistorial]       = useState([])   // respuestas completas con rastros
  const [evidencias, setEvidencias]     = useState([])   // { idRespuesta, pregunta, respuesta, rastros, nota }
  const [respuestaSelec, setRespuestaSelec] = useState('')  // id_respuesta seleccionado en el combo
  const [notaEvidencia, setNotaEvidencia]   = useState('')

  useEffect(() => {
    let cancelled = false
    const cargar = async () => {
      try {
        const [rDiag, rDetalle] = await Promise.all([
          api.get(`/api/diagnostico/evaluaciones/${id}/diagnostico`),
          api.get(`/api/diagnostico/evaluaciones/${id}/detalle`),
        ])
        if (cancelled) return
        setDatos(rDiag.data)
        setTexto(rDiag.data.texto_diagnostico || '')
        setEspectro(rDiag.data.espectro_confirmado || rDiag.data.perfil_sistema || 'Dominante')

        const hist = rDetalle.data.historial || []
        setHistorial(hist)
        if (hist.length > 0) {
          const ultima = hist[hist.length - 1].distribucion_tras_respuesta
          setDistribucion(ultima)

          // Calcular distribución híbrida igual que en DetalleEvaluacion
          const d = ultima.Dominante
          const h = ultima.Hibrido
          const s = ultima.Sumiso
          const esHibrido = (d >= 30 && s >= 30) || (h >= 60)
          if (esHibrido) {
            const totalPolar = d + s
            setDistHibrida(totalPolar > 0
              ? { Dominante: parseFloat((d / totalPolar * 100).toFixed(1)), Sumiso: parseFloat((s / totalPolar * 100).toFixed(1)) }
              : { Dominante: 50, Sumiso: 50 }
            )
          }
        }
      } finally {
        if (!cancelled) setCargando(false)
      }
    }
    cargar()
    return () => { cancelled = true }
  }, [id])

  const guardar = async () => {
    if (!texto.trim()) { setError('El diagnóstico no puede estar vacío.'); return }
    setGuardando(true)
    setError('')
    try {
      await api.post(`/api/diagnostico/evaluaciones/${id}/diagnostico`, {
        texto_diagnostico: texto,
        espectro_confirmado: espectro,
      })
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
    const item = historial.find(h => String(h.id_respuesta) === String(respuestaSelec))
    if (!item) return
    // Evitar duplicados — si ya está agregada, solo actualizar la nota
    setEvidencias(prev => {
      const existe = prev.findIndex(e => String(e.idRespuesta) === String(respuestaSelec))
      if (existe !== -1) {
        const copia = [...prev]
        copia[existe] = { ...copia[existe], nota: notaEvidencia.trim() }
        return copia
      }
      return [...prev, {
        idRespuesta: item.id_respuesta,
        pregunta:   item.pregunta,
        respuesta:  item.texto_respuesta,
        rastros:    item.rastro_lexico || [],
        nota:       notaEvidencia.trim(),
      }]
    })
    setNotaEvidencia('')
    setRespuestaSelec('')
  }

  const eliminarEvidencia = (idx) => {
    setEvidencias(prev => prev.filter((_, i) => i !== idx))
  }

  const dibujarTortaEnCanvas = (slices, size = 200) => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const cx = size / 2, cy = size / 2, r = size / 2 - 4
    const total = slices.reduce((s, d) => s + d.valor, 0)
    if (total === 0) return null
    let startAngle = -Math.PI / 2
    slices.forEach(d => {
      const angle = (d.valor / total) * 2 * Math.PI
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, startAngle, startAngle + angle)
      ctx.closePath()
      ctx.fillStyle = d.color
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
      startAngle += angle
    })
    return canvas.toDataURL('image/png')
  }

  // Carga jsPDF desde CDN como script clásico (UMD) si no está ya en window
  const cargarJsPDF = () => new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(window.jspdf.jsPDF); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload = () => {
      if (window.jspdf) resolve(window.jspdf.jsPDF)
      else reject(new Error('jsPDF no disponible tras carga'))
    }
    script.onerror = () => reject(new Error('No se pudo cargar jsPDF'))
    document.head.appendChild(script)
  })

  const exportarPDF = async () => {
    if (!texto.trim()) { setError('Guarde el diagnóstico antes de exportar.'); return }
    setGenerandoPDF(true)
    try {
      const JsPDF = await cargarJsPDF()
      const doc = new JsPDF()

      const fechaDiagnostico = new Date().toLocaleDateString('es-BO', {
        year: 'numeric', month: 'long', day: 'numeric'
      })

      // Encabezado
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Informe de Diagnóstico Psicológico Laboral', 20, 20)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120)
      doc.text('Sistema de Evaluación de Perfiles Laborales — NLP Adaptativo', 20, 28)
      doc.setTextColor(0)

      // Línea separadora
      doc.setDrawColor(200)
      doc.line(20, 32, 190, 32)

      // Datos del encabezado
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Datos del Candidato', 20, 42)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Nombre del candidato:`, 20, 52)
      doc.setFont('helvetica', 'bold')
      doc.text(datos?.candidato_nombre || '', 75, 52)

      doc.setFont('helvetica', 'normal')
      doc.text(`Psicólogo evaluador:`, 20, 60)
      doc.setFont('helvetica', 'bold')
      doc.text(datos?.psicologo_nombre || '', 75, 60)

      doc.setFont('helvetica', 'normal')
      doc.text(`Fecha del diagnóstico:`, 20, 68)
      doc.setFont('helvetica', 'bold')
      doc.text(fechaDiagnostico, 75, 68)

      doc.setFont('helvetica', 'normal')
      doc.text(`Perfil detectado por sistema:`, 20, 76)
      doc.setFont('helvetica', 'bold')
      doc.text(datos?.perfil_sistema || '', 90, 76)

      doc.setFont('helvetica', 'normal')
      doc.text(`Espectro confirmado por psicólogo:`, 20, 84)
      doc.setFont('helvetica', 'bold')
      doc.text(espectro, 100, 84)

      // Línea separadora
      doc.setDrawColor(200)
      doc.line(20, 90, 190, 90)

      // Diagnóstico
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Diagnóstico Clínico', 20, 100)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const lineas = doc.splitTextToSize(texto, 170)
      doc.text(lineas, 20, 110)

      // Calcular yPos dinámico según cuántas líneas ocupa el diagnóstico
      let yPos = 110 + lineas.length * 5 + 14

      // Sección de distribución conductual
      if (distribucion) {
        // Verificar si hay espacio en la página o si hay que agregar nueva página
        if (yPos > 220) { doc.addPage(); yPos = 20 }

        doc.setDrawColor(200)
        doc.line(20, yPos, 190, yPos)
        yPos += 10

        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Distribución Conductual', 20, yPos)
        yPos += 8

        // Torta principal (D/H/S)
        const slicesPrincipal = [
          { valor: distribucion.Dominante || 0, color: '#EF4444' },
          { valor: distribucion.Hibrido   || 0, color: '#3B82F6' },
          { valor: distribucion.Sumiso    || 0, color: '#10B981' },
        ]
        const imgPrincipal = dibujarTortaEnCanvas(slicesPrincipal, 160)
        if (imgPrincipal) {
          doc.addImage(imgPrincipal, 'PNG', 20, yPos, 40, 40)
        }

        // Leyenda al lado de la torta principal
        doc.setFontSize(9)
        const legendaX = 65
        const leyendas = [
          { label: 'Dominante', valor: distribucion.Dominante || 0, color: [239, 68, 68] },
          { label: 'Híbrido',   valor: distribucion.Hibrido   || 0, color: [59, 130, 246] },
          { label: 'Sumiso',    valor: distribucion.Sumiso    || 0, color: [16, 185, 129] },
        ]
        leyendas.forEach((l, i) => {
          const ly = yPos + 6 + i * 10
          doc.setFillColor(...l.color)
          doc.rect(legendaX, ly - 3, 4, 4, 'F')
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0)
          doc.text(`${l.label}: ${l.valor}%`, legendaX + 6, ly)
        })

        // Torta híbrida si aplica
        if (distHibrida) {
          const slicesHibrida = [
            { valor: distHibrida.Dominante || 0, color: '#EF4444' },
            { valor: distHibrida.Sumiso    || 0, color: '#10B981' },
          ]
          const imgHibrida = dibujarTortaEnCanvas(slicesHibrida, 120)
          if (imgHibrida) {
            doc.addImage(imgHibrida, 'PNG', 120, yPos, 30, 30)
          }
          doc.setFontSize(8)
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(100)
          doc.text('Polaridad interna D/S', 120, yPos + 34)
          doc.setTextColor(0)
        }

        yPos += 50
      }

      // Sección de evidencias clínicas seleccionadas
      if (evidencias.length > 0) {
        if (yPos > 200) { doc.addPage(); yPos = 20 }
        doc.setDrawColor(200)
        doc.line(20, yPos, 190, yPos)
        yPos += 10

        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Evidencia clínica seleccionada', 20, yPos)
        yPos += 10

        evidencias.forEach((ev, i) => {
          if (yPos > 240) { doc.addPage(); yPos = 20 }

          // Encabezado de evidencia
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(60)
          doc.text(`Evidencia ${i + 1}`, 20, yPos)
          yPos += 6

          // Pregunta
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(100)
          doc.text('Pregunta:', 20, yPos)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0)
          const lineasP = doc.splitTextToSize(ev.pregunta || '', 165)
          doc.text(lineasP, 20, yPos + 4)
          yPos += 4 + lineasP.length * 4 + 3

          if (yPos > 250) { doc.addPage(); yPos = 20 }

          // Respuesta
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(100)
          doc.text('Respuesta del candidato:', 20, yPos)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0)
          const lineasR = doc.splitTextToSize(ev.respuesta || '(sin respuesta)', 165)
          doc.text(lineasR, 20, yPos + 4)
          yPos += 4 + lineasR.length * 4 + 3

          if (yPos > 250) { doc.addPage(); yPos = 20 }

          // Lemas marcados
          const todosLemas = ev.rastros.filter(r => r.origen !== 'alerta')
          const todasAlertas = ev.rastros.filter(r => r.origen === 'alerta')
          if (todosLemas.length > 0 || todasAlertas.length > 0) {
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(100)
            doc.text('Marcadores léxicos:', 20, yPos)
            yPos += 5
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(0)
            const textoLemas = todosLemas.map(r => `${r.palabra} (${r.perfil}, ${r.puntos > 0 ? '+' : ''}${r.puntos})`).join('  ·  ')
            const textoAlertas = todasAlertas.map(r => `⚠ ${r.lema || r.palabra}`).join('  ·  ')
            const textoMarcadores = [textoLemas, textoAlertas].filter(Boolean).join('     ')
            if (textoMarcadores) {
              const lineasL = doc.splitTextToSize(textoMarcadores, 165)
              doc.text(lineasL, 20, yPos)
              yPos += lineasL.length * 4 + 3
            }
          }

          // Nota clínica
          if (ev.nota) {
            if (yPos > 250) { doc.addPage(); yPos = 20 }
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(100)
            doc.text('Nota clínica:', 20, yPos)
            doc.setFont('helvetica', 'italic')
            doc.setTextColor(60)
            const lineasN = doc.splitTextToSize(ev.nota, 165)
            doc.text(lineasN, 20, yPos + 4)
            yPos += 4 + lineasN.length * 4
            doc.setTextColor(0)
          }

          // Separador entre evidencias
          yPos += 4
          if (i < evidencias.length - 1) {
            doc.setDrawColor(220)
            doc.line(20, yPos, 190, yPos)
            yPos += 6
          }
        })
      }

      // Pie de página
      const pageHeight = doc.internal.pageSize.height
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(
        'Este informe fue generado como apoyo al diagnóstico clínico. El veredicto final es responsabilidad exclusiva del psicólogo evaluador.',
        20,
        pageHeight - 15,
        { maxWidth: 170 }
      )

      // Nombre del archivo
      const nombreArchivo = `${(datos?.candidato_nombre || 'candidato').replace(/\s+/g, '_')}_resultado.pdf`
      doc.save(nombreArchivo)

    } catch (err) {
      console.error(err)
      setError('Error al generar el PDF. Verifique que el diagnóstico esté guardado.')
    } finally {
      setGenerandoPDF(false)
    }
  }

  if (cargando) return (
    <div className="text-center py-16 text-sm text-gray-400">Cargando diagnóstico...</div>
  )

  return (
    <div className="max-w-3xl">

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
            Redacción del informe — {datos?.candidato_nombre}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Psicólogo: {datos?.psicologo_nombre}
          </p>
        </div>
      </div>

      {/* Mensajes */}
      {exito && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
          {exito}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Tarjeta de datos */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 mb-4">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
          Datos del diagnóstico
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs mb-1">Candidato</p>
            <p className="font-medium text-gray-800">{datos?.candidato_nombre}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Psicólogo evaluador</p>
            <p className="font-medium text-gray-800">{datos?.psicologo_nombre}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Perfil detectado por el sistema</p>
            <p className="font-medium text-gray-800">{datos?.perfil_sistema || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Espectro confirmado por el psicólogo</p>
            <select
              value={espectro}
              onChange={e => setEspectro(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
            >
              {PERFILES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Distribución conductual — gráfico de vista previa */}
      {distribucion && (
        <div className="bg-white border border-gray-100 rounded-xl p-6 mb-4">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
            Distribución conductual
          </h3>
          <div className="flex items-start gap-10 flex-wrap">
            {/* Torta principal */}
            <div className="flex items-center gap-6">
              <MiniTorta
                size={110}
                label="Espectro general"
                slices={[
                  { valor: distribucion.Dominante || 0, color: PIE_COLORS.Dominante },
                  { valor: distribucion.Hibrido   || 0, color: PIE_COLORS.Hibrido },
                  { valor: distribucion.Sumiso    || 0, color: PIE_COLORS.Sumiso },
                ]}
              />
              <div className="space-y-2">
                {[
                  { label: 'Dominante', color: PIE_COLORS.Dominante, val: distribucion.Dominante },
                  { label: 'Híbrido',   color: PIE_COLORS.Hibrido,   val: distribucion.Hibrido },
                  { label: 'Sumiso',    color: PIE_COLORS.Sumiso,     val: distribucion.Sumiso },
                ].map(d => (
                  <div key={d.label} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-gray-600">{d.label}</span>
                    <span className="text-xs font-semibold text-gray-800 ml-1">{d.val ?? 0}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Torta híbrida si aplica */}
            {distHibrida && (
              <div className="flex items-center gap-6">
                <MiniTorta
                  size={90}
                  label="Polaridad D/S"
                  slices={[
                    { valor: distHibrida.Dominante || 0, color: PIE_COLORS.Dominante },
                    { valor: distHibrida.Sumiso    || 0, color: PIE_COLORS.Sumiso },
                  ]}
                />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS.Dominante }} />
                    <span className="text-xs text-gray-600">Dominante</span>
                    <span className="text-xs font-semibold text-gray-800 ml-1">{distHibrida.Dominante}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS.Sumiso }} />
                    <span className="text-xs text-gray-600">Sumiso</span>
                    <span className="text-xs font-semibold text-gray-800 ml-1">{distHibrida.Sumiso}%</span>
                  </div>
                  <p className="text-xs text-gray-400 italic mt-1">Polaridad interna del perfil híbrido</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Área de diagnóstico */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 mb-4">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
          Diagnóstico clínico
        </h3>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          rows={12}
          placeholder="Redacte aquí el diagnóstico clínico del candidato basándose en los datos del sistema y su criterio profesional..."
          className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gray-400 resize-none leading-relaxed"
        />
        <p className="text-xs text-gray-400 mt-2">
          Este diagnóstico es editable en cualquier momento. El sistema preserva la última versión guardada.
        </p>
      </div>

      {/* Sección de evidencias */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 mb-4">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
          Evidencia clínica seleccionada
        </h3>

        {/* Selector de respuesta */}
        <div className="flex flex-col gap-2 mb-5">
          <div className="flex gap-2">
            <select
              value={respuestaSelec}
              onChange={e => setRespuestaSelec(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 text-gray-700"
            >
              <option value="">— Seleccione una pregunta como evidencia —</option>
              {historial.map((h, i) => (
                <option key={h.id_respuesta} value={h.id_respuesta}>
                  P{i + 1}: {h.pregunta.length > 80 ? h.pregunta.slice(0, 80) + '…' : h.pregunta}
                </option>
              ))}
            </select>
            <button
              onClick={agregarEvidencia}
              disabled={!respuestaSelec}
              className="px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              + Agregar
            </button>
          </div>
          {respuestaSelec && (
            <input
              type="text"
              value={notaEvidencia}
              onChange={e => setNotaEvidencia(e.target.value)}
              placeholder="Nota clínica sobre esta respuesta (opcional)..."
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarEvidencia() } }}
            />
          )}
        </div>

        {/* Cards de evidencias agregadas */}
        {evidencias.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
            Sin evidencias seleccionadas. Elija respuestas relevantes para incluirlas en el informe.
          </p>
        ) : (
          <div className="space-y-4">
            {evidencias.map((ev, i) => {
              const rastrosAuto   = ev.rastros.filter(r => r.origen !== 'manual' && r.origen !== 'alerta')
              const rastrosManuales = ev.rastros.filter(r => r.origen === 'manual')
              const rastrosAlerta = ev.rastros.filter(r => r.origen === 'alerta')
              return (
                <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                  {/* Encabezado de la evidencia */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Evidencia {i + 1}
                    </span>
                    <button
                      onClick={() => eliminarEvidencia(i)}
                      className="text-gray-300 hover:text-red-400 text-xs transition-colors"
                    >
                      ✕ Quitar
                    </button>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Pregunta */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-1">Pregunta</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{ev.pregunta}</p>
                    </div>

                    {/* Respuesta */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-1">Respuesta del candidato</p>
                      <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-lg px-3 py-2">
                        {ev.respuesta || <span className="text-gray-400 italic">Sin respuesta registrada</span>}
                      </p>
                    </div>

                    {/* Lemas / rastros marcados */}
                    {(rastrosAuto.length > 0 || rastrosManuales.length > 0 || rastrosAlerta.length > 0) && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 mb-2">Lemas y alertas marcados</p>
                        <div className="flex flex-wrap gap-1.5">
                          {rastrosAuto.map((r, j) => (
                            <span
                              key={`auto-${j}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: r.perfil === 'Dominante' ? '#FEE2E2'
                                  : r.perfil === 'Sumiso' ? '#D1FAE5' : '#DBEAFE',
                                color: r.perfil === 'Dominante' ? '#991B1B'
                                  : r.perfil === 'Sumiso' ? '#065F46' : '#1E40AF',
                              }}
                            >
                              {r.palabra}
                              <span className="opacity-60">{r.perfil?.charAt(0)}</span>
                              <span className="opacity-50 text-[10px]">{r.puntos > 0 ? `+${r.puntos}` : r.puntos}</span>
                            </span>
                          ))}
                          {rastrosManuales.map((r, j) => (
                            <span
                              key={`man-${j}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: '#FEF9C3', color: '#713F12' }}
                            >
                              ✏ {r.palabra}
                            </span>
                          ))}
                          {rastrosAlerta.map((r, j) => (
                            <span
                              key={`alt-${j}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: '#EDE9FE', color: '#5B21B6' }}
                            >
                              ⚠ {r.lema || r.palabra}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nota clínica */}
                    {ev.nota ? (
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-xs font-medium text-gray-400 mb-1">Nota clínica</p>
                        <p className="text-sm text-gray-700 italic">{ev.nota}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">
          Las evidencias seleccionadas se incluyen en el informe PDF exportado.
        </p>
      </div>

      {/* Botones */}
      <div className="flex gap-3 justify-between">
        <button
          onClick={exportarPDF}
          disabled={generandoPDF || !texto.trim()}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          {generandoPDF ? 'Generando PDF...' : '⬇ Exportar PDF'}
        </button>
        <button
          onClick={guardar}
          disabled={guardando}
          className="px-6 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:bg-gray-300 transition-colors"
        >
          {guardando ? 'Guardando...' : 'Guardar diagnóstico'}
        </button>
      </div>
    </div>
  )
}

export default RedaccionDiagnostico