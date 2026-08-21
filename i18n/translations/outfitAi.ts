/**
 * Outfit AI feature — the outfit detail screen (app/outfit/[id].tsx) and the
 * AI Stylist generation + results screen (app/ai/generate-outfit.tsx).
 *
 * IMPORTANT: OUTFIT_OCCASIONS values from constants/garmentTaxonomy.ts
 * ('Casual', 'Formal', 'Business Casual', 'Night Out', 'Sporty', 'Vacation',
 * 'Special Event') are NOT translated here or anywhere — they are sent
 * verbatim to the generate-outfit Edge Function, which validates against
 * that exact English set. Only the surrounding UI chrome lives in this file.
 */
export const outfitAiEn = {
  detail: {
    loading: 'Retrieving Lookbook...',
    errorTitle: 'Lookbook Entry Unresolved',
    errorFallbackMessage: 'The requested look combination metadata record profile is missing.',
    fetchErrorMessage: 'An unhandled exception blocked outfit sync parsing profiles.',
    returnToWardrobe: 'Return to Wardrobe',
    undated: 'Undated',
    shareText: 'Check out my look "{{name}}" on Vyra. A curated mix of {{count}} wardrobe pieces tailored for {{occasion}}.',
    anySetting: 'any setting',
    deleteConfirmTitle: 'Deconstruct Outfit',
    deleteConfirmMessage: "Are you sure you want to permanently delete this lookbook combination? This won't remove your individual garments.",
    deleteFailedTitle: 'Delete Failed',
    deleteFailedMessage: 'An operational error dropped execution tasks.',
    piecesLabel: 'PIECES',
    occasionLabel: 'OCCASION',
    curatedLabel: 'CURATED',
    anySettingCaps: 'Any Setting',
    garmentsIncludedTitle: 'Garments Included',
    noGarmentsLinked: 'No garments linked to this composition canvas yet.',
    noImageLinked: 'No Silhouette Image Linked',
    essentialFallback: 'ESSENTIAL',
    compositionSummaryTitle: 'Composition Summary',
    primaryOccasionLabel: 'PRIMARY OCCASION',
    totalComponentsLabel: 'TOTAL COMPONENTS',
    everydayFallback: 'Everyday',
    garmentSingular: 'Garment',
    garmentPlural: 'Garments',
    editOutfitDetails: 'Edit Outfit Details',
    shareComposition: 'Share Composition',
    deleteOutfitFromCloset: 'Delete Outfit from Closet',
  },
  generateOutfit: {
    header: {
      title: 'AI Stylist',
      subtitle: 'Curated for {{occasion}}',
    },
    steps: {
      wardrobe: 'Reading your wardrobe',
      style: 'Understanding your style',
      colors: 'Selecting colors',
      combinations: 'Creating combinations',
    },
    loading: {
      title: 'Curating your look',
    },
    empty: {
      title: 'No coherent look this time',
      message: 'Vyra couldn\'t assemble a confident combination for "{{occasion}}" from your current wardrobe. Try adding a few more pieces, or generate again.',
    },
    error: {
      title: "Couldn't generate an outfit",
      genericMessage: 'Something went wrong while generating your outfit.',
      monthlyLimitTitle: "You've reached this month's limit",
      monthlyLimitMessage: "You've used all {{limit}} AI-generated outfits for this month. It resets next month — you can still build outfits manually in the meantime.",
    },
    actions: {
      generateAgain: 'Generate Again',
      tryAgain: 'Try Again',
      schedule: 'Schedule',
      saveOutfit: 'Save Outfit',
      saving: 'Saving…',
      saved: 'Saved ✓',
      setForToday: 'Set for Today ✓',
      setAsTodaysOutfit: "Set as Today's Outfit",
    },
    scores: {
      styleMatch: 'Style Match',
      weatherSuitability: 'Weather Suitability',
      occasionFit: 'Occasion Fit',
      colorHarmony: 'Color Harmony',
    },
    alerts: {
      saveFailedTitle: 'Save Failed',
      saveFailedMessage: 'Could not save this outfit.',
    },
  },
};

