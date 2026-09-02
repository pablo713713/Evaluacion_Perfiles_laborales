import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import PreguntaView from '../components/candidate/PreguntaView'
import RespuestaInput from '../components/candidate/RespuestaInput'

function CandidatoPage() {
  const [preguntaActual, setPreguntaActual] = useState(null)
  const [numeroPregunta, setNumeroPregunta] = useState(1)
  const [respuesta, setRespuesta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [estado, setEstado] = useState('cargando') // cargando | activo | completado | expirado
  
  // Estado para capturar la métrica psicométrica del backend
  const [metricas, setMetricas] = useState(null)

  const idEvaluacion = useRef(null)
  const tiempoInicio = useRef(Date.now())

  useEffect(() => {
    cargarMiEvaluacion()
  }, [])

  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('rol')
    window.location.href = '/login'
  }

  const cargarMiEvaluacion = async () => {
    try {
      const res = await api.get('/api/evaluaciones/mi-evaluacion')
      const data = res.data

      if (data.estado === 'completada') {
        setEstado('completado')
        return
      }

      if (data.estado === 'sesion_expirada') {
        setEstado('expirado')
        return
      }

      idEvaluacion.current = data.id_evaluacion
      setPreguntaActual(data.pregunta_actual)
      if (data.metricas_auditoria) {
        setMetricas(data.metricas_auditoria)
      }
      setEstado('activo')
    } catch {
      setEstado('error')
    }
  }

  const enviarRespuesta = async () => {
    if (!respuesta.trim()) return
    setEnviando(true)
    setError('')

    const tiempoSegundos = Math.floor((Date.now() - tiempoInicio.current) / 1000)

    try {
      const res = await api.post(`/api/evaluaciones/${idEvaluacion.current}/responder`, {
        id_nodo: preguntaActual.id_nodo,
        texto: respuesta,
        tiempo_segundos: tiempoSegundos,
      })

      const resultado = res.data

      if (resultado.estado === 'respuesta_corta') {
        setError(`Por favor elabore más su respuesta (mínimo ${resultado.min_palabras} palabras).`)
        setEnviando(false)
        return
      }

      if (resultado.estado === 'sesion_expirada') {
        setEstado('expirado')
        return
      }

      if (resultado.estado === 'completada') {
        setEstado('completado')
        return
      }

      // Guardar métricas devueltas por el motor de inferencia
      if (resultado.metricas_auditoria) {
        setMetricas(resultado.metricas_auditoria)
      }

      // Continuar a la siguiente pregunta
      setPreguntaActual(resultado.siguiente_nodo)
      setNumeroPregunta((n) => n + 1)
      setRespuesta('')
      tiempoInicio.current = Date.now()

    } catch {
      setError('Ocurrió un error al enviar su respuesta. Intente nuevamente.')
    } finally {
      setEnviando(false)
    }
  }

  // Pantallas de estado
  if (estado === 'cargando') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-400 text-sm tracking-wide">Cargando evaluación...</p>
      </div>
    )
  }

  if (estado === 'completado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="max-w-md text-center px-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-light text-gray-800 mb-3">Evaluación completada</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            Sus respuestas han sido registradas exitosamente.
          </p>
          <button
            onClick={cerrarSesion}
            className="px-6 py-2.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-sm border border-gray-100">

        {/* Pregunta */}
        {preguntaActual && (
          <PreguntaView
            numero={numeroPregunta}
            texto={preguntaActual.texto_pregunta}
          />
        )}

        {/* Input de Respuesta */}
        <RespuestaInput
          value={respuesta}
          onChange={setRespuesta}
          onSubmit={enviarRespuesta}
          enviando={enviando}
          error={error}
        />

        {/* ========================================================= */}
        {/* PANEL DE PRUEBAS / VALIDACIÓN DE MOTOR PSICOMÉTRICO */}
        {/* ========================================================= */}
        <div className="mt-10 border-t border-dashed border-gray-300 pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              Panel de Pruebas (Grafo Probabilístico)
            </span>
            <span className="text-xs text-gray-400">Puntaje acumulado en tiempo real</span>
          </div>

          {metricas ? (
            <div className="bg-gray-900 text-gray-100 p-5 rounded-xl text-xs space-y-4 font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">Espectro Actual:</p>
                  <p className="text-sm font-bold text-yellow-400 mt-0.5">
                    {metricas.espectro_dominante || 'Evaluando...'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Score / Umbral de Corte:</p>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5">
                    {metricas.puntaje_acumulado?.toFixed(2) || '0.00'} / {metricas.umbral_corte?.toFixed(2) || '1.00'}
                  </p>
                </div>
              </div>

              {/* Barra visual de proximidad al umbral */}
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Progresión hacia finalización por convergencia</span>
                  <span>
                    {Math.min(
                      Math.round(((metricas.puntaje_acumulado || 0) / (metricas.umbral_corte || 1)) * 100),
                      100
                    )}%
                  </span>
                </div>
                <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden border border-gray-700">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(
                        ((metricas.puntaje_acumulado || 0) / (metricas.umbral_corte || 1)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Palabras o tokens detectados */}
              <div>
                <p className="text-gray-400 mb-1">Palabras clave/Tokens extraídos:</p>
                {metricas.palabras_clave_detectadas?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {metricas.palabras_clave_detectadas.map((token, i) => (
                      <span key={i} className="bg-gray-800 border border-gray-700 text-emerald-300 px-2 py-0.5 rounded text-[11px]">
                        {token}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Ninguna palabra clave registrada en la última respuesta.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-xs text-gray-400">
              Envíe la primera respuesta para inicializar el vector de trazabilidad.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default CandidatoPage