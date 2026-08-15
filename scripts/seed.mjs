#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import path from "node:path";

const ENV_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env");
try {
  process.loadEnvFile(ENV_PATH);
} catch {
  // no .env file present, rely on already-set environment variables
}

const { runMigrations } = await import("../dist/infrastructure/migrations/run-migrations.js");
const { container } = await import("../dist/container.js");
const { CreateKnowledgeCommand } = await import(
  "../dist/application/knowledge/commands/create-knowledge.command.js"
);

const CATEGORIES = [
  {
    tag: "cocina",
    namespace: "hogar",
    items: [
      ["Receta de tortilla de patatas", "con cebolla pochada, patatas cortadas finas y huevos batidos, cuajada por ambos lados a fuego medio"],
      ["Receta de gazpacho andaluz", "tomate maduro, pimiento verde, pepino, ajo, pan duro remojado y un chorro de aceite de oliva virgen extra"],
      ["Receta de paella valenciana", "pollo, conejo, garrofón y judía verde plana con azafrán, cocinada en paellera sobre fuego de leña"],
      ["Receta de croquetas de jamón", "bechamel espesa con jamón serrano picado, rebozadas en huevo y pan rallado y fritas en abundante aceite"],
      ["Receta de flan casero", "huevos, leche entera, azúcar y caramelo líquido, cocido al baño maría en el horno"],
      ["Receta de lentejas estofadas", "con chorizo, patata, zanahoria y un sofrito de cebolla y pimentón dulce"],
      ["Receta de pisto manchego", "calabacín, pimiento, cebolla y tomate pochados lentamente con aceite de oliva"],
      ["Receta de arroz con leche", "leche entera infusionada con canela en rama y piel de limón, cocida a fuego lento"],
      ["Receta de callos a la madrileña", "morro y callos de ternera guisados con chorizo, morcilla y pimentón picante"],
      ["Receta de churros con chocolate", "masa de harina escaldada, frita en aceite caliente y servida con chocolate espeso"],
    ],
  },
  {
    tag: "jardineria",
    namespace: "hogar",
    items: [
      ["Cuidado del rosal", "poda en invierno, riego moderado y abonado en primavera para favorecer la floración"],
      ["Cuidados del ficus", "luz indirecta abundante, riego cuando la tierra esté seca y evitar corrientes de aire frío"],
      ["Riego del cactus", "muy espaciado, solo cuando la tierra esté completamente seca, algo más frecuente en verano"],
      ["Poda del olivo", "a finales de invierno, eliminando ramas cruzadas y chupones del interior de la copa"],
      ["Abono para tomateras", "rico en potasio durante la floración y fructificación, aplicado cada dos semanas"],
      ["Trasplante de suculentas", "a maceta con buen drenaje y sustrato específico, dejando secar la tierra antes de regar"],
      ["Cuidado del césped en verano", "riego temprano por la mañana y siega alta para evitar que se queme con el sol"],
      ["Plagas del limonero", "vigilar la aparición de pulgón y cochinilla, y tratar con jabón potásico"],
      ["Cultivo de albahaca en maceta", "luz solar directa varias horas al día y riego regular sin encharcar"],
      ["Cuidado de orquídeas", "riego por inmersión semanal y ambiente húmedo sin luz solar directa"],
    ],
  },
  {
    tag: "mascotas",
    namespace: "hogar",
    items: [
      ["Vacunas anuales de Rex", "recordatorio de la revisión veterinaria y refuerzo de la vacuna antirrábica"],
      ["Alimentación de Micho", "pienso para gatos esterilizados, dos tomas al día y agua fresca siempre disponible"],
      ["Paseos diarios de Toby", "dos paseos, mañana y noche, de al menos treinta minutos cada uno"],
      ["Revisión veterinaria de Nube", "chequeo general y análisis de sangre anual para detectar problemas a tiempo"],
      ["Medicación para las pulgas de Coco", "pipeta mensual y collar antiparasitario durante los meses de calor"],
      ["Baño de Luna", "cada seis semanas con champú específico para pieles sensibles"],
      ["Adiestramiento de Bruno", "sesiones cortas diarias reforzando las órdenes básicas con premios"],
      ["Dieta de Simba", "control de peso con pienso light y raciones medidas dos veces al día"],
      ["Desparasitación de Kiara", "interna y externa cada tres meses según pauta del veterinario"],
      ["Cuidado dental de Max", "cepillado semanal y snacks dentales para evitar el sarro"],
    ],
  },
  {
    tag: "salud",
    namespace: "personal",
    items: [
      ["Rutina de estiramientos matutinos", "diez minutos al despertar para espalda, cuello y piernas"],
      ["Horario de vitaminas", "vitamina D en el desayuno y magnesio antes de dormir"],
      ["Ejercicios para la espalda", "rutina de fortalecimiento lumbar recomendada por el fisioterapeuta"],
      ["Control de tensión arterial", "medición semanal en ayunas y registro en la libreta de seguimiento"],
      ["Revisión dental semestral", "limpieza y chequeo cada seis meses en la clínica habitual"],
      ["Horas de sueño recomendadas", "mantener entre siete y ocho horas, evitando pantallas antes de dormir"],
      ["Control de glucosa", "medición diaria en ayunas según pauta médica"],
      ["Rutina de hidratación", "al menos dos litros de agua repartidos a lo largo del día"],
      ["Revisión oftalmológica anual", "control de la vista y renovación de la graduación de las gafas"],
      ["Sesiones de fisioterapia", "dos veces por semana para la recuperación del hombro"],
    ],
  },
  {
    tag: "tecnologia",
    namespace: "trabajo",
    items: [
      ["Configuración del router doméstico", "cambio de la contraseña por defecto y actualización del firmware"],
      ["Copias de seguridad del portátil", "backup semanal automático en disco externo y en la nube"],
      ["Actualización del firmware de la impresora", "revisar la web del fabricante cada pocos meses"],
      ["Gestión de contraseñas", "uso de gestor de contraseñas con autenticación de dos factores"],
      ["Configuración de VPN", "conexión segura para acceder a la red de la oficina desde casa"],
      ["Mantenimiento del servidor doméstico", "reinicio programado y limpieza de logs antiguos"],
      ["Copia de seguridad del móvil", "sincronización semanal de fotos y contactos en la nube"],
      ["Actualización del antivirus", "revisión de que las definiciones estén al día en todos los equipos"],
      ["Configuración del correo corporativo", "reglas de filtrado y firma automática"],
      ["Organización de archivos en la nube", "estructura de carpetas por proyecto y cliente"],
    ],
  },
  {
    tag: "viajes",
    namespace: "personal",
    items: [
      ["Itinerario por la Toscana", "ruta de una semana entre Florencia, Siena y San Gimignano"],
      ["Documentos para viajar a Japón", "pasaporte en vigor, visado turístico y seguro de viaje"],
      ["Lista de equipaje para la playa", "protector solar, bañadores, toalla y sandalias"],
      ["Reserva de hotel en Lisboa", "confirmación para tres noches en el barrio de Alfama"],
      ["Ruta de senderismo por los Picos de Europa", "etapa de dificultad media con buena señalización"],
      ["Alquiler de coche en Mallorca", "recogida en el aeropuerto y seguro a todo riesgo"],
      ["Presupuesto para el viaje a Nueva York", "vuelos, alojamiento y comidas estimadas"],
      ["Vacunas recomendadas para viajar a Kenia", "fiebre amarilla y profilaxis de malaria"],
      ["Lista de comprobación antes de volar", "pasaporte, tarjetas de embarque y cargador de móvil"],
      ["Guía de transporte público en Roma", "abono turístico para metro y autobús"],
    ],
  },
  {
    tag: "finanzas",
    namespace: "personal",
    items: [
      ["Presupuesto mensual del hogar", "reparto de gastos fijos, variables y ahorro"],
      ["Seguimiento de gastos de la tarjeta", "revisión semanal de los movimientos bancarios"],
      ["Plan de ahorro para vacaciones", "aportación mensual fija a la cuenta de ahorro"],
      ["Renovación del seguro del coche", "comparar ofertas antes de la fecha de vencimiento"],
      ["Declaración de la renta", "recopilar los justificantes antes de la campaña anual"],
      ["Revisión de suscripciones", "cancelar las que no se usan para reducir gastos fijos"],
      ["Fondo de emergencia", "objetivo de ahorro equivalente a seis meses de gastos"],
      ["Comparativa de hipotecas", "revisar condiciones antes de renovar el préstamo"],
      ["Plan de pensiones", "aportación periódica para la jubilación"],
      ["Control de facturas del hogar", "luz, agua y gas revisadas cada mes"],
    ],
  },
  {
    tag: "bricolaje",
    namespace: "hogar",
    items: [
      ["Reparación de la persiana", "cambio de la cinta y engrase del mecanismo"],
      ["Montaje del armario de Ikea", "seguir el manual paso a paso y usar las herramientas incluidas"],
      ["Pintura de la fachada", "lijado previo y dos manos de pintura resistente a la intemperie"],
      ["Instalación de estanterías", "nivelar bien y usar tacos adecuados para pared de ladrillo"],
      ["Cambio de la cisterna del baño", "sustitución del mecanismo de descarga por uno nuevo"],
      ["Sellado de ventanas", "silicona nueva para evitar corrientes de aire en invierno"],
      ["Reparación del grifo de la cocina", "cambio de la junta que provocaba el goteo"],
      ["Colocación de suelo laminado", "con lámina aislante debajo para amortiguar el ruido"],
      ["Instalación de un enchufe nuevo", "con el diferencial desconectado por seguridad"],
      ["Barnizado de la puerta de madera", "lijado fino y dos capas de barniz protector"],
    ],
  },
  {
    tag: "libros",
    namespace: "personal",
    items: [
      ["Resumen de Cien años de soledad", "la saga de los Buendía en el pueblo de Macondo"],
      ["Notas sobre El Quijote", "las aventuras de Don Quijote y Sancho Panza por la Mancha"],
      ["Reseña de 1984 de Orwell", "la vigilancia del Gran Hermano y la reescritura de la historia"],
      ["Apuntes de Rayuela", "la estructura no lineal de la novela de Cortázar"],
      ["Resumen de La sombra del viento", "el misterio del cementerio de los libros olvidados"],
      ["Notas de Crónica de una muerte anunciada", "el relato coral del asesinato anunciado"],
      ["Reseña de Fahrenheit 451", "una sociedad que quema los libros para evitar el pensamiento crítico"],
      ["Apuntes de La casa de los espíritus", "la saga familiar de Isabel Allende"],
      ["Resumen de El amor en los tiempos del cólera", "la espera de Florentino Ariza durante décadas"],
      ["Notas de Pedro Páramo", "el pueblo fantasma de Comala y sus voces"],
    ],
  },
  {
    tag: "trabajo",
    namespace: "trabajo",
    items: [
      ["Actas de la reunión semanal", "resumen de los temas tratados y las tareas asignadas"],
      ["Plan de proyecto del cliente X", "fases, plazos y responsables de cada entregable"],
      ["Checklist de onboarding", "pasos para dar de alta a un nuevo empleado en el equipo"],
      ["Notas de la entrevista técnica", "puntos fuertes y débiles del candidato evaluado"],
      ["Objetivos del trimestre", "metas del equipo alineadas con la estrategia general"],
      ["Seguimiento de tareas pendientes", "lista priorizada de lo que queda por cerrar esta semana"],
      ["Notas de la retrospectiva del sprint", "qué funcionó bien y qué se puede mejorar"],
      ["Plan de formación del equipo", "cursos recomendados para el próximo semestre"],
      ["Resumen de la auditoría interna", "hallazgos principales y acciones correctivas"],
      ["Calendario de vacaciones del equipo", "turnos repartidos para cubrir todo el verano"],
    ],
  },
];

function buildEntries() {
  const entries = [];
  for (const category of CATEGORIES) {
    for (const [title, detail] of category.items) {
      entries.push({
        title,
        tag: category.tag,
        namespace: category.namespace,
        summary: `${title} — apunte breve para consulta rápida.`,
        content: `${title}: ${detail}.`,
        version: 1,
        active: true,
      });
    }
  }
  return entries;
}

async function main() {
  await runMigrations();

  const createCommand = new CreateKnowledgeCommand(container.knowledgeRepository);

  const entries = buildEntries();
  console.log(`Insertando ${entries.length} entradas de prueba...`);

  for (const [index, entry] of entries.entries()) {
    const created = await createCommand.execute(entry);
    console.log(`${index + 1}/${entries.length} -> [${created.tag}] ${created.title}`);
  }

  console.log("Listo.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error insertando datos de prueba:", error);
    process.exit(1);
  });
