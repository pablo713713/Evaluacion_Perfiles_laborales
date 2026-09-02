import { useState, useEffect } from 'react'
import api from '../../services/api'

const PERFIL_COLORES = {
  Dominante: 'bg-red-50 text-red-700',
  Hibrido: 'bg-blue-50 text-blue-700',
  Sumiso: 'bg-green-50 text-green-700',
}

function NodoForm({ nodo, onGuardar, onCancelar }) {
  const [form, setForm] = useState(
    nodo || {
      texto_pregunta: '',
      es_raiz: false,
      peso_dominante: 0.33,
      peso_hibrido: 0.34,
      peso_sumiso: 0.33,
    }
  )
  const [error, setError] = useState('')

  const validarPesos = () => {
    const total = parseFloat(form.peso_dominante) +
                  parseFloat(form.peso_hibrido) +
                  parseFloat(form.peso_sumiso)
    return Math.abs(total - 1.0) < 0.01
  }

  const handleSubmit = () => {
    if (!form.texto_pregunta.trim()) {
      setError('El texto de la pregunta es obligatorio.')
      return
    }
    if (!validarPesos()) {
      setError('Los pesos deben sumar 1.0 exactamente.')
      return
    }
    setError('')
    onGuardar(form)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-4">
        {nodo ? 'Editar pregunta' : 'Nueva pregunta'}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Texto de la pregunta</label>
          <textarea
            value={form.texto_pregunta}
            onChange={(e) => setForm({ ...form, texto_pregunta: e.target.value })}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none"
            placeholder="Escriba la pregunta abierta..."
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-red-500 mb-1">Peso Dominante</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={form.peso_dominante}
              onChange={(e) => setForm({ ...form, peso_dominante: parseFloat(e.target.value) })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs text-blue-500 mb-1">Peso Híbrido</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={form.peso_hibrido}
              onChange={(e) => setForm({ ...form, peso_hibrido: parseFloat(e.target.value) })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs text-green-500 mb-1">Peso Sumiso</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={form.peso_sumiso}
              onChange={(e) => setForm({ ...form, peso_sumiso: parseFloat(e.target.value) })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="es_raiz"
            checked={form.es_raiz}
            onChange={(e) => setForm({ ...form, es_raiz: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="es_raiz" className="text-sm text-gray-600">
            Es pregunta raíz (primera del test)
          </label>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            {nodo ? 'Guardar cambios' : 'Crear pregunta'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BancoPreguntas() {
  const [nodos, setNodos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nodoEditando, setNodoEditando] = useState(null)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  useEffect(() => {
    cargarNodos()
  }, [])

  const cargarNodos = async () => {
    try {
      const res = await api.get('/api/preguntas/')
      setNodos(res.data)
    } catch {
      setError('Error al cargar preguntas.')
    } finally {
      setCargando(false)
    }
  }

  const mostrarExito = (msg) => {
    setExito(msg)
    setTimeout(() => setExito(''), 3000)
  }

  const crearNodo = async (form) => {
    try {
      await api.post('/api/preguntas/', form)
      mostrarExito('Pregunta creada correctamente.')
      setMostrarFormulario(false)
      cargarNodos()
    } catch {
      setError('Error al crear la pregunta.')
    }
  }

  const editarNodo = async (form) => {
    try {
      await api.put(`/api/preguntas/${nodoEditando.id_nodo}`, form)
      mostrarExito('Pregunta actualizada correctamente.')
      setNodoEditando(null)
      cargarNodos()
    } catch {
      setError('Error al actualizar la pregunta.')
    }
  }

  const eliminarNodo = async (id) => {
    if (!window.confirm('¿Desactivar esta pregunta del banco?')) return
    try {
      await api.delete(`/api/preguntas/${id}`)
      mostrarExito('Pregunta desactivada.')
      cargarNodos()
    } catch {
      setError('Error al desactivar la pregunta.')
    }
  }

  const perfilPredominante = (nodo) => {
    const pesos = {
      Dominante: nodo.peso_dominante,
      Hibrido: nodo.peso_hibrido,
      Sumiso: nodo.peso_sumiso,
    }
    return Object.entries(pesos).reduce((a, b) => a[1] > b[1] ? a : b)[0]
  }

  return (
    <div>
      {exito && (
        <div className="mb-6 px-4 py-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
          {exito}
        </div>
      )}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium text-gray-600 uppercase tracking-widest">
          Preguntas activas ({nodos.length})
        </h2>
        <button
          onClick={() => { setMostrarFormulario(!mostrarFormulario); setNodoEditando(null) }}
          className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nueva pregunta'}
        </button>
      </div>

      {mostrarFormulario && !nodoEditando && (
        <NodoForm
          onGuardar={crearNodo}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      {nodoEditando && (
        <NodoForm
          nodo={nodoEditando}
          onGuardar={editarNodo}
          onCancelar={() => setNodoEditando(null)}
        />
      )}

      {cargando ? (
        <div className="text-center py-8 text-sm text-gray-400">Cargando preguntas...</div>
      ) : nodos.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">No hay preguntas en el banco.</div>
      ) : (
        <div className="space-y-3">
          {nodos.map((nodo) => (
            <div key={nodo.id_nodo} className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400">#{nodo.id_nodo}</span>
                    {nodo.es_raiz && (
                      <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded">
                        Raíz
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-xs rounded ${PERFIL_COLORES[perfilPredominante(nodo)]}`}>
                      {perfilPredominante(nodo)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{nodo.texto_pregunta}</p>
                  <div className="flex gap-4 mt-3">
                    <span className="text-xs text-red-500">D: {nodo.peso_dominante}</span>
                    <span className="text-xs text-blue-500">H: {nodo.peso_hibrido}</span>
                    <span className="text-xs text-green-500">S: {nodo.peso_sumiso}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => { setNodoEditando(nodo); setMostrarFormulario(false) }}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-3 py-1 border border-gray-200 rounded-lg"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarNodo(nodo.id_nodo)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors px-3 py-1 border border-red-100 rounded-lg"
                  >
                    Desactivar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BancoPreguntas
