function RespuestaInput({ value, onChange, onSubmit, enviando, error }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) onSubmit()
  }

  return (
    <div className="w-full">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escriba su respuesta aquí..."
        rows={6}
        disabled={enviando}
        className="w-full border border-gray-200 rounded-lg p-4 text-gray-700 text-base
                   focus:outline-none focus:border-gray-400 resize-none
                   disabled:bg-gray-50 disabled:text-gray-400
                   transition-colors duration-200"
      />

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Ctrl + Enter para enviar
        </span>
        <button
          onClick={onSubmit}
          disabled={enviando || !value.trim()}
          className="px-6 py-2 bg-gray-800 text-white text-sm rounded-lg
                     hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                     transition-colors duration-200"
        >
          {enviando ? 'Procesando...' : 'Enviar respuesta'}
        </button>
      </div>
    </div>
  )
}

export default RespuestaInput
