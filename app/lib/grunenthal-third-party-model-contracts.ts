export type GrunenthalThirdPartyModelContract = {
  id: string
  title: string
  type: string
  communicationType: string
  usage: string
  text: string
  sourceLabel: string
  docxPath: string
  previewPdfPath: string
  docxDownloadName: string
  textDownloadName: string
}

export const GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS_SOURCE =
  "Manual de Relaciones con Terceros de Grünenthal, Apéndice 2. Contratos modelo de comunicación de datos personales"

export const GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS: GrunenthalThirdPartyModelContract[] = [
  {
    id: "grunenthal-model-contract-cm1-remision",
    title: "CM-1. Contrato Modelo de Remisión de Datos Personales (Responsable - Encargado)",
    type: "Contrato modelo de remisión",
    communicationType: "Remisión",
    usage: "Usar cuando Grünenthal actúa como responsable y un tercero trata datos personales por cuenta de Grünenthal como encargado.",
    text: `CM-1. Contrato Modelo de Remisión de Datos Personales (Responsable – Encargado)

CONTRATO DE REMISIÓN DE DATOS PERSONALES, QUE CELEBRAN POR UNA PARTE GRÜNENTHAL DE MÉXICO, S.A. DE C.V. (EN ADELANTE “EL RESPONSABLE”) REPRESENTADA EN ÉSTE ACTO POR [Definir] A QUIEN EN LO SUCESIVO Y PARA EFECTOS DEL PRESENTE CONTRATO, SE LE DENOMINARÁ COMO “EL RESPONSABLE”, POR LA OTRA, [RAZÓN SOCIAL O NOMBRE COMPLETO DE LA RECEPTORA], REPRESENTADA EN ÉSTE ACTO POR [DEFINIR], A QUIEN EN LO SUCESIVO Y PARA EFECTOS DEL PRESENTE CONTRATO, SE LE DENOMINARA “EL ENCARGADO”, DE ACUERDO A LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:

ANTECEDENTES

El [Día, mes y año] las partes celebraron un Contrato de Prestación de Servicios Profesionales (en lo sucesivo “el Contrato”), el cual conjuntamente con el presente contrato sustenta la relación contractual entre las partes.

DECLARACIONES

Declara el “Responsable” a través de su representante legal;

Ser una sociedad mercantil debidamente constituida de conformidad con las leyes de mexicanas;

Su representante legal cuenta con las facultades suficientes para celebrar el presente Contrato, mismas que no le han sido modificadas ni revocadas a la fecha;

Se encuentra debidamente inscrita en el Registro Federal de Contribuyentes bajo la clave número [definir].

Está facultada conforme a su objeto social para celebrar el presente Contrato;

Cuenta con la capacidad y medios materiales, técnicos, personales y demás elementos necesarios para el cumplimiento de las obligaciones a su cargo derivadas del presente Contrato;

La celebración del presente Contrato no viola o incumple disposición alguna contenida en (i) sus estatutos sociales y (ii) acuerdos, contratos o convenios celebrados con terceros en o con anterioridad a la fecha de firma del presente Contrato que involucren de cualquier forma a su representada; y

Que es su voluntad celebrar el presente contrato y su representante cuenta con plenas facultades para llevarlo a cabo, mismas que no le han sido modificadas y/o revocadas a la fecha de firma del presente contrato tal y como consta en [definir].

El “Encargado” por conducto de su representante legal, declara que:

Ser una sociedad mercantil debidamente constituida conforme a las leyes [definir] tal y como consta en escritura pública [definir] de fecha [definir].  de [definir] de 20[definir], pasada ante la fe del notario [definir] de la Ciudad de [definir], Licenciado [definir].

Que su representada se encuentra inscrita en el Registro Federal de Contribuyentes con la clave [definir].

Que su objeto social consiste en [definir].

Tener su domicilio fiscal en [definir].

Que es su voluntad celebrar el presente contrato y su representante cuenta con plenas facultades para llevarlo a cabo, mismas que no le han sido modificadas y/o revocadas a la fecha de firma del presente contrato tal y como consta en [definir].

El Responsable y el Encargado (conjuntamente, las “Partes” e individual e indistintamente, la “Parte”) declaran, por conducto de sus respectivos representantes legales, que es su deseo celebrar el presente Contrato en los términos que a continuación se estipulan, remitiéndose para tal efecto a las siguientes:

CLÁUSULAS

PRIMERA. DEFINICIONES

A efectos de las presentes cláusulas se emplearán las siguientes definiciones:

Aviso de privacidad: Documento a disposición de la persona titular de la información de forma física, electrónica o en cualquier otro formato generado por el responsable, a partir del momento en el cual se recaben sus datos personales, con el objeto de informarle los propósitos del tratamiento de los mismos.

Base de datos: Conjunto ordenado de datos personales referentes a una persona identificada o identificable condicionados a criterios determinados, con independencia de la forma o modalidad de su creación, tipo de soporte, procesamiento, almacenamiento y organización.

Datos personales: Cualquier información concerniente a una persona identificada o identificable. Se considera que una persona es identificable cuando su identidad pueda determinarse directa o indirectamente a través de cualquier información.

Datos personales sensibles: Aquellos datos personales que afecten a la esfera más íntima de la persona titular, o cuya utilización indebida pueda dar origen a discriminación o conlleve un riesgo grave para esta. De manera enunciativa más no limitativa se consideran sensibles los datos personales que puedan revelar aspectos como origen racial o étnico, estado de salud presente o futuro, información genética, creencias religiosas, filosóficas y morales, opiniones políticas y preferencia sexual.

Medidas de seguridad administrativas: Conjunto de acciones y mecanismos para establecer la gestión, soporte y revisión de la seguridad de la información a nivel organizacional, la identificación y clasificación de la información, así como la concienciación, formación y capacitación del personal, en materia de protección de datos personales.

Medidas de seguridad físicas: Conjunto de acciones y mecanismos, ya sea que empleen o no la tecnología, destinados para:

Prevenir el acceso no autorizado, el daño o interferencia a las instalaciones físicas, áreas críticas de la organización, equipo e información;

Proteger los equipos móviles, portátiles o de fácil remoción, situados dentro o fuera de las instalaciones;

Proveer a los equipos que contienen o almacenan datos personales de un mantenimiento que asegure su disponibilidad, funcionalidad e integridad, y

Garantizar la eliminación de datos de forma segura.

Medidas de seguridad técnicas: Conjunto de actividades, controles o mecanismos con resultado medible, que se valen de la tecnología para asegurar que:

El acceso a las bases de datos lógicas o a la información en formato lógico sea por usuarios identificados y autorizados;

El acceso referido en el inciso anterior sea únicamente para que el usuario lleve a cabo las actividades que requiere con motivo de sus funciones;

Se incluyan acciones para la adquisición, operación, desarrollo y mantenimiento de sistemas seguros, y

Se lleve a cabo la gestión de comunicaciones y operaciones de los recursos informáticos que se utilicen en el tratamiento de datos personales;

Remisión: La comunicación de datos personales entre el responsable y el encargado.

Titular: Persona a quien corresponden los datos personales.

Transferencia: Toda comunicación de datos personales dentro o fuera del territorio mexicano, realizada a persona distinta de la titular, del responsable o de la persona encargada del tratamiento.

SEGUNDA. OBJETO

El objeto del presente contrato es regular la relación entre el Responsable y la Persona Encargada del tratamiento como resultado de la prestación de los servicios de [Describir naturaleza de los servicios que dan origen al tratamiento].

TERCERA. ACCESO A LOS DATOS PERSONALES.

La Persona Encargada, para cumplir con la prestación de servicios contratados por el Responsable al tenor del presente contrato tendrá acceso a datos personales que se encuentran en posesión de el Responsable. Lo anterior no se considerará, para la presente relación jurídica, como una transferencia de datos ya que dicho acceso y tratamiento resulta necesario para dar cumplimiento a las finalidades previstas en el Aviso de Privacidad del Responsable y que se adjunta como Anexo a la presente, razón por la cual la comunicación de datos personales entre la Persona Encargada y el Responsable se da bajo la figura de la Remisión.

CUARTA. ACTUACIÓN DE LA PERSONA ENCARGADA.

La Persona Encargada se obliga a actuar, únicamente, conforme a las instrucciones del Responsable que decide sobre la finalidad y usos del tratamiento de los datos personales. Esto es, la Persona Encargada sólo podrá tratar los datos personales remitidos por el Responsable para cumplir con los servicios descritos en el Contrato, y no los aplicará o utilizará con fin distinto al que figura en lo pactado entre las partes, ni los transferirá, ni siquiera para su conservación, a otras personas, salvo en el caso de que el Responsable así lo determine, la transferencia derive de una subcontratación, o cuando así lo requiera la autoridad competente.

QUINTA. COMUNICACIÓN DEL AVISO DE PRIVACIDAD.

La Persona Encargada reconoce que el Responsable le ha comunicado el Aviso de Privacidad que se adjunta como anexo [definir] al presente instrumento jurídico, el cual fue puesto, en su momento, a disposición de los Titulares cuyos datos personales están siendo remitidos en la presente relación jurídica y que se encuentran en posesión de el Responsable. En este sentido, La Persona Encargada se obliga a respetar, en todo momento, el Aviso de Privacidad en cuestión.

SEXTA. RESPONSABILIDAD DE LA PERSONA ENCARGADA.

La Persona Encargada se obliga a cumplir con las siguientes obligaciones:

Realizar el tratamiento de datos personales conforme a las instrucciones del Responsable.

Abstenerse de tratar los datos personales para finalidades distintas a las instruidas por el Responsable.

Implementar las medidas de seguridad conforme a los instrumentos jurídicos aplicables con arreglo a lo previsto en la cláusula OCTAVA y cualquier otro requisito previsto por la normatividad aplicable.

Informar al responsable cuando ocurra una vulneración a los datos personales que trata por sus instrucciones de acuerdo con las condiciones previstas en la cláusula NOVENA de este instrumento.

Guardar confidencialidad respecto de los datos personales tratados bajo las condiciones previstas en la cláusula SÉPTIMA de este instrumento.

Suprimir, devolver o comunicar a un nuevo encargado designado por el responsable los datos personales objeto de tratamiento, una vez cumplida la relación jurídica con el responsable o por instrucciones de este, excepto que una disposición legal exija la conservación de los datos personales, o bien, que el responsable autorice la comunicación de estos a otro encargado.

Abstenerse de transferir los datos personales, salvo en el caso de que el responsable así lo determine, o la comunicación derive de una subcontratación, o por mandato expreso de la autoridad de control.

Permitir al responsable o autoridad de control inspecciones y verificaciones en sitio.

Generar, actualizar y conservar la documentación que sea necesaria y que le permita acreditar sus obligaciones.

Colaborar con el Responsable en todo lo relativo al cumplimiento de la legislación que resulte aplicable en la materia.

La Persona Encargada reconoce que podrá ser considerando responsable con las obligaciones propias de éste, cuando: 1) Destine o utilice los datos personales con una finalidad distinta a la señalada en el presente contrato, o 2) Efectúe una transferencia, incumpliendo las instrucciones del Responsable.

SÉPTIMA. CONFIDENCIALIDAD.

La Persona Encargada o los terceros autorizados que tengan acceso a los datos durante el tratamiento dado a los mismos, se comprometen a guardar confidencialidad respecto de éstos, obligación que subsistirá aun después de finalizar sus relaciones con el Responsable.

OCTAVA. MEDIDAS DE SEGURIDAD.

La Persona Encargada deberá establecer, mantener y cumplir con medidas de seguridad físicas, técnicas y administrativas que estén diseñadas para: (i) garantizar la seguridad y la integridad de las redes, bases de datos, sistemas y operaciones del cliente, sus socios comerciales y/o entidades afiliadas según corresponda; y (ii) proteger los datos personales contra pérdida o destrucción no autorizada, robo, extravío o copia no autorizada, uso, acceso o tratamiento no autorizado y contra daño, alteración, modificación o divulgación  no autorizada.

Para el establecimiento de las medidas de seguridad que resulten necesarias, la Persona Encargada deberá tomar en cuenta lo previsto en la normatividad de protección de datos personales, los estándares y mejores prácticas internacionales.

La Persona Encargada deberá contar con un Documento de Seguridad o un instrumento jurídico equivalente en el que se prevea al menos lo siguiente:

Se establezcan lineamientos de observancia obligatoria para el personal con la finalidad de garantizar la confidencialidad, integridad y disponibilidad de la información y sistemas propiedad del Responsable, sus socios comerciales y/o entidades afiliadas según corresponda en cada caso;

Establecer instrucciones expresas para el personal que efectúe el tratamiento sobre el protocolo de actuación en el supuesto de que ocurra algún evento que comprometa la seguridad de la información propiedad del Cliente. Lo anterior incluye la obligación de que la Persona Encargada celebre y mantenga vigentes convenios de confidencialidad con todas las personas, empleados propios y de terceros, que tengan acceso a la información propiedad del Responsable. En caso de que los datos personales llegaren a hacerse del conocimiento de terceras personas por dolo, negligencia o mala fe imputable a la Persona Encargada, la Persona Encargada será responsable de los daños y perjuicios que ocasionen al Responsable, sin perjuicio de las responsabilidades y sanciones legales que deriven.

El Documento de Seguridad de la Persona Encargada debe prever las disposiciones necesarias para regular el manejo de información personal dentro de su organización. Dicho documento debe abordar al menos los siguientes elementos: asignación y delegación de responsabilidades en materia de seguridad; supervisión del cumplimiento del Documento de Seguridad y su implementación; los medios para manejar la seguridad dentro de la organización; las políticas y procedimientos para garantizar la confidencialidad de los datos personales, su uso adecuado y regular su acceso al personal; procedimientos de respuesta ante vulneraciones de seguridad.

Impedir el acceso a los datos personales a personas que no cuenten con privilegios de acceso, o bien en caso de que sea a solicitud fundada y motivada de autoridad competente, informar de ese hecho al Responsable.

La Persona Encargada deberá proporcionar al Responsable una copia del contenido de su Documento de Seguridad bajo los términos de confidencialidad acordados en el presente instrumento jurídico si el Responsable así lo requiere.

En el supuesto de que la revisión que el Responsable realice a las medidas y procedimientos requeridos en materia de seguridad de datos personales revelen que existe un incumplimiento a los estándares requeridos, la Persona Encargada deberá realizar las acciones necesarias dentro de los 5 días próximos para implementar aquellas medidas de seguridad faltantes que resulten necesarias para proteger los datos personales.

En el supuesto de incumplimiento, por parte de la Persona Encargada a lo referido en la presente cláusula incluidos sus empleados, la Persona Encargada asumirá la responsabilidad que pudiere irrogarse al Responsable como consecuencia de cualquier tipo de sanciones administrativas impuestas por las autoridades correspondientes, así como los daños y perjuicios por procedimientos judiciales o extrajudiciales contra el Responsable (incluidas las costas de resolución y los honorarios razonables de abogado), considerándose asimismo causa especifica de recisión anticipada del presente Contrato.

NOVENA. VULNERACIÓNES DE SEGURIDAD.

Se consideran vulneraciones de seguridad, las siguientes acciones que ocurran en cualquier fase del tratamiento: (i) La pérdida o destrucción no autorizada; (ii) El robo, extravío o copia no autorizada; (iii) El uso, acceso o tratamiento no autorizado, o (iv) El daño, la alteración o modificación no autorizada; (iv) cualquier otra que ponga en riesgo la confidencialidad, seguridad, disponibilidad o integridad de la información propiedad del Responsable.

La Persona Encargada se obliga, en caso de sufrir alguna vulneración de seguridad que pudiere afectar la confidencialidad, la integridad o la disponibilidad de los datos personales que forman parte de la Base de Datos del Responsable, a informar al Responsable respecto de lo ocurrido. La notificación al Responsable deberá realizarse en un plazo máximo de 24 horas, contadas a partir desde que se tuvo conocimiento de la vulneración, a fin de que este último pueda tomar las medidas necesarias conforme a la normatividad. Además de lo anterior, la Persona Encargada tendrá la obligación de cooperar con el Responsable, los consumidores y las autoridades u órganos reguladores a los que deba involucrarse para la investigación, seguimiento o atención del incidente. En el supuesto de que ocurra una vulneración de seguridad, la Persona Encargada deberá de emprender acciones inmediatas para salvaguardar la seguridad de la información del Responsable y contener las posibles consecuencias que de él se deriven en términos de la normatividad aplicable. La falta de la notificación de las vulneraciones será una causal de recisión del presente Contrato.

DÉCIMA. DATOS SENSIBLES.

Las Partes reconocen que en el supuesto de que el Responsable remita a la Persona Encargada datos personales de carácter sensible, la Persona Encargada aplicará las medidas de seguridad físicas, técnicas y administrativas necesarias y pertinentes para proteger los datos personales contra pérdida, destrucción, robo, extravío, acceso no autorizado y/o cualquier acción que pudiera comprometer su disponibilidad, confiabilidad y confidencialidad.

DÉCIMO PRIMERA. CANCELACIÓN DE LOS DATOS Y CONSERVACIÓN.

Las Partes acuerdan que, una vez cumplida la prestación de servicios pactada, y cuando ya no sean necesarios para continuar con el encargo realizado, los datos personales serán suprimidos o devueltos por la Persona Encargada al Responsable, al igual que cualquier soporte o documentos en que conste algún dato personal objeto del tratamiento. No procederá la supresión de los datos personales cuando exista una previsión legal que exija su conservación, en cuyo caso la Persona Encargada deberá devolver los mismos al Responsable, quien garantizará su conservación.

La Persona Encargada no conservará los datos personales por más tiempo de aquel que corresponda al periodo mínimo necesario durante el cual deba tratarlos en términos de los servicios contratados. Una vez cumplida la prestación de servicios pactada y cuando ya no sean necesarios para continuar con el encargo realizado, la Persona Encargada deberá de tomar en cuenta los criterios emitidos por la autoridad para garantizar el borrado seguro de los datos personales.

DÉCIMO SEGUNDA.  SUBCONTRATACIÓN.

Para el correcto cumplimiento del presente Contrato, la Persona Encargada podrá subcontratar, total o parcialmente, las obligaciones que adquieren bajo el presente Contrato con terceras Personas, en el entendido de que la Persona Encargada continuará siendo total e individualmente responsable frente al respecto del cumplimiento de tales obligaciones. En relación con lo anterior, la Persona Encargada se obliga a lo siguiente:

La Persona Encargada garantizará que los terceros subcontratistas asuman, mediante contrato por escrito, obligaciones de protección de datos equivalentes a las establecidas en el presente instrumento para la Persona Encargada. Para tal efecto, la Persona Encargada se obliga a informar al Responsable, la identidad de los subcontratistas utilizados y la descripción de los servicios subcontratados.

La Persona Encargada se obliga a verificar que cualquier tercero subcontratado cumpla con las obligaciones previstas en este instrumento.

La Persona Encargada será responsable frente al Responsable por cualquier incumplimiento en que incurran los subcontratistas respecto de las obligaciones de protección de datos personales.

Las Partes convienen que el Responsable podrá solicitar la remoción de un subcontratista por causa justificada, bastando para ello, aviso por escrito con tres (3) días hábiles de anticipación a la fecha de dicha remoción.

Sin perjuicio de lo anterior, en el caso de que la Persona Encargada desee llevar al cabo la subcontratación de alguna de las obligaciones consignadas a su cargo en el presente Contrato y alguna de las obligaciones subcontratadas implica la transferencia o tratamiento de datos personales de los Titulares, previo a realizar la subcontratación, la Persona Encargada se obliga a obtener la autorización por escrito del Responsable. Si la Persona Encargada lleva a cabo tal subcontratación sin el previo consentimiento por escrito del Responsable, el Responsable podrá rescindir el presente Contrato.

DÉCIMO TERCERA. OBLIGACIONES DEL RESPONSABLE.

Por medio del presente instrumento, el Responsable reconoce que ha recabado los datos personales objeto del presente contrato de manera lícita, conforme a lo exigido en la Ley y demás disposiciones aplicables.

Serán obligaciones del Responsable las siguientes:

Comunicar a la Persona Encargada sobre cualquier modificación que realice al Aviso de Privacidad.

Procurar que los datos personales remitidos a la Persona Encargada sean pertinentes, correctos y actualizados para los fines para los cuales fueron recabados.

Atender los ejercicios de derechos ARCO ejercidos por los titulares.

Comunicar a la Persona Encargada sobre cualquier rectificación o cancelación efectuada para que éste proceda a efectuarla también dentro de los 5 días siguientes a recibir la instrucción, debiendo notificar a la Persona Encargada al Responsable sobre la ejecución de la instrucción.

Realizar, en las instalaciones de la Persona Encargada donde se dé el tratamiento a los datos personales objeto de la presente cláusula, las auditorías y/o inspecciones que considere necesarias para verificar el cumplimiento por parte de la Persona Encargada las obligaciones precisadas en el presente instrumento. En caso de que el Responsable decida realizar una auditoría informará a la Persona Encargada por escrito con 48 horas de anticipación al día a realizarse la auditoría.

DÉCIMO CUARTA. RESPONSABILIDAD

Las Partes se harán responsables, respectivamente del uso indebido que, por mala fe o negligencia de su parte en el manejo de los datos personales, debiendo sacar en paz y a salvo a la otra Parte de cualquier controversia legal que pudiera suscitarse por estos hechos.

DÉCIMO QUINTA. VIGENCIA.

Las Partes reconocen que la vigencia del presente contrato estará sujeta a la determinada en el Contrato.

Las Partes acuerdan que los términos, condiciones y provisiones de este contrato serán obligatorias para cada una de ellas. En caso de incumplimiento de las cláusulas será una causal de recisión del presente Contrato

DÉCIMA SEXTA. NOTIFICACIONES.

Cualquier comunicación o notificación que deba realizarse con motivo del presente contrato deberá realizarse por escrito en los domicilios establecidos en el apartado de “DECLARACIONES” del presente contrato y obtenerse la confirmación de que la parte a quien se dirige dicha comunicación o notificación efectivamente la recibió.

DÉCIMO SÉPTIMA. JURIDISCCIÓN.

Para todo lo relacionado a la interpretación y ejecución del presente Contrato, las Partes se someten a las leyes aplicables y tribunales competentes de [señalar jurisdicción], renunciando por tanto al fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros o por cualquier otra causa.

GRÜNENTHAL DE MÉXICO, S.A. DE C.V. EL “RESPONSABLE” | [Nombre o razón social del Encargado]. EL “ENCARGADO”`,
    sourceLabel: GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS_SOURCE,
    docxPath: "client/grunenthal/third-party-contracts/model-contracts/cm-1-contrato-modelo-remision-datos-personales.docx",
    previewPdfPath: "client/grunenthal/third-party-contracts/model-contracts/cm-1-contrato-modelo-remision-datos-personales-preview.pdf",
    docxDownloadName: "cm-1-contrato-modelo-remision-datos-personales.docx",
    textDownloadName: "cm-1-contrato-modelo-remision-datos-personales.txt",
  },
  {
    id: "grunenthal-model-contract-cm2-transferencia",
    title: "CM-2. Contrato Modelo de Transferencia de Datos Personales (Responsable - Responsable)",
    type: "Contrato modelo de transferencia",
    communicationType: "Transferencia",
    usage: "Usar cuando la comunicación de datos se realiza entre responsables y el receptor decide finalidades o medios propios del tratamiento.",
    text: `CM-2. Contrato Modelo de Transferencia de Datos Personales (Responsable – Responsable)

CONTRATO EN MATERIA DE TRANSFERENCIA DE DATOS PERSONALES, QUE CELEBRAN POR UNA PARTE PARTE GRÜNENTHAL DE MÉXICO, S.A. DE C.V.  REPRESENTADA EN ÉSTE ACTO POR [DEFINIR] A QUIEN EN LO SUCESIVO Y PARA EFECTOS DEL PRESENTE CONTRATO, SE LE DENOMINARÁ COMO “LA TRANSFERENTE”, Y POR LA OTRA, [RAZÓN SOCIAL O NOMBRE COMPLETO DE LA RECEPTORA], REPRESENTADA EN ÉSTE ACTO POR [DEFINIR], A QUIEN EN LO SUCESIVO Y PARA EFECTOS DEL PRESENTE CONTRATO, SE LE DENOMINARA “LA RECEPTORA”, DE ACUERDO A LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:

ANTECEDENTES

El [Día, mes y año] las partes celebraron un Contrato de Prestación de Servicios Profesionales (en lo sucesivo “el Contrato”), el cual conjuntamente con el presente contrato sustenta la relación contractual entre las partes.

DECLARACIONES

I. Declara el “LA TRANSFERENTE” a través de su representante legal:

Ser una sociedad mercantil debidamente constituida de conformidad con las leyes de mexicanas.

Su representante legal cuenta con las facultades suficientes para celebrar el presente Contrato, mismas que no le han sido modificadas ni revocadas a la fecha;

Se encuentra debidamente inscrita en el Registro Federal de Contribuyentes bajo el clave número [definir].

Está facultada conforme a su objeto social para celebrar el presente Contrato;

Cuenta con la capacidad y medios materiales, técnicos, personales y demás elementos necesarios para el cumplimiento de las obligaciones a su cargo derivadas del presente Contrato;

La celebración del presente Contrato no viola o incumple disposición alguna contenida en (i) sus estatutos sociales y (ii) acuerdos, contratos o convenios celebrados con terceros en o con anterioridad a la fecha de firma del presente Contrato que involucren de cualquier forma a su representada; y

Que es su voluntad celebrar el presente contrato y su representante cuenta con plenas facultades para llevarlo a cabo, mismas que no le han sido modificadas y/o revocadas a la fecha de firma del presente contrato tal y como consta en _________________________________.

II. Declara el “LA RECEPTORA” por conducto de su representante legal declara, que:

Ser una sociedad mercantil debidamente constituida conforme a las leyes [definir] tal y como consta en escritura pública [definir] de fecha [definir]de [definir] de 20[definir], pasada ante la fe del notario [definir] de la Ciudad de [definir], Licenciado [definir].

Que su representada se encuentra inscrita en el Registro Federal de Contribuyentes con la clave [definir]

Que su objeto social consiste en [definir].

Tener su domicilio fiscal en [definir].

Que es su voluntad celebrar el presente contrato y su representante cuenta con plenas facultades para llevarlo a cabo, mismas que no le han sido modificadas y/o revocadas a la fecha de firma del presente contrato tal y como consta en [definir].

III. “LA TRANSFERENTE” y “LA RECEPTORA” (conjuntamente, las “Partes” e individual e indistintamente, la “Parte”) declaran, por conducto de sus respectivos representantes legales, que es su deseo celebrar el presente Contrato en los términos que a continuación se estipulan, remitiéndose para tal efecto a las siguientes:

CLÁUSULAS

PRIMERA. DEFINICIONES.

A efectos de las presentes cláusulas se emplearán las siguientes definiciones:

Aviso de privacidad: Documento físico, electrónico o en cualquier otro formato generado por el Transferente que es puesto a disposición del titular, previo al tratamiento de sus datos personales.

Base de datos: El conjunto ordenado de datos personales referentes a una persona identificada o identificable.

Datos personales: Cualquier información concerniente a una persona física identificada o identificable.

Datos personales sensibles: Aquellos datos personales que afecten a la esfera más íntima de su titular, o cuya utilización indebida pueda dar origen a discriminación o conlleve un riesgo grave para éste. En particular, se consideran sensibles aquellos que puedan revelar aspectos como origen racial o étnico, estado de salud presente y futuro, información genética, creencias religiosas, filosóficas y morales, afiliación sindical, opiniones políticas, preferencia sexual.

Medidas de seguridad administrativas: Conjunto de acciones y mecanismos para establecer la gestión, soporte y revisión de la seguridad de la información a nivel organizacional, la identificación y clasificación de la información, así como la concienciación, formación y capacitación del personal, en materia de protección de datos personales.

Medidas de seguridad físicas: Conjunto de acciones y mecanismos, ya sea que empleen o no la tecnología, destinados para:

Prevenir el acceso no autorizado, el daño o interferencia a las instalaciones físicas, áreas críticas de la organización, equipo e información;

Proteger los equipos móviles, portátiles o de fácil remoción, situados dentro o fuera de las instalaciones;

Proveer a los equipos que contienen o almacenan datos personales de un mantenimiento que asegure su disponibilidad, funcionalidad e integridad, y

Garantizar la eliminación de datos de forma segura.

Medidas de seguridad técnicas: Conjunto de actividades, controles o mecanismos con resultado medible, que se valen de la tecnología para asegurar que:

El acceso a las bases de datos lógicas o a la información en formato lógico sea por usuarios identificados y autorizados;

El acceso referido en el inciso anterior sea únicamente para que el usuario lleve a cabo las actividades que requiere con motivo de sus funciones;

Se incluyan acciones para la adquisición ̧ operación, desarrollo y mantenimiento de sistemas seguros, y

Se lleve a cabo la gestión de comunicaciones y operaciones de los recursos informáticos que se utilicen en el tratamiento de datos personales;

Titular: La persona física a la que pertenecen los datos personales.

Transferencia: Toda comunicación de datos realizada a persona distinta del Transferente o Receptor del tratamiento.

SEGUNDA. OBJETO.

El objeto del presente contrato es establecer las reglas conforme a las cuales se llevará a cabo la transferencia de la base de datos de (Definir base de datos) (en adelante, “la base de datos transferida”) en posesión de “LA TRANSFERENTE” a “LA RECEPTORA”.

TERCERA. COMUNICACIÓN DEL AVISO DE PRIVACIDAD.

“LA TRANSFERENTE” reconoce que ha informado a todos los Titulares que forman parte de la base de datos transferida, a través de su Aviso de Privacidad, sobre la transferencia que realizará de sus datos personales a “LA RECEPTORA”. “Las Partes” acuerdan que el Aviso de Privacidad que deberá a poner a disposición “El Transferente” de los titulares cuyos datos personales obren en la base de datos transferida será el que se adjunta al presente como Anexo [Definir] y que esta transferencia, por tanto, está claramente definida y consentida en su caso en el mencionado Aviso de Privacidad.

CUARTA. CONSENTIMIENTO DE TITULARES.

“LA TRANSFERENTE” reconoce que ha obtenido el consentimiento correspondiente [tácito, expreso o expreso por escrito] de todos los titulares que forman parte de la base de datos transferida para que “LA RECEPTORA” pueda tratar dichos datos personales para las siguientes finalidades:

(Describir finalidad)

(Describir finalidad)

(Describir finalidad)

La Transferencia de la base de datos transferida será realizada por tiempo indefinido, salvo acuerdo particular en contrario entre “Las Partes” y de manera [exclusiva / no exclusiva], teniendo “LA RECEPTORA” derecho a utilizar la base de datos transferida para la/s finalidad/es anteriormente descrita/s, incluyendo de forma expresa, la explotación comercial de la misma.

QUINTA. LICITUD.

“LA TRANSFERENTE” garantiza a “LA RECEPTORA” que todos los datos personales incluidos en la base de datos transferida han sido obtenidos de forma lícita y conforme a la legislación vigente, prestando especial atención al cumplimiento de la normatividad de protección de datos personales aplicable. Asimismo, “El Transferente” garantiza a “LA RECEPTORA” la integridad absoluta de dichos datos personales, así como la calidad y proporcionalidad de los mismos.

SEXTA. CAMBIOS EN AVISO DE PRIVACIDAD.

“LA TRANSFERENTE” se obliga a comunicar a “LA RECEPTORA” sobre cualquier modificación que realice a su Aviso de Privacidad con una antelación de (10) días hábiles previa a dicha modificación.

SÉPTIMA. CATEGORIAS DE DATOS PERSONALES.

“Las Partes” acuerdan que la base de datos transferida contendrá las siguientes categorías de datos personales:

[Categoría de Dato personal 1]

[Categoría de Dato personal 2]

[Categoría de Dato personal 3]

OCTAVA. TRATAMIENTO.

“LA RECEPTORA” se obliga a dar tratamiento a los datos personales que le son transferidos por “El Transferente” exclusivamente para las finalidades descritas en la cláusula CUARTA del presente Convenio.

NOVENA. PÉRDIDA O FUGA DE DATOS.

“LAS PARTES” acuerdan que, en su caso, exista pérdida o fuga de los datos personales objeto del presente Convenio, ya sea por negligencia o dolo, por parte de los funcionarios, empleados, clientes o asesores de alguna de “LAS PARTES”, la parte que sufra dicha vulneración, en caso de ser legalmente necesario, deberá informar directamente a los titulares vulnerados, en los términos que exige la normatividad aplicable.

DÉCIMA. EJERCICIO DE DERECHO DE RECTIFICACIÓN O CANCELACIÓN.

“LAS PARTES” acuerdan que en caso de que ante una de ellas sea ejercido un derecho de rectificación o cancelación por parte de algún titular cuyos datos personales obren en la base de datos transferida, dicha Parte deberá hacer del conocimiento, por escrito y en un plazo máximo de (3) días hábiles contados desde la fecha en que haya recibido la petición del titular, de la otra Parte dicha solicitud de rectificación o cancelación, para que proceda a efectuarla también.

DÉCIMO PRIMERA. RECLAMOS.

“LAS PARTES” acuerdan que en caso de que se presente algún reclamo por el tratamiento de los datos personales o por realizarse una transferencia de datos personales ilícitamente y que sea distinto a lo establecido en el presente Convenio, en el aviso de privacidad o que de alguna manera viole alguna disposición contenida en de las leyes aplicables, “LA TRANSFERENTE” será responsable ante “LA RECEPTORA” por las consecuencias que se deriven de dicha transferencia.

DÉCIMO SEGUNDA.  COMUNICACIÓN ENTRE LAS PARTES.

Todas las comunicaciones, avisos y notificaciones que las partes deban hacerse con motivo de este Contrato o derivadas del mismo, deberán constar por escrito, y en los domicilios señalados en el capítulo de Declaraciones, debiendo obtener la parte que la haga, la prueba de que la comunicación fue recibida por su destinatario en el domicilio respectivo.

DÉCIMO TERCERA. JURISDICCIÓN.

En caso de controversia respecto a la interpretación, ejecución o cumplimiento del presente instrumento, las partes se someten a las leyes aplicables de [Definir] y  a la  jurisdicción  de los tribunales  competentes  de [Definir], renunciando expresamente a cualquier otra jurisdicción que pudiera corresponderles, en razón  de sus actuales o futuros domicilios, siendo notificadas y/o emplazadas en los domicilios convencionales señalados..

DÉCIMO CUARTA. ANEXOS.

Todos los Anexos del presente Convenio son parte integrante del mismo y sólo podrán ser modificados mediante convenio por escrito firmado por ambas Partes y se enumeran de la siguiente manera:

Leído que fue por las Partes el presente Contrato y enteradas de su contenido y alcance legal, lo firman por triplicado y ante la presencia de dos testigos en ____________________, el día que aparece debajo de sus firmas, reconociendo “LAS PARTES” que el presente convenio surtirá efectos a partir de la fecha de la última firma.

“LA TRANSFERENTE” | “LA RECEPTORA”
_________________________________ | _________________________________`,
    sourceLabel: GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS_SOURCE,
    docxPath: "client/grunenthal/third-party-contracts/model-contracts/cm-2-contrato-modelo-transferencia-datos-personales.docx",
    previewPdfPath: "client/grunenthal/third-party-contracts/model-contracts/cm-2-contrato-modelo-transferencia-datos-personales-preview.pdf",
    docxDownloadName: "cm-2-contrato-modelo-transferencia-datos-personales.docx",
    textDownloadName: "cm-2-contrato-modelo-transferencia-datos-personales.txt",
  },
]

export const GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS_PACKAGE = GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS.map(
  (contract) => `${contract.title}\n\n${contract.text}`,
).join("\n\n---\n\n")
