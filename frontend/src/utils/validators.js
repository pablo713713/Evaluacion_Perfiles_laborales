export const validarUsuario = (form) => {
  const { nombre_completo, correo, password, id_rol } = form
  const errores = []

  // 1. Nombre completo
  if (!nombre_completo?.trim()) {
    errores.push('El nombre completo es obligatorio.')
  } else {
    const nombreLimpio = nombre_completo.trim()
    const regexNombre = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/
    if (!regexNombre.test(nombreLimpio)) {
      errores.push('El nombre solo debe contener letras (sin números ni caracteres especiales).')
    }
    if (!nombreLimpio.includes(' ') || nombreLimpio.split(' ').filter(Boolean).length < 2) {
      errores.push('Debe ingresar al menos un nombre y un apellido separados por un espacio.')
    }
  }

  // 2. Correo electrónico
  if (!correo?.trim()) {
    errores.push('El correo electrónico es obligatorio.')
  } else {
    const correoLimpio = correo.trim()
    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!regexCorreo.test(correoLimpio)) {
      errores.push('El correo electrónico debe incluir un "@" y un dominio válido (ej. usuario@dominio.com).')
    }
  }

  // 3. Contraseña
  if (!password) {
    errores.push('La contraseña es obligatoria.')
  } else if (password.length < 8) {
    errores.push('La contraseña debe tener un mínimo de 8 caracteres.')
  }

  // 4. Rol
  if (!id_rol) {
    errores.push('Debe seleccionar un rol.')
  }

  return errores.length > 0 ? errores : null
}