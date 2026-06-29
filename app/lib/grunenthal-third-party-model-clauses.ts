export type GrunenthalThirdPartyModelClause = {
  id: string
  title: string
  category: string
  text: string
  sourceLabel: string
  isCustom?: boolean
}

export {
  GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS,
  GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS_PACKAGE,
  GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS_SOURCE,
  type GrunenthalThirdPartyModelContract,
} from "./grunenthal-third-party-model-contracts"

export const GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_SOURCE =
  "Manual de Relaciones con Terceros de Grünenthal, Apéndice 1. Cláusulas modelo de protección de datos personales"

export const GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES: GrunenthalThirdPartyModelClause[] = [
  {
    id: "grunenthal-clause-c1-encargados",
    title: "C.1 Cláusula modelo para regular las comunicaciones de datos personales Encargados del Tratamiento",
    category: "Comunicación a Encargado",
    sourceLabel: GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_SOURCE,
    text: `Protección de Datos Personales. “LAS PARTES” reconocen que, para cumplir con los Servicios descritos en el presente Contrato, “EL PROVEEDOR” tendrá acceso a [Señalar datos a los que se tendrá acceso con motivo de los Servicios] concernientes a [Señalar tipos de Titulares a los que corresponden los datos] información que constituye, en términos de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares del 20 de marzo de 2025 (“LFPDPPP”), datos personales propiedad de “GRÜNENTHAL”. En relación con dichos datos personales, GRÜNENTHAL adquirirá la condición de Responsable, mientras que “EL PROVEEDOR” adquirirá la condición de “Persona Encargada” o “Encargado, lo cual significa, entre otras cosas, que la totalidad de los datos personales son propiedad exclusiva de “GRÜNENTHAL”, y “EL PROVEEDOR” solamente actuará bajo las instrucciones de “GRÜNENTHAL” para todos los efectos previstos en la LFPDPPP.

En cumplimiento al principio de información previsto en el artículo 14 de la LFPDPPP, “GRÜNENTHAL” reconoce que ha informado a los Titulares a través de su Aviso de Privacidad sobre el Tratamiento que realizará “EL PROVEEDOR”.

“El PROVEEDOR”, en su condición de Persona Encargada del tratamiento, sólo podrá tratar los datos personales a los que tenga acceso durante la prestación de servicios objeto del presente Contrato para cumplir con lo estipulado en el presente instrumento y el Aviso de Privacidad de “GRÜNENTHAL”, por lo que no los aplicará o utilizará con fin distinto al que figura en el presente, ni los transferirá, ni siquiera para su conservación, a otras personas, salvo en el caso de que “GRÜNENTHAL” así lo determine y autorice, la remisión derive de una subcontratación previamente autorizada por “GRÜNENTHAL” para que “EL PROVEEDOR” pueda llevar a cabo el objeto del presente Contrato, o cuando así lo requiera la autoridad competente.

“EL PROVEEDOR” reconoce que “GRÜNENTHAL” ha puesto a su disposición el Aviso de Privacidad aplicable al tratamiento, mismo que se encuentra disponible en https://www.latam.grunenthal.com/es-mx/footer-links/declaracion-de-privacidad y que en dicho documento se encuentran previstas las finalidades que dan origen al tratamiento de datos personales.

“El PROVEEDOR” está obligado a cumplir con la seguridad de los datos personales, para lo cual deberá tomar en cuenta las categorías y volumen de datos personales, el estado de la técnica, mejores prácticas de seguridad integral y los costos de aplicación de acuerdo con la naturaleza, alcance, contexto y los fines del tratamiento, así como identificar la probabilidad de riesgos.

“El PROVEEDOR” deberá incluir, entre otras medidas, las siguientes; 1) Medidas de anonimización, seudonomización o cifrado de datos personales; 2) Medidas dirigidas a mantener la confidencialidad, integridad y disponibilidad permanentes de los sistemas y servicios del tratamiento de datos personales y el acceso a los datos personales, de forma rápida en caso de incidentes; y 3) Medidas dirigidas a mejorar la resiliencia técnica, física, administrativa, y jurídica.

“El PROVEEDOR”, se obliga a guardar confidencialidad respecto de los datos personales. Lo anterior, incluye la obligación de que “EL PROVEEDOR” celebre y mantenga vigentes convenios de confidencialidad con todas las personas, empleados propios y de terceros, que tengan acceso a los datos personales.

Una vez cumplida la prestación de servicios pactada y cuando ya no sean necesarios para continuar con el encargo realizado, los datos personales serán suprimidos por “EL PROVEEDOR”, salvo que “GRÜNENTHAL” le notifique por escrito que le haga la devolución de estos, al igual que cualquier soporte o documentos en que conste algún dato personal objeto del tratamiento.

“El PROVEEDOR” se obliga, en caso de sufrir alguna vulneración de seguridad que pudiere afectar la confidencialidad, la integridad o la disponibilidad de los Datos Personales, a informar a “GRÜNENTHAL” respecto de lo ocurrido. La notificación a “GRÜNENTHAL” deberá realizarse en un plazo máximo de 24 horas, contadas a partir de que se tuvo conocimiento de la vulneración, a la siguiente cuenta de correo [señalar medio para notificar].

Las Partes reconoce que es responsabilidad exclusiva de “GRÜNENTHAL” atender los derechos de acceso, rectificación, cancelación, oposición, limitación y/o divulgación de datos y revocación del consentimiento de los Titulares ("Derechos"). Cuando los Titulares ejerzan alguno de los Derechos ante “EL PROVEEDOR”, este lo comunicará a “GRÜNENTHAL” por correo electrónico a la dirección [señalar medio para notificar] dentro de las 24 horas siguientes a la recepción de la solicitud por parte del Titular.

En relación con las subcontrataciones que “El PROVEEDOR” realice para cumplir con el objeto del presente Contrato se aplicará lo siguiente: a) “GRÜNENTHAL” autoriza a “El PROVEEDOR” a subcontratar a terceros para la prestación de servicios relacionados con el tratamiento y protección de los datos personales, siempre que dichos subcontratistas asuman, mediante contrato por escrito, obligaciones de protección de datos equivalentes a las establecidas en el presente instrumento. Para tal efecto, “EL PROVEEDOR” se obliga a informar a “GRÜNENTHAL”, la identidad de los subcontratistas utilizados y la descripción de los servicios subcontratados; b) “EL PROVEEDOR” se obliga a verificar que cualquier tercero subcontratado cumpla con las obligaciones previstas en este instrumento, y c) “EL PROVEEDOR” será responsable frente a “GRÜNENTHAL” por cualquier incumplimiento en que incurran los subcontratistas respecto de las obligaciones de protección de datos personales.

En el supuesto de que “EL PROVEEDOR”, para cumplir con los servicios objeto del presente Contrato, requiera adherirse a servicios de nube ofrecidos por terceros, será condición necesaria para que pueda adherirse a estos que: (i) Se otorgue por parte de GRÜNENTHAL la autorización de subcontratación en los términos establecidos en el presente Contrato; (ii) que “EL PROVEEDOR” verifique que los terceros subcontratados cumplen con todas las obligaciones previstas en la normatividad aplicable y (iii) que “EL PROVEEDOR” cumpla con las obligaciones que se le han impuesto en la presente cláusula para aquellas subcontrataciones que realice.

“GRÜNENTHAL” podrá llevar a cabo por sí, o a través de terceros, durante la vigencia del presente Contrato, auditorías y revisiones periódicas a “EL PROVEEDOR” para comprobar el correcto cumplimiento de obligaciones previstas en la normatividad aplicable de protección de datos personales en cuyo caso los costos relacionados con dichas auditorias serán a cargo de “GRÜNENTHAL”, siempre y cuando no existan inconsistencias en las mismas. Para dicho fin, “EL PROVEEDOR” se compromete a presentar los documentos e información relacionados con los Servicios que requieran las personas que lleven a cabo la auditoría, así como a responder las preguntas que estas le formulen. Las auditorias que se lleven a cabo conforme a lo establecido en la presente, deberán notificarse por escrito a “EL PROVEEDOR” con por lo menos 3 (tres) días hábiles de anticipación, señalando cual será el objeto de esta.

En el supuesto de incumplimiento, por parte de “EL PROVEEDOR”, incluidos sus empleados, de sus obligaciones según lo establecido en la presente Cláusula o de las derivadas de la legislación aplicable en materia de protección de datos personales para el Persona Encargada del Tratamiento, “El PROVEEDOR” será considerado Responsable del tratamiento. De igual forma, las Partes acuerdan que en caso de que se presente algún reclamo por el tratamiento de los datos personales o su transferencia que efectúe “EL PROVEEDOR” y que sea distinto a lo establecido en el presente documento, Pedidos o Anexos, en el aviso de privacidad señalado en esta cláusula o que de alguna manera viole alguna disposición contenida en de las leyes aplicables, “EL PROVEEDOR” deberá indemnizar a “GRÜNENTHAL” al 100% (cien por ciento) de cualquier monto que este último tenga que pagar por multas y/o indemnizaciones, derivadas de procesos administrativos, civiles o transacciones que resuelvan el o los reclamos correspondientes.`,
  },
  {
    id: "grunenthal-clause-c2-transferencias",
    title: "C.2 Cláusula modelo para regular las Transferencias de Datos Personales",
    category: "Comunicación a Terceros",
    sourceLabel: GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_SOURCE,
    text: `Transferencia de datos personales. La presente cláusula tiene por objeto establecer las reglas conforme a las cuales se llevará a cabo la transferencia de la Base de Datos [especificar] (en adelante, “la Base de Datos Transferida”) en posesión de “EL TRANSFERENTE” a “EL RECEPTOR”. “EL TRANSFERENTE” declara que es titular y responsable de la Base de Datos Transferida. En virtud de que “EL TRANSFERENTE” es un Responsable establecido en territorio mexicano, el tratamiento que se le dé a la Base de Datos estará sujeto a lo establecido la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (“LFPDPPP”), publicada el 20 de marzo de 2025.

1. Puesta a disposición del Aviso de Privacidad. “EL TRANSFERENTE” reconoce que ha informado a todos los titulares de los datos personales contenidos en la Base de Datos Transferida sobre la transferencia que realizará a “EL RECEPTOR” en el apartado de Transferencias de su Aviso de Privacidad, y también reconoce que cuenta con una base de legitimación adecuada para realizar la transferencia a “EL RECEPTOR”. “EL TRANSFERENTE” reconoce que el Aviso de Privacidad que se ha puesto a disposición de los titulares es el que se adjunta al presente como Anexo [*] y que esta transferencia, por tanto, está claramente definida y consentida en su caso en el mencionado Aviso de Privacidad en los términos requeridos por la LFPDPPP.

2. Fines del tratamiento. De acuerdo con lo dispuesto en el Aviso de Privacidad, “EL RECEPTOR” podrá tratar los datos personales para las siguientes finalidades, que fueron consentidas por los titulares de los datos personales: [LISTADO DE FINALIDADES DE ACUERDO CON LO PREVISTO EN EL AVISO DE PRIVACIDAD ANEXADO]

3. Obligaciones de EL TRANSFERENTE. Al transferir a “EL RECEPTOR” la base de datos personales mencionada “EL TRANSFERENTE” se obliga a: a) Obtener los datos de forma lícita y conforme a la legislación vigente, prestando especial atención al cumplimiento de la normatividad aplicable, garantizando la integridad absoluta de dichos datos personales, así como la calidad y proporcionalidad de los mismos; b) indemnizar y sacar en paz y a salvo a “EL RECEPTOR” en contra de cualquier reclamación que le hiciere cualquier titular, cuyos datos personales se encuentren en la base de datos transferida, argumentando que la transferencia se llevó a cabo sin habérsele informado y/o sin haber obtenido su consentimiento; c). “EL TRANSFERENTE” asumirá la responsabilidad que pudiere irrogarse a “EL RECEPTOR” como consecuencia de cualquier tipo de sanciones administrativas impuestas por las autoridades correspondientes, así como los daños y perjuicios por procedimientos judiciales o extrajudiciales contra “EL RECEPTOR” (incluidas las costas de resolución y los honorarios razonables de abogado), considerándose asimismo causa específica de recisión anticipada del presente instrumento.

4. Obligaciones del Receptor de la Transferencia. Asimismo, “EL RECEPTOR” en su carácter de responsable del Tratamiento se obliga a: Dar tratamiento a los datos personales que le son transferidos por “EL TRANSFERENTE” en términos del presente instrumento y las finalidades contenidas en el Aviso de Privacidad adjunto al presente como Anexo [*]”, así como a las disposiciones contenidas en la normatividad aplicable; Poner a disposición de los titulares su Aviso de Privacidad, y Abstenerse de transferir a terceros los datos personales de la base de datos transferida, salvo que cuente con el consentimiento de los titulares.

5. Confidencialidad de los datos personales. Las Partes se obligan a conservar la confidencialidad de los datos personales objeto del presente instrumento, y deberán aplicar todas las medidas de seguridad que resulten necesarias al efecto. Entre otras, “LAS PARTES” deberán celebrar y mantener vigentes convenios de confidencialidad con todas las personas, empleados propios y proveedores, que tengan acceso a los datos personales referidos.

6. Responsabilidad de las Partes. En caso de que los datos personales llegaren a hacerse del conocimiento de terceras personas por dolo, negligencia o mala fe imputable a una de las partes y/o de sus filiales, contratistas, subcontratistas o sus proveedores, dicha Parte será responsable de los daños y perjuicios que se ocasionen a la otra parte / afectada, sin perjuicio de las responsabilidades y sanciones legales que deriven.`,
  },
  {
    id: "grunenthal-clause-c3-no-aplicacion",
    title: "C.3 Cláusula modelo de no aplicación de la normatividad",
    category: "No aplicación de la normatividad",
    sourceLabel: GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_SOURCE,
    text: `NO TRATAMIENTO DE DATOS PERSONALES. Las Partes reconocen que, derivado de la presente relación jurídica, sólo tratarán información relacionada con personas morales, así como otra información que la Ley Federal de Protección de Datos Personales en Posesión de Particulares (LFPDPPP) y demás normativa secundaria establece como información o datos no personales. Por lo anterior, las Partes se obligan a no transferir entre ellas datos adicionales que sean objeto de protección de la LFPDPPP y demás legislación aplicable y vigente en la materia, y, en ese sentido, se obliga a mantener en paz y a salvo a la contraparte de cualquier queja, denuncia o reclamación que derive del incumplimiento respecto a la transferencia de datos personales.

Ambas partes reconocen que por algún motivo del presente contrato, una de las partes transfiere información anonimizada que no permite identificación directa o indirecta de personas físicas, la parte que reciba información se obliga a abstenerse de realizar cualquier acción o esfuerzo dirigido a la reidentificación de personas, garantizando en todo momento que el tratamiento de la información se limite a datos anónimos que no estén asociados, directa o indirectamente, a personas físicas identificadas o identificables Asimismo, y sin perjuicio de lo anterior, la Parte receptora adoptará medidas de seguridad técnicas, administrativas y físicas razonables y proporcionales al riesgo, a fin de preservar la confidencialidad, integridad y disponibilidad de la información, e impedirá su divulgación a terceros no autorizados, salvo que dicha divulgación sea estrictamente necesaria para la prestación de los Servicios o exigida por una disposición legal o autoridad competente En caso de tratar algún dato diferente a los mencionados y/o con alguna finalidad distinta a la establecida se incurrirá en las correspondientes responsabilidades legales.`,
  },
  {
    id: "grunenthal-clause-c4-laboral",
    title:
      "C.4 Cláusula modelo de aceptación del Aviso de Privacidad y Obligaciones en Materia de Protección de Datos Personales en el Contrato Laboral",
    category: "Contrato Laboral",
    sourceLabel: GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_SOURCE,
    text: `ACEPTACIÓN DEL AVISO DE PRIVACIDAD Y OBLIGACIONES EN MATERIA DE PROTECCIÓN DE DATOS PERSONALES. “El EMPLEADO” reconoce que “LA EMPRESA” ha puesto a su disposición el Aviso de Privacidad para Colaboradores, mismo que se encuentra disponible en [SEÑALAR DONDE SE ENCONTRARÁ DISPONIBLE EL AVISO DE PRIVACIDAD] y que ha sido debidamente informado sobre las condiciones generales del tratamiento al que serán sometidos sus datos personales. Asimismo, “EL EMPLEADO” reconoce que “LA EMPRESA” ha puesto a su disposición la Carta de Protección de Datos Personales y Políticas aplicables, por lo que el EMPLEADO se obliga a cumplir con lo establecido en dichos documentos y declara que ha sido informado que cualquier incumplimiento a las obligaciones de protección de datos personales podrá será sancionado por “LA EMPRESA”.`,
  },
]

export const GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_PACKAGE = GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES.map(
  (clause) => `${clause.title}\n\n${clause.text}`,
).join("\n\n---\n\n")