export const outfitAiEs = {
  detail: {
    loading: 'Recuperando look...',
    errorTitle: 'Look no encontrado',
    errorFallbackMessage: 'No se encontró la información de esta combinación de look.',
    fetchErrorMessage: 'Ocurrió un error inesperado al cargar el look.',
    returnToWardrobe: 'Volver al armario',
    undated: 'Sin fecha',
    shareText: 'Mira mi look "{{name}}" en Vyra. Una combinación de {{count}} prendas de mi armario, pensada para {{occasion}}.',
    anySetting: 'cualquier ocasión',
    deleteConfirmTitle: 'Eliminar look',
    deleteConfirmMessage: '¿Estás seguro de que deseas eliminar permanentemente esta combinación del lookbook? Esto no eliminará tus prendas individuales.',
    deleteFailedTitle: 'Error al eliminar',
    deleteFailedMessage: 'Ocurrió un error operativo que detuvo la ejecución.',
    piecesLabel: 'PRENDAS',
    occasionLabel: 'OCASIÓN',
    curatedLabel: 'CREADO',
    anySettingCaps: 'Cualquier Ocasión',
    garmentsIncludedTitle: 'Prendas Incluidas',
    noGarmentsLinked: 'Aún no hay prendas vinculadas a esta composición.',
    noImageLinked: 'Sin Imagen de Silueta',
    essentialFallback: 'ESENCIAL',
    compositionSummaryTitle: 'Resumen de la Composición',
    primaryOccasionLabel: 'OCASIÓN PRINCIPAL',
    totalComponentsLabel: 'TOTAL DE PRENDAS',
    everydayFallback: 'Diario',
    garmentSingular: 'Prenda',
    garmentPlural: 'Prendas',
    editOutfitDetails: 'Editar Detalles del Look',
    shareComposition: 'Compartir Composición',
    deleteOutfitFromCloset: 'Eliminar Look del Armario',
  },
  generateOutfit: {
    header: {
      title: 'Estilista IA',
      subtitle: 'Curado para {{occasion}}',
    },
    steps: {
      wardrobe: 'Leyendo tu armario',
      style: 'Entendiendo tu estilo',
      colors: 'Seleccionando colores',
      combinations: 'Creando combinaciones',
    },
    loading: {
      title: 'Preparando tu look',
    },
    empty: {
      title: 'Esta vez no hay un look coherente',
      message: 'Vyra no pudo armar una combinación segura para "{{occasion}}" con tu armario actual. Intenta agregar más prendas o generar de nuevo.',
    },
    error: {
      title: 'No se pudo generar un look',
      genericMessage: 'Ocurrió un error al generar tu look.',
      monthlyLimitTitle: 'Llegaste al límite de este mes',
      monthlyLimitMessage: 'Ya usaste tus {{limit}} outfits generados con IA de este mes. Se reinicia el próximo mes — mientras tanto podés seguir armando outfits manualmente.',
    },
    actions: {
      generateAgain: 'Generar de Nuevo',
      tryAgain: 'Intentar de Nuevo',
      schedule: 'Programar',
      saveOutfit: 'Guardar Look',
      saving: 'Guardando…',
      saved: 'Guardado ✓',
      setForToday: 'Programado para Hoy ✓',
      setAsTodaysOutfit: 'Usar como Look de Hoy',
    },
    scores: {
      styleMatch: 'Coincidencia de Estilo',
      weatherSuitability: 'Adecuado al Clima',
      occasionFit: 'Ajuste a la Ocasión',
      colorHarmony: 'Armonía de Colores',
    },
    alerts: {
      saveFailedTitle: 'Error al Guardar',
      saveFailedMessage: 'No se pudo guardar este look.',
    },
  },
};
