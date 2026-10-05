import { useState, useEffect } from 'react'
import api from '../../services/api'
import DetalleEvaluacion from './DetalleEvaluacion'
import RedaccionDiagnostico from './RedaccionDiagnostico'

const PERFIL_COLOR = {
  Dominante: 'bg-red-100 text-red-700',
  Hibrido:   'bg-blue-100 text-blue-700',
  Sumiso:    'bg-green-100 text-green-700',
}

function Dashboard() {
  const [evaluaciones, setEvaluaciones] = useState([])
  const [cargando, setCargando]         = useState(true)
  const [vista, setVista]               = useState('lista')   // lista | detalle | diagnostico
  const [idSeleccionado, setIdSeleccionado] = useState(null)

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

  if (vista === 'detalle')     return <DetalleEvaluacion id={idSeleccionado} onVolver={volver} />
  if (vista === 'diagnostico') return <RedaccionDiagnostico id={idSeleccionado} onVolver={volver} />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium text-gray-600 uppercase tracking-widest">
          Evaluaciones completadas ({evaluaciones.length})
        </h2>
      </div>

      {cargando ? (
        <div className="text-center py-10 text-sm text-gray-400">Cargando evaluaciones...</div>
      ) : evaluaciones.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400">
          No hay evaluaciones completadas aún.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Candidato</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Duración</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Perfil sistema</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Confianza</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Diagnóstico</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {evaluaciones.map((ev, i) => (
                <tr key={ev.id_evaluacion} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-800">{ev.candidato.nombre}</p>
                    <p className="text-xs text-gray-400">{ev.candidato.correo}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {ev.fecha_fin ? new Date(ev.fecha_fin).toLocaleDateString('es-BO') : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {ev.duracion_minutos ? `${ev.duracion_minutos} min` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {ev.perfil_sistema ? (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${PERFIL_COLOR[ev.perfil_sistema] || 'bg-gray-100 text-gray-600'}`}>
                        {ev.perfil_sistema}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {ev.confianza ? `${ev.confianza}%` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {ev.tiene_diagnostico ? (
                      <span className="text-xs text-green-600 font-medium">Redactado</span>
                    ) : (
                      <span className="text-xs text-gray-400">Pendiente</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => verDetalle(ev.id_evaluacion)}
                        className="text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1 transition-colors"
                      >
                        Ver detalle
                      </button>
                      <button
                        onClick={() => verDiagnostico(ev.id_evaluacion)}
                        className="text-xs text-white bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-1 transition-colors"
                      >
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