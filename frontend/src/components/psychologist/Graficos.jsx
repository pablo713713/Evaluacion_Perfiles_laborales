// ─────────────────────────────────────────────────────────────────────────────
//  Gráficas del perfil conductual — compartidas por DetalleEvaluacion y
//  RedaccionDiagnostico.
//
//  Cada gráfica es un <svg> autocontenido (incluye su leyenda) con viewBox,
//  para que escale al contenedor y para poder convertirla a imagen e
//  insertarla tal cual en el PDF del informe.
// ─────────────────────────────────────────────────────────────────────────────
import { COLOR_PERFIL, COLOR_ALERTA, etiquetaPerfil, PERFILES } from '../../utils/perfiles'

const FUENTE = 'Inter, Segoe UI, Arial, sans-serif'
const TINTA = '#1F2937'
const TENUE = '#6B7280'

function porcentajes(valores) {
  const total = valores.reduce((s, v) => s + (v || 0), 0)
  return valores.map((v) => (total > 0 ? ((v || 0) / total) * 100 : 0))
}

function rebanadas(datos, cx, cy, r) {
  const total = datos.reduce((s, d) => s + (d.valor || 0), 0)
  if (total === 0) return []
  let inicio = -Math.PI / 2
  return datos
    .filter((d) => d.valor > 0)
    .map((d) => {
      const ang = (d.valor / total) * 2 * Math.PI
      // Un solo segmento al 100 %: un arco no puede cerrarse sobre sí mismo
      if (ang >= 2 * Math.PI - 1e-6) return { ...d, circulo: true }
      const x1 = cx + r * Math.cos(inicio)
      const y1 = cy + r * Math.sin(inicio)
      inicio += ang
      const x2 = cx + r * Math.cos(inicio)
      const y2 = cy + r * Math.sin(inicio)
      const largo = ang > Math.PI ? 1 : 0
      return { ...d, path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largo},1 ${x2},${y2} Z` }
    })
}

function Torta({ datos, nota }) {
  const cx = 150, cy = 150, r = 120
  const pct = porcentajes(datos.map((d) => d.valor))
  const partes = rebanadas(datos, cx, cy, r)
  return (
    <svg viewBox="0 0 560 300" width="100%" style={{ maxWidth: '100%' }} fontFamily={FUENTE} role="img">
      <rect width="560" height="300" fill="#FFFFFF" />
      {partes.map((p, i) =>
        p.circulo
          ? <circle key={i} cx={cx} cy={cy} r={r} fill={p.color} />
          : <path key={i} d={p.path} fill={p.color} stroke="#FFFFFF" strokeWidth="3" />
      )}
      <circle cx={cx} cy={cy} r={52} fill="#FFFFFF" />
      {datos.map((d, i) => {
        const y = 150 - ((datos.length - 1) * 58) / 2 + i * 58
        return (
          <g key={d.nombre}>
            <rect x="315" y={y - 18} width="16" height="16" rx="4" fill={d.color} />
            <text x="342" y={y - 4} fontSize="17" fill={TINTA} fontWeight="600">{d.nombre}</text>
            <text x="342" y={y + 22} fontSize="24" fill={d.color} fontWeight="700">{pct[i].toFixed(1)}%</text>
          </g>
        )
      })}
      {nota && <text x="280" y="292" fontSize="12" fill={TENUE} fontStyle="italic" textAnchor="middle">{nota}</text>}
    </svg>
  )
}

// Distribución general Dominante / Móvil / Consecuente
export function GraficoDistribucion({ dist }) {
  if (!dist) return null
  return (
    <Torta
      datos={PERFILES.map((p) => ({ nombre: etiquetaPerfil(p), valor: dist[p] || 0, color: COLOR_PERFIL[p] }))}
    />
  )
}

// Polaridad interna del perfil Móvil: Dominante vs Consecuente
export function GraficoPolaridad({ polaridad }) {
  if (!polaridad) return null
  return (
    <Torta
      datos={[
        { nombre: 'Dominante', valor: polaridad.Dominante || 0, color: COLOR_PERFIL.Dominante },
        { nombre: 'Consecuente', valor: polaridad.Sumiso || 0, color: COLOR_PERFIL.Sumiso },
      ]}
      nota="Proporción D/C excluyendo el puntaje Móvil"
    />
  )
}

// Distribución + alertas clínicas en barras horizontales
export function GraficoAlertas({ dist, alertas = [] }) {
  if (!dist) return null
  const agrupadas = {}
  alertas.forEach((a) => {
    const k = (a.etiqueta || '').toLowerCase()
    if (!agrupadas[k]) agrupadas[k] = { etiqueta: a.etiqueta, peso: 0 }
    agrupadas[k].peso = Math.min(1, agrupadas[k].peso + (a.peso || 0))
  })
  const pct = porcentajes(PERFILES.map((p) => dist[p]))
  const filas = [
    ...PERFILES.map((p, i) => ({ etiqueta: etiquetaPerfil(p), valor: pct[i], color: COLOR_PERFIL[p], alerta: false })),
    ...Object.values(agrupadas).map((a) => ({ etiqueta: a.etiqueta, valor: a.peso * 100, color: COLOR_ALERTA.barra, alerta: true })),
  ]
  const alto = 46
  const sep = Object.keys(agrupadas).length ? 24 : 0
  const H = 40 + filas.length * alto + sep + 20
  const x0 = 205, ancho = 300
  return (
    <svg viewBox={`0 0 560 ${H}`} width="100%" style={{ maxWidth: '100%' }} fontFamily={FUENTE} role="img">
      <rect width="560" height={H} fill="#FFFFFF" />
      {[0, 25, 50, 75, 100].map((t) => (
        <g key={t}>
          <line x1={x0 + (t / 100) * ancho} y1="28" x2={x0 + (t / 100) * ancho} y2={H - 16} stroke="#EEF0F3" />
          <text x={x0 + (t / 100) * ancho} y="20" fontSize="11" fill={TENUE} textAnchor="middle">{t}%</text>
        </g>
      ))}
      {filas.map((f, i) => {
        const y = 40 + i * alto + (f.alerta ? sep : 0)
        const w = Math.max(3, (Math.min(100, f.valor) / 100) * ancho)
        return (
          <g key={`${f.etiqueta}-${i}`}>
            <text x={x0 - 12} y={y + 19} fontSize="14" fill={f.alerta ? COLOR_ALERTA.text : TINTA}
              fontWeight={f.alerta ? 700 : 600} textAnchor="end">
              {f.alerta ? '▲ ' : ''}{f.etiqueta.length > 24 ? f.etiqueta.slice(0, 23) + '…' : f.etiqueta}
            </text>
            <rect x={x0} y={y} width={w} height="28" rx="6" fill={f.color} opacity={f.alerta ? 0.95 : 0.85} />
            <text x={x0 + w + 8} y={y + 19} fontSize="13" fill={f.alerta ? COLOR_ALERTA.text : TINTA} fontWeight="700">
              {Math.round(f.valor)}%
            </text>
          </g>
        )
      })}
      {sep > 0 && (
        <text x="12" y={40 + PERFILES.length * alto + 15} fontSize="11" fill={COLOR_ALERTA.text} fontWeight="700">
          ALERTAS CLÍNICAS (peso acumulado)
        </text>
      )}
    </svg>
  )
}

// Evolución de la distribución tras cada respuesta
export function GraficoEvolucion({ historial = [] }) {
  const puntos = historial.map((h) => h.distribucion_tras_respuesta).filter(Boolean)
  if (puntos.length < 2) return null
  const W = 560, H = 320, x0 = 50, y0 = 50, ancho = W - x0 - 24, alto = H - y0 - 46
  const px = (i) => x0 + (i / (puntos.length - 1)) * ancho
  const py = (v) => y0 + alto - (Math.min(100, Math.max(0, v)) / 100) * alto
  const cada = Math.max(1, Math.ceil(puntos.length / 12))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: '100%' }} fontFamily={FUENTE} role="img">
      <rect width={W} height={H} fill="#FFFFFF" />
      {PERFILES.map((p, i) => (
        <g key={p}>
          <rect x={x0 + i * 150} y="12" width="14" height="14" rx="3" fill={COLOR_PERFIL[p]} />
          <text x={x0 + i * 150 + 20} y="24" fontSize="13" fill={TINTA} fontWeight="600">{etiquetaPerfil(p)}</text>
        </g>
      ))}
      {[0, 25, 50, 75, 100].map((t) => (
        <g key={t}>
          <line x1={x0} y1={py(t)} x2={x0 + ancho} y2={py(t)} stroke="#EEF0F3" />
          <text x={x0 - 8} y={py(t) + 4} fontSize="11" fill={TENUE} textAnchor="end">{t}%</text>
        </g>
      ))}
      {puntos.map((_, i) =>
        i % cada === 0 || i === puntos.length - 1 ? (
          <text key={i} x={px(i)} y={y0 + alto + 20} fontSize="11" fill={TENUE} textAnchor="middle">P{i + 1}</text>
        ) : null
      )}
      {PERFILES.map((p) => (
        <g key={p}>
          <polyline
            points={puntos.map((d, i) => `${px(i)},${py(d[p] || 0)}`).join(' ')}
            fill="none" stroke={COLOR_PERFIL[p]} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
          />
          {puntos.map((d, i) => (
            <circle key={i} cx={px(i)} cy={py(d[p] || 0)} r="3.5" fill="#FFFFFF" stroke={COLOR_PERFIL[p]} strokeWidth="2" />
          ))}
        </g>
      ))}
      <text x={x0 + ancho / 2} y={H - 6} fontSize="11" fill={TENUE} textAnchor="middle">Respuesta</text>
    </svg>
  )
}

// Lista de todas las gráficas que aplican a una evaluación
export function construirGraficas({ dist, polaridad, alertas, historial }) {
  const lista = []
  if (dist) lista.push({
    id: 'distribucion', titulo: 'Distribución conductual',
    descripcion: 'Proporción final de los tres espectros tras la última respuesta.',
    render: () => <GraficoDistribucion dist={dist} />,
  })
  if (polaridad) lista.push({
    id: 'polaridad', titulo: 'Polaridad interna del perfil Móvil',
    descripcion: 'Cuando el perfil es Móvil, cómo se reparte entre Dominante y Consecuente.',
    render: () => <GraficoPolaridad polaridad={polaridad} />,
  })
  if (alertas && alertas.length > 0) lista.push({
    id: 'alertas', titulo: 'Distribución y alertas clínicas',
    descripcion: 'Espectros junto a las alertas marcadas por el psicólogo (no afectan la distribución).',
    render: () => <GraficoAlertas dist={dist} alertas={alertas} />,
  })
  if (historial && historial.length > 1) lista.push({
    id: 'evolucion', titulo: 'Evolución durante la evaluación',
    descripcion: 'Cómo cambió la distribución después de cada respuesta del candidato.',
    render: () => <GraficoEvolucion historial={historial} />,
  })
  return lista
}
