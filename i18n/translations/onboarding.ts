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
    notificationsTitle: 'Outfit Reminders',
    notificationsSubtitle: 'Receive premium styling schedule updates.',
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
    addButton: 'Add First Garment',
    loadingLabel: 'Committing archival access parameters...',
    noSessionError: 'Session authentication missing context parameters.',
    blockedAlertTitle: 'Finalization Blocked',
    blockedAlertFallback: 'Could not close out sequence safely.',
  },
  aiPreview: {
    comingSoonBadge: 'COMING SOON',
    title: 'AI Stylist',
    subtitle: 'Future personalized recommendations will analyze your wardrobe, weather conditions, style aesthetics, favorite colors, and calendar schedules to curate optimal styles.',
  },
  planner: {
    title: 'Plan what to wear',
    subtitle: 'Schedule outfits directly from your calendar.',
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
    notificationsTitle: 'Recordatorios de outfits',
    notificationsSubtitle: 'Recibe actualizaciones premium de tu agenda de estilo.',
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
    addButton: 'Agregar primera prenda',
    loadingLabel: 'Confirmando parámetros de acceso al archivo...',
    noSessionError: 'Faltan parámetros de contexto de autenticación de sesión.',
    blockedAlertTitle: 'Finalización bloqueada',
    blockedAlertFallback: 'No se pudo cerrar la secuencia de forma segura.',
  },
  aiPreview: {
    comingSoonBadge: 'PRÓXIMAMENTE',
    title: 'Estilista IA',
    subtitle: 'Las futuras recomendaciones personalizadas analizarán tu armario, las condiciones climáticas, tu estética de estilo, tus colores favoritos y tu calendario para diseñar looks óptimos.',
  },
  planner: {
    title: 'Planifica qué ponerte',
    subtitle: 'Programa outfits directamente desde tu calendario.',
  },
};
