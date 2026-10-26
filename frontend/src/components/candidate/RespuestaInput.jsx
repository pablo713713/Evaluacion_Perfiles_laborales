import { useEffect, useRef, useState } from 'react'

// Dictado por voz con la Web Speech API del navegador (Chrome / Edge).
// El texto dictado se agrega al cuadro y el candidato puede corregirlo antes de enviar.
const Reconocimiento = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

function IconoMicrofono({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="22" />
    </svg>
  )
}

/**
 * Props:
 *  - value, onChange, onSubmit, enviando, error  (igual que antes)
 *  - onModalidad(modalidad): avisa al padre si la respuesta fue 'texto', 'voz' o 'mixta'
 */
function RespuestaInput({ value, onChange, onSubmit, enviando, error, onModalidad }) {
  const [grabando, setGrabando] = useState(false)
  const [parcial, setParcial] = useState('')        // texto que se está reconociendo en vivo
  const [avisoVoz, setAvisoVoz] = useState('')
  const recRef = useRef(null)
  const valorRef = useRef(value)
  const usoVoz = useRef(false)
  const usoTeclado = useRef(false)

  useEffect(() => { valorRef.current = value }, [value])

  // Al cambiar de pregunta (el cuadro queda vacío) se reinicia el registro de modalidad
  useEffect(() => {
    if (value === '') { usoVoz.current = false; usoTeclado.current = false; onModalidad?.('texto') }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => recRef.current?.abort(), [])

  const informarModalidad = () => {
    const m = usoVoz.current && usoTeclado.current ? 'mixta' : usoVoz.current ? 'voz' : 'texto'
    onModalidad?.(m)
  }

  const detener = () => { recRef.current?.stop() }

  const iniciar = () => {
    if (!Reconocimiento) return
    setAvisoVoz('')
    const rec = new Reconocimiento()
    rec.lang = 'es-BO'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e) => {
      let finalTxt = ''
      let vivo = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalTxt += t
        else vivo += t
      }
      if (finalTxt.trim()) {
        const actual = valorRef.current
        const sep = actual && !/\s$/.test(actual) ? ' ' : ''
        onChange(actual + sep + finalTxt.trim())
        usoVoz.current = true
        informarModalidad()
      }
      setParcial(vivo)
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setAvisoVoz('Permiso de micrófono denegado. Habilítelo en el navegador para dictar.')
      } else if (e.error === 'no-speech') {
        setAvisoVoz('No se detectó voz. Intente nuevamente.')
      } else if (e.error !== 'aborted') {
        setAvisoVoz('No se pudo usar el dictado. Puede escribir su respuesta.')
      }
    }
    rec.onend = () => { setGrabando(false); setParcial('') }

    recRef.current = rec
    rec.start()
    setGrabando(true)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) { detener(); onSubmit() }
  }

  const handleChange = (e) => {
    usoTeclado.current = true
    informarModalidad()
    onChange(e.target.value)
  }

  return (
    <div className="w-full">
      <div className="relative">
        <textarea
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={grabando ? 'Escuchando… hable con naturalidad' : 'Escriba su respuesta aquí o use el micrófono para dictarla...'}
          rows={6}
          disabled={enviando}
          className={`w-full border rounded-xl p-4 pr-16 text-gray-700 text-base resize-none
                      focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 transition-colors duration-200
                      ${grabando ? 'border-red-300 bg-red-50/30' : 'border-gray-200 focus:border-[#1e5263]'}`}
        />

        {Reconocimiento && (
          <button
            type="button"
            onClick={grabando ? detener : iniciar}
            disabled={enviando}
            title={grabando ? 'Detener dictado' : 'Dictar respuesta por voz'}
            aria-label={grabando ? 'Detener dictado' : 'Dictar respuesta por voz'}
            className={`absolute right-3 top-3 w-11 h-11 rounded-full flex items-center justify-center transition-all
                        disabled:opacity-40 ${grabando
                          ? 'bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse'
                          : 'bg-[#0f3846] text-[#fef08a] hover:bg-[#1e5263]'}`}
          >
            {grabando
              ? <span className="w-3.5 h-3.5 rounded-sm bg-white" />
              : <IconoMicrofono className="w-5 h-5" />}
          </button>
        )}
      </div>

      {grabando && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Grabando… {parcial && <span className="text-gray-500 italic">{parcial}</span>}
        </p>
      )}
      {avisoVoz && <p className="mt-2 text-sm text-amber-600">{avisoVoz}</p>}
      {!Reconocimiento && (
        <p className="mt-2 text-xs text-gray-400">El dictado por voz está disponible en Google Chrome y Microsoft Edge.</p>
      )}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">Ctrl + Enter para enviar</span>
        <button
          onClick={() => { detener(); onSubmit() }}
          disabled={enviando || !value.trim()}
          className="px-6 py-2.5 bg-[#fef08a] text-[#0f3846] font-semibold text-sm rounded-lg
                     hover:bg-[#fef9c3] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
                     transition-colors duration-200"
        >
          {enviando ? 'Procesando...' : 'Enviar respuesta'}
        </button>
      </div>
    </div>
  )
}

export default RespuestaInput
