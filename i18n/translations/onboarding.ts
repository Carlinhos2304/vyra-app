/**
 * Onboarding flow copy — welcome, features, personalization, first-garment,
 * ai-preview, and planner screens (app/onboarding/*.tsx). Shared button
 * labels (Next/Back/Skip/Continue/etc.) live in common.ts and are reused via
 * `t('common.X')` rather than duplicated here.
 */
export const onboardingEn = {
  index: {
    loadingLabel: 'Evaluating profile parameters...',
  },
  welcome: {
    title: 'Welcome to Vyra',
    subtitle: 'Organize your wardrobe effortlessly.',
    getStarted: 'Get Started',
  },
  features: {
    title: 'Create beautiful outfits',
    subtitle: 'Build looks from your own wardrobe in seconds.',
  },
  personalization: {
    heading: "Let's personalize your wardrobe.",
    styleSectionTitle: 'Favorite Style',
    colorsSectionTitle: 'Favorite Colors',
    climateSectionTitle: 'Climate Zone',
    notificationsTitle: 'Smart Notifications',
    notificationsSubtitle: 'Event reminders, daily outfit suggestions, and AI tips based on your closet.',
    // Keys match the English ids stored in profiles.favorite_colors/climate
    // exactly (see app/onboarding/personalization.tsx's COLOR_OPTIONS/
    // CLIMATE_OPTIONS) — only the displayed chip label is translated, the
    // same "id stays English, label gets translated" rule STYLE_OPTIONS and
    // the gender selects already follow elsewhere in this app.
    colorOptions: {
      Monochrome: 'Monochrome',
      'Warm Stone': 'Warm Stone',
      'Sage Green': 'Sage Green',
      'Navy Ocean': 'Navy Ocean',
      Crimson: 'Crimson',
      'Camel Tan': 'Camel Tan',
    },
    climateOptions: {
      'Mostly Hot': 'Mostly Hot',
      Mixed: 'Mixed',
      'Mostly Cold': 'Mostly Cold',
    },
    saveButton: 'Save Preferences',
    loadingLabel: 'Serializing curation attributes...',
    incompleteAlertTitle: 'Personalization Partial',
    incompleteAlertMessage: 'Please select style, climate and at least one core color.',
    noUserError: 'Unassigned identity context tracking coordinates.',
    syncFaultAlertTitle: 'Sync Fault',
    syncFaultAlertFallback: 'Could not serialize setup matrices to public profiles endpoints.',
  },
  firstGarment: {
    title: "Let's build your wardrobe",
    subtitle: 'Start by adding your first garment.',
    aiNote: "Vyra's AI will automatically detect its category, color, and style.",
    addButton: 'Add First Garment',
    loadingLabel: 'Committing archival access parameters...',
    noSessionError: 'Session authentication missing context parameters.',
    blockedAlertTitle: 'Finalization Blocked',
    blockedAlertFallback: 'Could not close out sequence safely.',
  },
  aiPreview: {
    activeBadge: 'LIVE NOW',
    title: 'Meet your AI stylist',
    subtitle: 'Vyra already suggests a full outfit every day, generates new looks from your closet, and analyzes every garment you add — all personalized to your wardrobe, the weather, and your calendar.',
    example: 'For example: "Your daily outfit is ready — try pairing your navy blazer with the beige trousers."',
  },
  planner: {
    title: 'Plan what to wear',
    subtitle: "Schedule outfits directly from your calendar — Vyra's AI can even suggest one automatically before big events.",
  },
};

export const onboardingEs = {
  index: {
    loadingLabel: 'Evaluando parámetros del perfil...',
  },
  welcome: {
    title: 'Bienvenido a Vyra',
    subtitle: 'Organiza tu armario sin esfuerzo.',
    getStarted: 'Comenzar',
  },
  features: {
    title: 'Crea looks increíbles',
    subtitle: 'Arma looks con tu propio armario en segundos.',
  },
  personalization: {
    heading: 'Personalicemos tu armario.',
    styleSectionTitle: 'Estilo favorito',
    colorsSectionTitle: 'Colores favoritos',
    climateSectionTitle: 'Zona climática',
    notificationsTitle: 'Notificaciones inteligentes',
    notificationsSubtitle: 'Recordatorios de eventos, sugerencias diarias de outfit y consejos de IA según tu clóset.',
    colorOptions: {
      Monochrome: 'Monocromático',
      'Warm Stone': 'Piedra Cálida',
      'Sage Green': 'Verde Salvia',
      'Navy Ocean': 'Azul Marino',
      Crimson: 'Carmesí',
      'Camel Tan': 'Camel',
    },
    climateOptions: {
      'Mostly Hot': 'Mayormente Cálido',
      Mixed: 'Mixto',
      'Mostly Cold': 'Mayormente Frío',
    },
    saveButton: 'Guardar preferencias',
    loadingLabel: 'Serializando atributos de curación...',
    incompleteAlertTitle: 'Personalización incompleta',
    incompleteAlertMessage: 'Selecciona un estilo, un clima y al menos un color principal.',
    noUserError: 'Contexto de identidad sin coordenadas de seguimiento asignadas.',
    syncFaultAlertTitle: 'Error de sincronización',
    syncFaultAlertFallback: 'No se pudieron serializar las matrices de configuración hacia los endpoints públicos de perfiles.',
  },
  firstGarment: {
    title: 'Construyamos tu armario',
    subtitle: 'Empieza agregando tu primera prenda.',
    aiNote: 'La IA de Vyra detectará automáticamente su categoría, color y estilo.',
    addButton: 'Agregar primera prenda',
    loadingLabel: 'Confirmando parámetros de acceso al archivo...',
    noSessionError: 'Faltan parámetros de contexto de autenticación de sesión.',
    blockedAlertTitle: 'Finalización bloqueada',
    blockedAlertFallback: 'No se pudo cerrar la secuencia de forma segura.',
  },
  aiPreview: {
    activeBadge: 'YA DISPONIBLE',
    title: 'Conoce a tu estilista IA',
    subtitle: 'Vyra ya te sugiere un outfit completo cada día, genera nuevos looks con tu armario y analiza cada prenda que agregas — todo personalizado según tu clóset, el clima y tu calendario.',
    example: 'Por ejemplo: "Tu outfit del día está listo — prueba combinar tu blazer azul marino con el pantalón beige."',
  },
  planner: {
    title: 'Planifica qué ponerte',
    subtitle: 'Programa outfits directamente desde tu calendario — la IA de Vyra puede sugerirte uno automáticamente antes de eventos importantes.',
  },
};
