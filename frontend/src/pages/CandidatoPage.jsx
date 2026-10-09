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
  const [estado, setEstado] = useState('cargando')
  const [metricas, setMetricas] = useState(null)

  const idEvaluacion = useRef(null)
  const tiempoInicio = useRef(Date.now())
  const intervaloRef = useRef(null)

  useEffect(() => {
    cargarMiEvaluacion()
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current)
    }
  }, [])

  // Iniciar intervalo SOLO cuando el estado es completado
  useEffect(() => {
    if (estado === 'completado') {
      intervaloRef.current = setInterval(() => {
        verificarEstado()
      }, 15000)
    } else {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current)
        intervaloRef.current = null
      }
    }
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current)
    }
  }, [estado])

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
      if (data.metricas_auditoria) setMetricas(data.metricas_auditoria)
      setEstado('activo')
    } catch {
      setEstado('error')
    }
  }

  // Verifica silenciosamente si el estado cambió — usado en la pantalla de completado
  const verificarEstado = async () => {
    try {
      const res = await api.get('/api/evaluaciones/mi-evaluacion')
      const data = res.data
      // Si el psicólogo habilitó repetición, el estado vuelve a "continuar"
      if (data.estado === 'continuar') {
        if (intervaloRef.current) clearInterval(intervaloRef.current)
        idEvaluacion.current = data.id_evaluacion
        setPreguntaActual(data.pregunta_actual)
        setMetricas(null)
        setNumeroPregunta(1)
        setRespuesta('')
        tiempoInicio.current = Date.now()
        setEstado('activo')
      }
    } catch {
      // Silencioso — no interrumpir la pantalla de completado
    }
  }

  const verificarManualmente = async () => {
    setEstado('cargando')
    await cargarMiEvaluacion()
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

      if (resultado.metricas_auditoria) setMetricas(resultado.metricas_auditoria)

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

  // ── Pantallas de estado ──────────────────────────────────────────────────

  if (estado === 'cargando') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f3846]">
        <p className="text-[#fef08a] text-sm tracking-wide">Cargando evaluación...</p>
      </div>
    )
  }

  if (estado === 'completado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f3846] px-4">
        <div className="max-w-md text-center px-8 bg-[#0b2a35] border border-[#1e5263] py-10 rounded-2xl shadow-xl">
          <div className="w-12 h-12 bg-[#0f3846] border border-[#1e5263] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-6 h-6 text-[#fef08a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-light text-white mb-3">Evaluación completada</h2>
          <p className="text-cyan-100/80 text-sm leading-relaxed mb-6">
            Sus respuestas han sido registradas exitosamente.
            El equipo de Recursos Humanos se pondrá en contacto con usted.
          </p>
          <p className="text-xs text-cyan-100/50 mb-6">
            Si fue habilitado para repetir la evaluación, haga clic en el botón de abajo.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={verificarManualmente}
              className="px-6 py-2.5 border border-[#1e5263] text-cyan-100 text-sm rounded-lg hover:bg-[#0f3846] hover:text-white transition-colors"
            >
              Verificar si puedo repetir
            </button>
            <button
              onClick={cerrarSesion}
              className="px-6 py-2.5 bg-[#fef08a] text-[#0f3846] font-semibold text-sm rounded-lg hover:bg-[#fef9c3] transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (estado === 'expirado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f3846] px-4">
        <div className="max-w-md text-center px-8 bg-[#0b2a35] border border-[#1e5263] py-10 rounded-2xl shadow-xl">
          <h2 className="text-xl font-light text-white mb-3">Sesión expirada</h2>
          <p className="text-cyan-100/80 text-sm leading-relaxed mb-8">
            El tiempo disponible para completar la evaluación ha expirado.
            Por favor contacte al departamento de Recursos Humanos.
          </p>
          <button
            onClick={cerrarSesion}
            className="px-6 py-2.5 bg-[#fef08a] text-[#0f3846] font-semibold text-sm rounded-lg hover:bg-[#fef9c3] transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  // ── Pantalla activa ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f3846] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-xl border border-gray-100">

        {preguntaActual && (
          <PreguntaView
            numero={numeroPregunta}
            texto={preguntaActual.texto_pregunta}
          />
        )}

        <RespuestaInput
          value={respuesta}
          onChange={setRespuesta}
          onSubmit={enviarRespuesta}
          enviando={enviando}
          error={error}
        />

        {/* Panel de pruebas del motor psicométrico */}
        <div className="mt-10 border-t border-dashed border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0f3846] bg-[#fef08a] px-2.5 py-1 rounded border border-[#fef08a]">
              Panel de Pruebas (Grafo Probabilístico)
            </span>
            <span className="text-xs text-gray-400">Puntaje acumulado en tiempo real</span>
          </div>

          {metricas ? (
            <div className="bg-[#0b2a35] text-gray-100 p-5 rounded-xl text-xs space-y-4 font-mono border border-[#1e5263]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-cyan-100/60">Espectro Actual:</p>
                  <p className="text-sm font-bold text-[#fef08a] mt-0.5">
                    {metricas.espectro_dominante || 'Evaluando...'}
                  </p>
                </div>
                <div>
                  <p className="text-cyan-100/60">Score / Umbral de Corte:</p>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5">
                    {metricas.puntaje_acumulado?.toFixed(2) || '0.00'} / {metricas.umbral_corte?.toFixed(2) || '1.00'}
                  </p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-cyan-100/60 mb-1">
                  <span>Progresión hacia finalización por convergencia</span>
                  <span>
                    {Math.min(
                      Math.round(((metricas.puntaje_acumulado || 0) / (metricas.umbral_corte || 1)) * 100),
                      100
                    )}%
                  </span>
                </div>
                <div className="w-full bg-[#0f3846] h-2.5 rounded-full overflow-hidden border border-[#1e5263]">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(
                        ((metricas.puntaje_acumulado || 0) / (metricas.umbral_corte || 1)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <p className="text-cyan-100/60 mb-1">Palabras clave/Tokens extraídos:</p>
                {metricas.palabras_clave_detectadas?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {metricas.palabras_clave_detectadas.map((token, i) => (
                      <span key={i} className="bg-[#0f3846] border border-[#1e5263] text-emerald-300 px-2 py-0.5 rounded text-[11px]">
                        {token}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-cyan-100/40 italic">Ninguna palabra clave registrada en la última respuesta.</p>
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