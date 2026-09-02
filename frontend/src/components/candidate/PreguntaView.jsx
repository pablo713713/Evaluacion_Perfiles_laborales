function PreguntaView({ numero, texto }) {

  return (

    <div className="mb-8">

      <span className="text-xs uppercase tracking-widest text-gray-400 font-medium">

        Pregunta {numero}

      </span>

      <p className="mt-3 text-xl text-gray-800 leading-relaxed font-light">

        {texto}

      </p>

    </div>

  )

}



export default PreguntaView