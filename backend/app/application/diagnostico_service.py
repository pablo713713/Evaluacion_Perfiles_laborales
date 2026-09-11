
from datetime import datetime
from io import BytesIO
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from app.infraestructure.db.models.evaluacion import Evaluacion
 
 
def guardar_conclusion(db: Session, id_evaluacion: int, conclusion: str) -> Evaluacion:
    evaluacion = db.query(Evaluacion).filter(Evaluacion.id_evaluacion == id_evaluacion).first()
    evaluacion.conclusion_clinica = conclusion
    evaluacion.fecha_diagnostico = datetime.utcnow()
    db.commit()
    db.refresh(evaluacion)
    return evaluacion
 
 
def generar_pdf(db: Session, id_evaluacion: int) -> bytes:
    """Genera el informe PDF del diagnóstico para enviar a RRHH."""
    ev = db.query(Evaluacion).filter(Evaluacion.id_evaluacion == id_evaluacion).first()
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []
 
    elements.append(Paragraph("INFORME DE EVALUACIÓN DE PERFIL CONDUCTUAL", styles["Title"]))
    elements.append(Spacer(1, 12))
 
    data = [
        ["Candidato",    ev.candidato.nombre_completo],
        ["Psicólogo",    ev.psicologo.nombre_completo],
        ["Fecha inicio", str(ev.fecha_inicio)],
        ["Fecha fin",    str(ev.fecha_fin)],
        ["Perfil",       ev.perfil_predominante or "No concluyente"],
        ["Confianza",    f"{round((ev.porcentaje_confianza or 0) * 100, 1)}%"],
    ]
    tabla = Table(data, colWidths=[150, 300])
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
        ("GRID",       (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME",   (0, 0), (-1, -1), "Helvetica"),
    ]))
    elements.append(tabla)
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("Conclusión clínica:", styles["Heading2"]))
    elements.append(Paragraph(ev.conclusion_clinica or "Sin conclusión registrada.", styles["Normal"]))
 
    # Rastro de auditoría resumido
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("Rastro de Auditoría NLP (resumen):", styles["Heading2"]))
    for respuesta in ev.respuestas:
        if respuesta.rastros:
            elements.append(Paragraph(f"Pregunta nodo #{respuesta.id_nodo}:", styles["Heading3"]))
            for rastro in respuesta.rastros:
                linea = (f"'{rastro.palabra_o_frase_extraida}' → "
                         f"lema: {rastro.verbo_lematizado} | "
                         f"perfil: {rastro.perfil_asignado} | "
                         f"puntos: {rastro.puntos_sumados}"
                         f"{' [NEGADO]' if rastro.tiene_negacion else ''}")
                elements.append(Paragraph(linea, styles["Normal"]))
 
    doc.build(elements)
    return buffer.getvalue()
 