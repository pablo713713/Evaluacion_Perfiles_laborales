from app.infraestructure.db.database import Base  # noqa: F401 — Base compartida
from app.infraestructure.db.models.rol import Rol  # noqa: F401
from app.infraestructure.db.models.usuario import Usuario  # noqa: F401
from app.infraestructure.db.models.evaluacion import Evaluacion  # noqa: F401
from app.infraestructure.db.models.nodo_pregunta import NodoPregunta  # noqa: F401
from app.infraestructure.db.models.transicion_grafo import TransicionGrafo  # noqa: F401
from app.infraestructure.db.models.respuesta_candidato import RespuestaCandicato  # noqa: F401
from app.infraestructure.db.models.rastro_auditoria import RastroAuditoriaNLP  # noqa: F401