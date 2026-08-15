#!/usr/bin/env node
// Search-quality regression battery. Not a unit test (the project has none configured yet — see
// CLAUDE.md) — it exercises the real container/repository against whatever DB_ENGINE is active,
// so it needs actual data (see scripts/seed.mjs) and a working embedding service.
import { fileURLToPath } from "node:url";
import path from "node:path";

const ENV_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env");
try {
  process.loadEnvFile(ENV_PATH);
} catch {
  // no .env file present, rely on already-set environment variables
}

const { container } = await import("../dist/container.js");
const { SearchKnowledgeQuery } = await import("../dist/application/knowledge/queries/search-knowledge.query.js");

const searchQuery = new SearchKnowledgeQuery(container.knowledgeRepository);

const TESTS = [
  // --- Spanish: should find a specific title ---
  { q: "receta de tortilla de patatas", expect: "Receta de tortilla de patatas" },
  { q: "paella", expect: "Receta de paella valenciana" },
  { q: "cómo hacer churros", expect: "Receta de churros con chocolate" },
  { q: "postre con leche y canela", expect: "Receta de arroz con leche" },
  { q: "cuidado de cactus", expect: "Riego del cactus" },
  { q: "poda de olivos", expect: "Poda del olivo" },
  { q: "plagas del limonero", expect: "Plagas del limonero" },
  { q: "abono para tomates", expect: "Abono para tomateras" },
  { q: "vacunas del perro", expect: "Vacunas anuales de Rex" },
  { q: "alimentación del gato", expect: "Alimentación de Micho" },
  { q: "pulgas", expect: "Medicación para las pulgas de Coco" },
  { q: "paseo diario del perro", expect: "Paseos diarios de Toby" },
  { q: "ejercicios de espalda", expect: "Ejercicios para la espalda" },
  { q: "control de tensión arterial", expect: "Control de tensión arterial" },
  { q: "horas de sueño", expect: "Horas de sueño recomendadas" },
  { q: "vitaminas", expect: "Horario de vitaminas" },
  { q: "configurar el router", expect: "Configuración del router doméstico" },
  { q: "copia de seguridad del portátil", expect: "Copias de seguridad del portátil" },
  { q: "contraseñas seguras", expect: "Gestión de contraseñas" },
  { q: "conexión VPN", expect: "Configuración de VPN" },
  { q: "viaje a Japón", expect: "Documentos para viajar a Japón" },
  { q: "ruta de senderismo", expect: "Ruta de senderismo por los Picos de Europa" },
  { q: "equipaje de playa", expect: "Lista de equipaje para la playa" },
  { q: "alquiler de coche en vacaciones", expect: "Alquiler de coche en Mallorca" },
  { q: "presupuesto del hogar", expect: "Presupuesto mensual del hogar" },
  { q: "declaración de la renta", expect: "Declaración de la renta" },
  { q: "ahorro para vacaciones", expect: "Plan de ahorro para vacaciones" },
  { q: "reparar el grifo que gotea", expect: "Reparación del grifo de la cocina" },
  { q: "montar un armario de Ikea", expect: "Montaje del armario de Ikea" },
  { q: "Cien años de soledad", expect: "Resumen de Cien años de soledad" },
  { q: "novela distópica de Orwell", expect: "Reseña de 1984 de Orwell" },
  { q: "libro de Cortázar", expect: "Apuntes de Rayuela" },
  { q: "reunión semanal del equipo", expect: "Actas de la reunión semanal" },
  { q: "entrevista de trabajo", expect: "Notas de la entrevista técnica" },
  { q: "retrospectiva del sprint", expect: "Notas de la retrospectiva del sprint" },
  { q: "control de plagas", expect: "Plagas del limonero" },
  { q: "horarios de equipo", expect: "Calendario de vacaciones del equipo" },

  // --- Spanish: should find nothing (no matching content in the corpus) ---
  { q: "unicornios voladores en marte", expectNone: true },
  { q: "partido de fútbol de ayer", expectNone: true },
  { q: "receta de sushi japonés", expectNone: true },
  { q: "concierto de rock en directo", expectNone: true },
  { q: "arquitectura de software", expectNone: true },

  // --- English: cross-lingual search against the Spanish corpus ---
  { q: "pet flea medication", expect: "Medicación para las pulgas de Coco" },
  { q: "documents needed to travel to japan", expect: "Documentos para viajar a Japón" },
  { q: "chocolate churros recipe", expect: "Receta de churros con chocolate" },
  { q: "monthly household budget", expect: "Presupuesto mensual del hogar" },
  { q: "how to fix a leaking tap", expect: "Reparación del grifo de la cocina" },
];

let correct = 0;
const fails = [];
for (const test of TESTS) {
  const results = await searchQuery.execute(test.q, 10);
  const titles = results.map((r) => r.title.toLowerCase());
  const pass = test.expectNone ? titles.length === 0 : titles.includes(test.expect.toLowerCase());
  if (pass) correct += 1;
  else fails.push({ q: test.q, expect: test.expect ?? "NONE", got: titles });
}

console.log(`${correct}/${TESTS.length} correctas\n`);
for (const fail of fails) {
  console.log(`FALLO "${fail.q}" -> esperaba [${fail.expect}], obtuvo [${fail.got.join(" | ") || "nada"}]`);
}

process.exit(fails.length > 0 ? 1 : 0);
