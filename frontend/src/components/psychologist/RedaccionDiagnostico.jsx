import { useState, useEffect } from 'react'
import api from '../../services/api'
import jsPDF from 'jspdf'

const PERFILES = ['Dominante', 'Hibrido', 'Sumiso']

function RedaccionDiagnostico({ id, onVolver }) {
  const [datos, setDatos]           = useState(null)
  const [texto, setTexto]           = useState('')
  const [espectro, setEspectro]     = useState('')
  const [guardando, setGuardando]   = useState(false)
  const [exito, setExito]           = useState('')
  const [error, setError]           = useState('')
  const [cargando, setCargando]     = useState(true)
  const [generandoPDF, setGenerandoPDF] = useState(false)

  useEffect(() => {
    api.get(`/api/diagnostico/evaluaciones/${id}/diagnostico`)
      .then(r => {
        setDatos(r.data)
        setTexto(r.data.texto_diagnostico || '')
        setEspectro(r.data.espectro_confirmado || r.data.perfil_sistema || 'Dominante')
      })
      .finally(() => setCargando(false))
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

  const exportarPDF = async () => {
    if (!texto.trim()) { setError('Guarde el diagnóstico antes de exportar.'); return }
    setGenerandoPDF(true)
    try {
      // Generar PDF en el navegador con los datos actuales
      const doc = new jsPDF()

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