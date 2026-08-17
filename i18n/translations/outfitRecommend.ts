/**
 * Recommend outfit for today (app/outfit/recommend-today.tsx) — ranks the
 * user's ALREADY-SAVED outfits by how well they fit today's real weather
 * (see lib/services/outfitWeatherRecommendation.ts). Deliberately a separate
 * namespace from outfitAi.ts's generateOutfit.* copy: this screen never
 * generates anything with AI, it only re-ranks outfits the user already
 * built, so it needed its own non-"AI Stylist" voice.
 */
export const outfitRecommendEn = {
  header: {
    title: 'Recommend for Today',
    subtitleWithWeather: '{{temp}}°, {{condition}} today',
    subtitleNoWeather: 'Your saved outfits',
  },
  fit: {
    great: 'Great match',
    good: 'Good match',
    off: 'Might not be ideal',
  },
  weatherMatchLabel: 'Weather Match',
  noWeatherNote: "We couldn't get today's weather — showing your saved outfits instead.",
  loading: 'Finding your best options…',
  empty: {
    title: 'No saved outfits yet',
    message: "You don't have any saved outfits to recommend from. Build one first, or let the AI Stylist create one for you.",
    generateWithAi: 'Generate with AI Stylist',
  },
  errorFallback: 'Something went wrong loading your outfits.',
  actions: {
    useThisOutfit: 'Use This Outfit',
    settingForToday: 'Setting for Today…',
    setForToday: 'Set for Today ✓',
  },
  alerts: {
    setFailedTitle: 'Could Not Set Outfit',
    setFailedMessage: 'Could not set this outfit for today.',
  },
};

export const outfitRecommendEs = {
  header: {
    title: 'Recomendar para Hoy',
    subtitleWithWeather: '{{temp}}°, {{condition}} hoy',
    subtitleNoWeather: 'Tus outfits guardados',
  },
  fit: {
    great: 'Gran opción',
    good: 'Buena opción',
    off: 'Puede no ser ideal',
  },
  weatherMatchLabel: 'Compatibilidad con el Clima',
  noWeatherNote: 'No pudimos obtener el clima de hoy — mostrando tus outfits guardados.',
  loading: 'Buscando tus mejores opciones…',
  empty: {
    title: 'Aún no tienes outfits guardados',
    message: 'No tienes outfits guardados para recomendar. Arma uno primero, o dejá que el Estilista IA cree uno por vos.',
    generateWithAi: 'Generar con Estilista IA',
  },
  errorFallback: 'Ocurrió un error al cargar tus outfits.',
  actions: {
    useThisOutfit: 'Usar Este Outfit',
    settingForToday: 'Programando para hoy…',
    setForToday: 'Programado para Hoy ✓',
  },
  alerts: {
    setFailedTitle: 'No se Pudo Asignar el Outfit',
    setFailedMessage: 'No se pudo asignar este outfit para hoy.',
  },
};
