/**
 * app/profile/notification-preferences.tsx — the granular notification
 * settings screen sitting underneath profile.tsx's top-level
 * `notifications_enabled` master switch (that switch's own copy lives in
 * profileMain.ts as `profile.main.pushNotifications` / `notificationPreferences`,
 * unchanged by this file).
 *
 * Keys here map 1:1 to lib/services/notificationTypes.ts's
 * NotificationCategory union plus the quiet-hours/schedule/weekend fields on
 * NotificationPreferences.
 */
export const notificationsEn = {
  title: 'Notification Preferences',
  subtitle: 'Choose what Vyra can notify you about',
  loadingLabel: 'Loading preferences...',
  sectionCategories: 'Categories',
  sectionQuietHours: 'Quiet Hours',
  sectionSchedule: 'Schedule',
  categories: {
    planner: {
      label: 'Planner Reminders',
      description: 'Reminders for your events and plans',
    },
    weather: {
      label: 'Weather Alerts',
      description: 'Alerts when weather may affect your outfit',
    },
    outfitReminder: {
      label: 'Outfit Reminders',
      description: "Daily notice when today's outfit is ready",
    },
    aiSuggestion: {
      label: 'AI Smart Suggestions',
      description: 'Smart suggestions based on your closet and habits',
    },
    wardrobe: {
      label: 'Wardrobe Tips',
      description: 'Tips about unworn items and wardrobe balance',
    },
    plannerAi: {
      label: 'Planner AI',
      description: 'AI suggests an outfit before important events',
    },
    weeklySummary: {
      label: 'Weekly Summary',
      description: 'A weekly recap of your style activity',
    },
  },
  quietHoursToggleLabel: 'Enable quiet hours',
  quietHoursDescription: 'Notifications will wait until quiet hours end',
  quietHoursStartLabel: 'Start',
  quietHoursEndLabel: 'End',
  notificationTimeLabel: 'Daily notification time',
  notificationTimeDescription: 'When Vyra sends outfit tips and suggestions',
  weekendToggleLabel: 'Weekend notifications',
  weekendToggleDescription: 'Allow proactive notifications on Saturdays and Sundays',
  saveErrorMessage: 'Could not save this setting. Please try again.',
};

export const notificationsEs = {
  title: 'Preferencias de Notificaciones',
  subtitle: 'Elige sobre qué puede notificarte Vyra',
  loadingLabel: 'Cargando preferencias...',
  sectionCategories: 'Categorías',
  sectionQuietHours: 'Horario Silencioso',
  sectionSchedule: 'Horario',
  categories: {
    planner: {
      label: 'Recordatorios del Planner',
      description: 'Recordatorios de tus eventos y planes',
    },
    weather: {
      label: 'Avisos del Clima',
      description: 'Avisos cuando el clima puede afectar tu outfit',
    },
    outfitReminder: {
      label: 'Recordatorio de Outfit',
      description: 'Aviso diario cuando tu outfit del día está listo',
    },
    aiSuggestion: {
      label: 'Sugerencias Inteligentes IA',
      description: 'Sugerencias inteligentes según tu clóset y hábitos',
    },
    wardrobe: {
      label: 'Consejos de Clóset',
      description: 'Consejos sobre prendas sin usar y balance de clóset',
    },
    plannerAi: {
      label: 'Planner IA',
      description: 'La IA sugiere un outfit antes de eventos importantes',
    },
    weeklySummary: {
      label: 'Resumen Semanal',
      description: 'Un resumen semanal de tu actividad de estilo',
    },
  },
  quietHoursToggleLabel: 'Activar horario silencioso',
  quietHoursDescription: 'Las notificaciones esperarán a que termine el horario silencioso',
  quietHoursStartLabel: 'Inicio',
  quietHoursEndLabel: 'Fin',
  notificationTimeLabel: 'Hora diaria de notificaciones',
  notificationTimeDescription: 'Cuándo envía Vyra tips y sugerencias de outfit',
  weekendToggleLabel: 'Notificaciones en fin de semana',
  weekendToggleDescription: 'Permitir notificaciones proactivas los sábados y domingos',
  saveErrorMessage: 'No se pudo guardar este ajuste. Inténtalo de nuevo.',
};
