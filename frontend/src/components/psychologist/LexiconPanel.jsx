import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import { etiquetaPerfil } from '../../utils/perfiles'

const PERFILES = ['Dominante', 'Hibrido', 'Sumiso']

const PERFIL_COLORES = {
  Dominante: 'bg-red-50 text-red-700',
  Hibrido: 'bg-blue-50 text-blue-700',
  Sumiso: 'bg-green-50 text-green-700',
}

const FORM_VACIO = { lema: '', perfil: 'Dominante', peso: 0.7, categoria: '', es_ambiguo: false, estado_activo: true }

// FastAPI devuelve "detail" como texto (400) o como lista de errores de validación (422)
const mensajeError = (err, porDefecto) => {
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) return detail.map((d) => d.msg.replace('Value error, ', '')).join(' ')
  return porDefecto
}

function LemaForm({ inicial, categorias, onGuardar, onCancelar, guardando }) {
  const [form, setForm] = useState(inicial || FORM_VACIO)
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const lema = form.lema.trim().toLowerCase()
    if (!lema) return setError('El lema es obligatorio.')
    if (/\s/.test(lema)) return setError('El lema debe ser una sola palabra (forma base: «rendir», no «me rendí»).')
    const peso = parseFloat(form.peso)
    if (isNaN(peso) || peso < 0.1 || peso > 1) return setError('El peso debe estar entre 0.1 y 1.0.')
    if (!form.categoria.trim()) return setError('La categoría es obligatoria.')
    setError('')
    onGuardar({ ...form, lema, peso, categoria: form.categoria.trim().toLowerCase() })
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-1">{inicial ? 'Editar lema' : 'Nuevo lema'}</h3>
      <p className="text-xs text-gray-400 mb-4">
        Escriba el lema en su forma base (infinitivo para verbos, singular para sustantivos y adjetivos).
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Lema</label>
          <input
            type="text"
            value={form.lema}
            onChange={(e) => setForm({ ...form, lema: e.target.value })}
            placeholder="Ej. negociar"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Perfil</label>
          <select
            value={form.perfil}
            onChange={(e) => setForm({ ...form, perfil: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
          >
            {PERFILES.map((p) => <option key={p} value={p}>{etiquetaPerfil(p)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Peso (0.1 – 1.0)</label>
          <input
            type="number"
            step="0.05"
            min="0.1"
            max="1"
            value={form.peso}
            onChange={(e) => setForm({ ...form, peso: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Categoría</label>
          <input
            type="text"
            list="categorias-lexico"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            placeholder="Ej. negociacion"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
          />
          <datalist id="categorias-lexico">
            {categorias.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-6">
        <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={form.es_ambiguo}
            onChange={(e) => setForm({ ...form, es_ambiguo: e.target.checked })}
            className="mt-0.5"
          />
          <span>
            Lema ambiguo
            <span className="block text-xs text-gray-400">Solo puntúa si el candidato es quien realiza la acción.</span>
          </span>
        </label>
        {inicial && (
          <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={form.estado_activo}
              onChange={(e) => setForm({ ...form, estado_activo: e.target.checked })}
              className="mt-0.5"
            />
            <span>
              Activo
              <span className="block text-xs text-gray-400">Si se desactiva, deja de puntuar en nuevas respuestas.</span>
            </span>
          </label>
        )}
      </div>

      {error && <p className="mt-4 text-xs text-red-500">{error}</p>}

      <div className="mt-5 flex justify-end gap-3">
        <button onClick={onCancelar} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={guardando}
          className="px-6 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:bg-gray-300 transition-colors"
        >
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

function LexiconPanel({ esLider }) {
  const [lemas, setLemas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [formulario, setFormulario] = useState(null) // null | 'nuevo' | objeto lema

  const [busqueda, setBusqueda] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [verInactivos, setVerInactivos] = useState(false)

  const cargar = async () => {
    try {
      const [rl, rc] = await Promise.all([api.get('/api/lexico/'), api.get('/api/lexico/categorias')])
      setLemas(rl.data)
      setCategorias(rc.data)
    } catch {
      setError('Error al cargar el lexicón.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const avisar = (msg) => {
    setExito(msg)
    setTimeout(() => setExito(''), 3500)
  }

  const guardar = async (datos) => {
    setGuardando(true)
    setError('')
    try {
      if (formulario === 'nuevo') {
        await api.post('/api/lexico/', datos)
        avisar(`Lema «${datos.lema}» agregado.`)
      } else {
        await api.put(`/api/lexico/${formulario.id_lema}`, datos)
        avisar(`Lema «${datos.lema}» actualizado.`)
      }
      setFormulario(null)
      await cargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar el lema.'))
    } finally {
      setGuardando(false)
    }
  }

  const desactivar = async (l) => {
    if (!window.confirm(`¿Desactivar «${l.lema}»? Dejará de puntuar en las nuevas respuestas.`)) return
    try {
      await api.delete(`/api/lexico/${l.id_lema}`)
      avisar(`Lema «${l.lema}» desactivado.`)
      await cargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo desactivar el lema.'))
    }
  }

  const reactivar = async (l) => {
    try {
      await api.put(`/api/lexico/${l.id_lema}`, { ...l, estado_activo: true })
      avisar(`Lema «${l.lema}» reactivado.`)
      await cargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo reactivar el lema.'))
    }
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return lemas.filter((l) =>
      (verInactivos || l.estado_activo) &&
      (!filtroPerfil || l.perfil === filtroPerfil) &&
      (!filtroCategoria || l.categoria === filtroCategoria) &&
      (!q || l.lema.includes(q))
    )
  }, [lemas, busqueda, filtroPerfil, filtroCategoria, verInactivos])

  const conteo = useMemo(() => {
    const c = { Dominante: 0, Hibrido: 0, Sumiso: 0 }
    lemas.forEach((l) => { if (l.estado_activo) c[l.perfil] += 1 })
    return c
  }, [lemas])

  if (cargando) return <p className="text-sm text-gray-400">Cargando lexicón...</p>

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-sm font-medium text-gray-600 uppercase tracking-widest">Lexicón conductual</h2>
          <p className="text-xs text-gray-400 mt-1">
            Lemas que el motor NLP reconoce en las respuestas y el perfil al que suman puntos.
          </p>
        </div>
        {esLider && !formulario && (
          <button
            onClick={() => { setFormulario('nuevo'); setError('') }}
            className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            + Nuevo lema
          </button>
        )}
      </div>

      {!esLider && (
        <div className="mb-4 px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-500">
          Vista de solo lectura. Solo el Psicólogo Líder puede modificar el lexicón.
        </div>
      )}
      {exito && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">{exito}</div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>
      )}

      {formulario && (
        <LemaForm
          key={formulario === 'nuevo' ? 'nuevo' : formulario.id_lema}
          inicial={formulario === 'nuevo' ? null : formulario}
          categorias={categorias}
          onGuardar={guardar}
          onCancelar={() => { setFormulario(null); setError('') }}
          guardando={guardando}
        />
      )}

      {/* Resumen por perfil */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {PERFILES.map((p) => (
          <button
            key={p}
            onClick={() => setFiltroPerfil(filtroPerfil === p ? '' : p)}
            className={`text-left bg-white border rounded-xl px-4 py-3 transition-colors ${
              filtroPerfil === p ? 'border-gray-400' : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${PERFIL_COLORES[p]}`}>
              {etiquetaPerfil(p)}
            </span>
            <p className="text-2xl font-light text-gray-800 mt-2">{conteo[p]}</p>
            <p className="text-xs text-gray-400">lemas activos</p>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar lema..."
          className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
        />
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
          <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />
          Ver desactivados
        </label>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {filtrados.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">No hay lemas que coincidan con el filtro.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Lema</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Perfil</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Peso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ambiguo</th>
                {esLider && <th className="px-6 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map((l) => (
                <tr key={l.id_lema} className={`hover:bg-gray-50 transition-colors ${l.estado_activo ? '' : 'opacity-50'}`}>
                  <td className="px-6 py-3 text-sm text-gray-800 font-medium">
                    {l.lema}
                    {!l.estado_activo && <span className="ml-2 text-xs text-gray-400 font-normal">(desactivado)</span>}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${PERFIL_COLORES[l.perfil]}`}>
                      {etiquetaPerfil(l.perfil)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600 tabular-nums">{l.peso.toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{l.categoria}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{l.es_ambiguo ? 'Sí' : '—'}</td>
                  {esLider && (
                    <td className="px-6 py-3 text-right">
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => { setFormulario(l); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                          className="text-xs text-blue-500 hover:text-blue-700"
                        >
                          Editar
                        </button>
                        {l.estado_activo ? (
                          <button onClick={() => desactivar(l)} className="text-xs text-red-400 hover:text-red-600">
                            Desactivar
                          </button>
                        ) : (
                          <button onClick={() => reactivar(l)} className="text-xs text-green-600 hover:text-green-700">
                            Reactivar
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Mostrando {filtrados.length} de {lemas.length} lemas. Los cambios se aplican a las respuestas que se procesen desde ese momento;
        las evaluaciones anteriores conservan los puntajes con que fueron calculadas.
      </p>
    </div>
  )
}

export default LexiconPanel
