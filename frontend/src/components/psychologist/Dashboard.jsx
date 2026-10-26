import { useState, useEffect } from 'react'
import api from '../../services/api'
import DetalleEvaluacion from './DetalleEvaluacion'
import RedaccionDiagnostico from './RedaccionDiagnostico'
import { etiquetaPerfil, COLOR_PERFIL_BG, COLOR_PERFIL_TEXT, PALETA } from '../../utils/perfiles'

function Dashboard() {
  const [evaluaciones, setEvaluaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [vista, setVista] = useState('lista') // lista | detalle | diagnostico
  const [idSeleccionado, setIdSeleccionado] = useState(null)
  const [mensajeExito, setMensajeExito] = useState('')
  const [errores, setErrores] = useState([])

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    try {
      const res = await api.get('/api/diagnostico/evaluaciones')
      setEvaluaciones(res.data)
    } catch { /* silencioso */ }
    finally { setCargando(false) }
  }

  const verDetalle = (id) => { setIdSeleccionado(id); setVista('detalle') }
  const verDiagnostico = (id) => { setIdSeleccionado(id); setVista('diagnostico') }
  const volver = () => { setVista('lista'); setIdSeleccionado(null); cargar() }

  const habilitarRepeticion = async (id, nombre) => {
    if (!window.confirm(`¿Resetear la evaluación de ${nombre}? Se eliminarán todas sus respuestas.`)) return
    try {
      await api.post(`/api/diagnostico/evaluaciones/${id}/habilitar-repeticion`)
      setMensajeExito('Evaluación reseteada. El candidato puede repetir el test.')
      cargar()
      setTimeout(() => setMensajeExito(''), 4000)
    } catch {
      setErrores(['Error al resetear la evaluación.'])
    }
  }

  if (vista === 'detalle') return <DetalleEvaluacion id={idSeleccionado} onVolver={volver} />
  if (vista === 'diagnostico') return <RedaccionDiagnostico id={idSeleccionado} onVolver={volver} />

  const pendientes = evaluaciones.filter((e) => !e.tiene_diagnostico).length

  return (
    <div className="w-full">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl px-5 py-4 text-white" style={{ backgroundColor: PALETA.navyOscuro, border: `1px solid ${PALETA.borde}` }}>
          <p className="text-xs uppercase tracking-widest text-cyan-100/60">Evaluaciones completadas</p>
          <p className="text-3xl font-light mt-1">{evaluaciones.length}</p>
        </div>
        <div className="rounded-2xl px-5 py-4 bg-white border border-gray-100 shadow-sm">
          <p className="text-xs uppercase tracking-widest" style={{ color: PALETA.borde }}>Informes pendientes</p>
          <p className="text-3xl font-light mt-1" style={{ color: PALETA.navy }}>{pendientes}</p>
        </div>
      </div>

      {mensajeExito && <div className="mb-4 px-4 py-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">{mensajeExito}</div>}
      {errores.map((e, i) => <div key={i} className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{e}</div>)}

      {cargando ? (
        <div className="text-center py-10 text-sm text-gray-400">Cargando evaluaciones...</div>
      ) : evaluaciones.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400">No hay evaluaciones completadas aún.</div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#F0F7F9' }}>
                {['Candidato', 'Fecha', 'Duración', 'Perfil sistema', 'Confianza', 'Diagnóstico'].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: PALETA.borde }}>{h}</th>
                ))}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {evaluaciones.map((ev) => (
                <tr key={ev.id_evaluacion} className="hover:bg-[#F7FBFC] transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-800">{ev.candidato.nombre}</p>
                    <p className="text-xs text-gray-400">{ev.candidato.correo}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {ev.fecha_fin ? new Date(ev.fecha_fin).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{ev.duracion_minutos ? `${ev.duracion_minutos} min` : '—'}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {ev.perfil_sistema ? (
                      <span className="px-2 py-1 rounded text-xs font-semibold"
                        style={{ backgroundColor: COLOR_PERFIL_BG[ev.perfil_sistema] || '#F3F4F6', color: COLOR_PERFIL_TEXT[ev.perfil_sistema] || '#4B5563' }}>
                        {etiquetaPerfil(ev.perfil_sistema)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{ev.confianza ? `${ev.confianza}%` : '—'}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {ev.tiene_diagnostico
                      ? <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-50 text-green-700">Redactado</span>
                      : <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700">Pendiente</span>}
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <div className="flex gap-2 justify-end items-center">
                      <button onClick={() => verDetalle(ev.id_evaluacion)}
                        className="text-xs border rounded-lg px-3 py-1.5 transition-colors hover:bg-[#F0F7F9]"
                        style={{ color: PALETA.navy, borderColor: '#CFE3E8' }}>
                        Ver detalle
                      </button>
                      <button onClick={() => habilitarRepeticion(ev.id_evaluacion, ev.candidato.nombre)}
                        className="text-xs text-orange-500 hover:text-orange-700 border border-orange-100 rounded-lg px-3 py-1.5 transition-colors">
                        Repetir test
                      </button>
                      <button onClick={() => verDiagnostico(ev.id_evaluacion)}
                        className="text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
                        style={{ backgroundColor: PALETA.navy, color: PALETA.acento }}>
                        Redactar informe
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Dashboard
