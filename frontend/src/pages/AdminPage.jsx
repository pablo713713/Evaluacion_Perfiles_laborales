import { useState, useEffect } from 'react'
import api from '../services/api'

function AdminPage() {
  const [usuarios, setUsuarios]           = useState([])
  const [cargando, setCargando]           = useState(true)
  const [errores, setErrores]             = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [form, setForm] = useState({
    nombres:          '',
    apellido_paterno:  '',
    apellido_materno:  '',
    correo:            '',
    id_rol:            '',
  })
  const [guardando, setGuardando]         = useState(false)
  const [mensajeExito, setMensajeExito]   = useState('')
  const [passwordGenerada, setPasswordGenerada] = useState('')
  const [enviandoCorreo, setEnviandoCorreo] = useState({})
  const [roles, setRoles] = useState([])

  const reenviarCredenciales = async (id, correo) => {
    setEnviandoCorreo(prev => ({ ...prev, [id]: true }))
    setErrores([])
    try {
      const res = await api.post(`/api/usuarios/${id}/reenviar-credenciales`)
      setMensajeExito(`Nueva contraseña enviada a ${correo}.`)
      if (res.data._dev_password) setPasswordGenerada(res.data._dev_password)
      setTimeout(() => { setMensajeExito(''); setPasswordGenerada('') }, 10000)
    } catch {
      setErrores(['Error al reenviar las credenciales.'])
    } finally {
      setEnviandoCorreo(prev => ({ ...prev, [id]: false }))
    }
  }

  useEffect(() => {
    cargarUsuarios()
    api.get('/api/usuarios/roles').then(r => setRoles(r.data)).catch(() => {})
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

  const resetForm = () => {
    setForm({ nombres: '', apellido_paterno: '', apellido_materno: '', correo: '', id_rol: '' })
    setPasswordGenerada('')
    setErrores([])
  }

  const validar = () => {
    const errs = []
    if (!form.nombres.trim())          errs.push('El nombre es obligatorio.')
    if (!form.apellido_paterno.trim()) errs.push('El apellido paterno es obligatorio.')
    if (!form.apellido_materno.trim()) errs.push('El apellido materno es obligatorio.')
    if (!form.correo.trim())           errs.push('El correo es obligatorio.')
    if (!form.id_rol)                  errs.push('Seleccione un rol.')
    return errs
  }

  const crearUsuario = async () => {
    setErrores([])
    setPasswordGenerada('')
    const errs = validar()
    if (errs.length > 0) { setErrores(errs); return }

    setGuardando(true)
    try {
      const res = await api.post('/api/usuarios/', {
        nombres:          form.nombres.trim(),
        apellido_paterno: form.apellido_paterno.trim(),
        apellido_materno: form.apellido_materno.trim(),
        correo:           form.correo.trim(),
        id_rol:           parseInt(form.id_rol),
      })

      // Mostrar la contraseña generada (solo en desarrollo)
      if (res.data._dev_password) {
        setPasswordGenerada(res.data._dev_password)
      }

      setMensajeExito(res.data.mensaje || 'Usuario creado correctamente.')
      resetForm()
      setMostrarFormulario(false)
      cargarUsuarios()
      setTimeout(() => { setMensajeExito(''); setPasswordGenerada('') }, 10000)
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
    if (rol === 'Administrador')   return 'bg-[#0f3846]/10 text-[#0f3846]'
    if (rol === 'Psicologo')       return 'bg-blue-50 text-blue-700'
    if (rol === 'PsicologoLider')  return 'bg-purple-50 text-purple-700'
    return 'bg-emerald-50 text-emerald-700'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header en Azul Petróleo */}
      <div className="bg-[#0f3846] border-b border-[#0b2a35] px-8 py-4 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-lg font-medium text-white">Panel de Administración</h1>
          <p className="text-xs text-cyan-100/70 mt-0.5">Gestión de usuarios y roles</p>
        </div>
        <button
          onClick={cerrarSesion}
          className="text-sm text-gray-200 hover:text-[#fef08a] transition-colors"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10">

        {/* Mensaje de éxito */}
        {mensajeExito && (
          <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
            {mensajeExito}
          </div>
        )}

        {/* Contraseña generada — solo desarrollo */}
        {passwordGenerada && (
          <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <span className="font-medium">Contraseña generada (solo visible en desarrollo): </span>
            <span className="font-mono font-bold text-blue-950">{passwordGenerada}</span>
            <span className="block text-xs text-blue-600 mt-1">
              Esta información también fue enviada al correo del usuario.
            </span>
          </div>
        )}

        {/* Errores */}
        {errores.length > 0 && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 space-y-1">
            {errores.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-medium text-gray-600 uppercase tracking-widest">
            Usuarios ({usuarios.length})
          </h2>
          <button
            onClick={() => {
              setMostrarFormulario(!mostrarFormulario)
              resetForm()
            }}
            className="px-4 py-2 bg-[#fef08a] text-[#0f3846] font-semibold text-sm rounded-lg hover:bg-[#fef9c3] transition-colors shadow-sm"
          >
            {mostrarFormulario ? 'Cancelar' : '+ Nuevo usuario'}
          </button>
        </div>

        {/* Formulario */}
        {mostrarFormulario && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
            <h3 className="text-sm font-medium text-[#0f3846] mb-1">Crear nuevo usuario</h3>
            <p className="text-xs text-gray-400 mb-4">
              La contraseña se genera automáticamente y se envía al correo del usuario.
            </p>
            <div className="grid grid-cols-2 gap-4">

              {/* Nombres */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombres</label>
                <input
                  type="text"
                  placeholder="Ej. Andres"
                  value={form.nombres}
                  onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f3846]"
                />
              </div>

              {/* Correo */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Correo electrónico</label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={form.correo}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f3846]"
                />
              </div>

              {/* Apellido paterno */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Apellido paterno</label>
                <input
                  type="text"
                  placeholder="Ej. Terrazas"
                  value={form.apellido_paterno}
                  onChange={(e) => setForm({ ...form, apellido_paterno: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f3846]"
                />
              </div>

              {/* Rol */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rol</label>
                <select
                  value={form.id_rol}
                  onChange={(e) => setForm({ ...form, id_rol: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f3846]"
                >
                  <option value="">Seleccionar rol</option>
                  {roles.map(r => (
                    <option key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</option>
                  ))}
                </select>
              </div>

              {/* Apellido materno — fila completa */}
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Apellido materno</label>
                <input
                  type="text"
                  placeholder="Ej. Candia"
                  value={form.apellido_materno}
                  onChange={(e) => setForm({ ...form, apellido_materno: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f3846]"
                />
              </div>

            </div>

            {/* Vista previa de la contraseña */}
            {form.nombres.trim() && form.apellido_paterno.trim() && (
              <div className="mt-3 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-500">
                Contraseña que se generará:&nbsp;
                <span className="font-mono font-medium text-[#0f3846]">
                  {form.nombres.trim()[0].toLowerCase()}
                  {form.apellido_paterno.trim().toLowerCase().replace(/[^a-záéíóúüñ]/gi, '')}
                  <span className="text-gray-400">XXXX</span>
                </span>
                &nbsp;(los 4 dígitos son aleatorios)
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={crearUsuario}
                disabled={guardando}
                className="px-6 py-2 bg-[#fef08a] text-[#0f3846] font-semibold text-sm rounded-lg hover:bg-[#fef9c3] disabled:bg-gray-200 disabled:text-gray-400 transition-colors shadow-sm"
              >
                {guardando ? 'Creando usuario...' : 'Crear usuario'}
              </button>
            </div>
          </div>
        )}

        {/* Tabla de usuarios */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {cargando ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">Cargando usuarios...</div>
          ) : usuarios.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">No hay usuarios registrados.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Correo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usuarios.map((u) => (
                  <tr key={u.id_usuario} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-800 font-medium">{u.nombre_completo}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{u.correo}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${colorRol(u.rol?.nombre_rol)}`}>
                        {u.rol?.nombre_rol || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs ${u.estado_cuenta === 'activo' ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                        {u.estado_cuenta}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => reenviarCredenciales(u.id_usuario, u.correo)}
                          disabled={enviandoCorreo[u.id_usuario]}
                          className="text-xs text-[#0f3846] font-medium hover:underline disabled:opacity-40 transition-colors"
                        >
                          {enviandoCorreo[u.id_usuario] ? 'Enviando...' : 'Enviar contraseña'}
                        </button>
                        {u.estado_cuenta === 'activo' && (
                          <button
                            onClick={() => desactivarUsuario(u.id_usuario)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                          >
                            Desactivar
                          </button>
                        )}
                      </div>
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