import { useState, useEffect } from 'react'
import api from '../services/api'
import { validarUsuario } from '../utils/validators'

function AdminPage() {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errores, setErrores] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [form, setForm] = useState({
    nombre_completo: '',
    correo: '',
    password: '',
    id_rol: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')

  useEffect(() => {
    cargarUsuarios()
    cargarRoles()
  }, [])

  const cargarUsuarios = async () => {
    try {
      const res = await api.get('/api/usuarios/')
      setUsuarios(res.data)
    } catch {
      setErrores(['Error al cargar usuarios.'])
    } finally {
      setCargando(false)
    }
  }

  const cargarRoles = async () => {
    try {
      const res = await api.get('/api/usuarios/roles')
      setRoles(res.data)
    } catch {
      console.error('Error cargando roles')
    }
  }

  const crearUsuario = async () => {
    setErrores([])
    
    const erroresValidacion = validarUsuario(form)
    if (erroresValidacion) {
      setErrores(erroresValidacion)
      return
    }

    setGuardando(true)
    try {
      await api.post('/api/usuarios/', {
        nombre_completo: form.nombre_completo.trim(),
        correo: form.correo.trim(),
        password: form.password,
        id_rol: parseInt(form.id_rol),
      })
      setMensajeExito('Usuario creado correctamente.')
      setForm({ nombre_completo: '', correo: '', password: '', id_rol: '' })
      setMostrarFormulario(false)
      cargarUsuarios()
      setTimeout(() => setMensajeExito(''), 3000)
    } catch (err) {
      setErrores([err.response?.data?.detail || 'Error al crear usuario.'])
    } finally {
      setGuardando(false)
    }
  }

  const desactivarUsuario = async (id) => {
    if (!window.confirm('¿Desactivar este usuario?')) return
    try {
      await api.delete(`/api/usuarios/${id}`)
      cargarUsuarios()
      setMensajeExito('Usuario desactivado.')
      setTimeout(() => setMensajeExito(''), 3000)
    } catch {
      setErrores(['Error al desactivar usuario.'])
    }
  }

  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('rol')
    window.location.href = '/login'
  }

  const colorRol = (rol) => {
    if (rol === 'Administrador') return 'bg-gray-100 text-gray-700'
    if (rol === 'Psicologo') return 'bg-blue-50 text-blue-700'
    return 'bg-green-50 text-green-700'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-800">Panel de Administración</h1>
          <p className="text-xs text-gray-400 mt-0.5">Gestión de usuarios y roles</p>
        </div>
        <button
          onClick={cerrarSesion}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10">
        {mensajeExito && (
          <div className="mb-6 px-4 py-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
            {mensajeExito}
          </div>
        )}
        
        {/* Renderizado de errores con salto de línea */}
        {errores.length > 0 && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 space-y-1">
            {errores.map((err, idx) => (
              <div key={idx}>{err}</div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-medium text-gray-600 uppercase tracking-widest">
            Usuarios ({usuarios.length})
          </h2>
          <button
            onClick={() => { setMostrarFormulario(!mostrarFormulario); setErrores([]) }}
            className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            {mostrarFormulario ? 'Cancelar' : '+ Nuevo usuario'}
          </button>
        </div>

        {mostrarFormulario && (
          <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Crear nuevo usuario</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre completo</label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={form.nombre_completo}
                  onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Correo electrónico</label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={form.correo}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Contraseña</label>
                <input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rol</label>
                <select
                  value={form.id_rol}
                  onChange={(e) => setForm({ ...form, id_rol: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                >
                  <option value="">Seleccionar rol</option>
                  <option value="1">Administrador</option>
                  <option value="2">Psicologo</option>
                  <option value="3">Candidato</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={crearUsuario}
                disabled={guardando}
                className="px-6 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:bg-gray-300 transition-colors"
              >
                {guardando ? 'Guardando...' : 'Crear usuario'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          {cargando ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">Cargando usuarios...</div>
          ) : usuarios.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">No hay usuarios registrados.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Correo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usuarios.map((u) => (
                  <tr key={u.id_usuario} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-800">{u.nombre_completo}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{u.correo}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${colorRol(u.rol?.nombre_rol)}`}>
                        {u.rol?.nombre_rol || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs ${u.estado_cuenta === 'activo' ? 'text-green-600' : 'text-gray-400'}`}>
                        {u.estado_cuenta}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.estado_cuenta === 'activo' && (
                        <button
                          onClick={() => desactivarUsuario(u.id_usuario)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          Desactivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPage