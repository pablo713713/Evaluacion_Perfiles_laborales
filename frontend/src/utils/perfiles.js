// ─────────────────────────────────────────────────────────────────────────────
//  Perfiles conductuales — etiquetas y colores de las vistas del psicólogo
//
//  En la base de datos y en el backend los perfiles se siguen llamando
//  'Dominante' | 'Hibrido' | 'Sumiso'. Solo cambia lo que se MUESTRA:
//      Hibrido → Móvil      Sumiso → Consecuente
//  Por eso los <select> envían el valor original y muestran la etiqueta.
// ─────────────────────────────────────────────────────────────────────────────

export const PERFILES = ['Dominante', 'Hibrido', 'Sumiso']

export const ETIQUETA_PERFIL = {
  Dominante: 'Dominante',
  Hibrido: 'Móvil',
  Sumiso: 'Consecuente',
}

export const etiquetaPerfil = (perfil) => ETIQUETA_PERFIL[perfil] || perfil || '—'

// Colores de los perfiles (gráficas y resaltado de texto)
export const COLOR_PERFIL = { Dominante: '#EF4444', Hibrido: '#3B82F6', Sumiso: '#10B981' }
export const COLOR_PERFIL_BG = { Dominante: '#FEE2E2', Hibrido: '#DBEAFE', Sumiso: '#D1FAE5' }
export const COLOR_PERFIL_TEXT = { Dominante: '#991B1B', Hibrido: '#1E40AF', Sumiso: '#065F46' }

export const COLOR_MANUAL = { bg: '#FFEDD5', text: '#9A3412', borde: '#FB923C' }
export const COLOR_ALERTA = { bg: '#EDE9FE', text: '#5B21B6', barra: '#7C3AED' }

// Paleta institucional (la misma del login)
export const PALETA = {
  navy: '#0f3846',
  navyOscuro: '#0b2a35',
  borde: '#1e5263',
  acento: '#fef08a',
  acentoSuave: '#fef9c3',
}

// Regla del perfil Móvil (antes Híbrido): ambos polos ≥ 30 % o Móvil ≥ 60 %.
// Devuelve la proporción interna Dominante / Consecuente en %, o null.
export function calcularPolaridad(dist) {
  if (!dist) return null
  const d = dist.Dominante || 0
  const h = dist.Hibrido || 0
  const s = dist.Sumiso || 0
  const aplica = (d >= 30 && s >= 30) || h >= 60
  if (!aplica) return null
  const total = d + s
  if (total === 0) return { Dominante: 50, Sumiso: 50 }
  return {
    Dominante: parseFloat(((d / total) * 100).toFixed(1)),
    Sumiso: parseFloat(((s / total) * 100).toFixed(1)),
  }
}

// Reconstruye las alertas clínicas desde los rastros con origen = 'alerta'.
// El backend guarda: lema = etiqueta, dependencia = "alerta:0.7", palabra = texto marcado.
export function reconstruirAlertas(historial = []) {
  return historial
    .flatMap((item) => item.rastro_lexico || [])
    .filter((r) => r.origen === 'alerta')
    .map((r) => ({
      idRastro: r.id_rastro,
      idRespuesta: r.id_respuesta,
      etiqueta: r.lema || r.palabra,
      palabra: r.palabra,
      peso: r.dependencia?.startsWith('alerta:') ? parseFloat(r.dependencia.split(':')[1]) || 0.5 : 0.5,
    }))
}

export const formatoFechaHora = (iso) =>
  iso
    ? new Date(iso).toLocaleString('es-BO', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—'
