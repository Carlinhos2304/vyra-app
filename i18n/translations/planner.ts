/**
 * Planner namespace — create-event, event-details, select-outfit, and the
 * Smart Planner rebuild (calendar.tsx + components/planner/*). A handful of
 * small pieces (category labels, the shared event form field
 * labels/placeholders, and the shared required-field validation messages)
 * are identical across create-event.tsx / event-details.tsx / the new
 * shared EventForm, so they're defined once below and referenced from
 * `createEvent`, `eventDetails`, and `eventForm` to avoid duplicating the
 * same copy in three places.
 */

const categoriesEn = {
  work: 'Work',
  formal: 'Formal',
  casual: 'Casual',
  party: 'Party',
  travel: 'Travel',
  sport: 'Sport',
  other: 'Other',
};

const categoriesEs = {
  work: 'Trabajo',
  formal: 'Formal',
  casual: 'Casual',
  party: 'Fiesta',
  travel: 'Viaje',
  sport: 'Deporte',
  other: 'Otro',
};

const eventFieldLabelsEn = {
  eventName: 'EVENT NAME *',
  date: 'DATE *',
  category: 'CATEGORY *',
  location: 'LOCATION *',
  description: 'DESCRIPTION *',
  startTime: 'START TIME',
  endTime: 'END TIME',
};

const eventFieldLabelsEs = {
  eventName: 'NOMBRE DEL EVENTO *',
  date: 'FECHA *',
  category: 'CATEGORÍA *',
  location: 'UBICACIÓN *',
  description: 'DESCRIPCIÓN *',
  startTime: 'HORA DE INICIO',
  endTime: 'HORA DE FIN',
};

const eventFieldPlaceholdersEn = {
  eventName: 'e.g. Gallery Exhibition Opening',
  date: 'Select event date',
  location: 'e.g. Somerset House, London',
  description: 'Add context notes...',
  startTime: 'Optional',
  endTime: 'Optional',
};

const eventFieldPlaceholdersEs = {
  eventName: 'p. ej. Inauguración de galería',
  date: 'Selecciona la fecha del evento',
  location: 'p. ej. Somerset House, Londres',
  description: 'Añade notas de contexto...',
  startTime: 'Opcional',
  endTime: 'Opcional',
};

const eventValidationEn = {
  nameRequired: 'Please enter an event name.',
  dateRequired: 'Please select a date.',
  categoryRequired: 'Please choose a category.',
  locationRequired: 'Please select a location.',
  descriptionRequired: 'Please enter a description.',
};

const eventValidationEs = {
  nameRequired: 'Por favor ingresa un nombre para el evento.',
  dateRequired: 'Por favor selecciona una fecha.',
  categoryRequired: 'Por favor elige una categoría.',
  locationRequired: 'Por favor selecciona una ubicación.',
  descriptionRequired: 'Por favor ingresa una descripción.',
};

const recurrenceEn = {
  title: 'REPEAT',
  none: 'Never',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  custom: 'Custom',
  everyNDays: 'Every {{n}} days',
  intervalLabel: 'Repeat every (days)',
  endDateLabel: 'END DATE (OPTIONAL)',
  endDateHint: 'Leave empty to auto-limit the series',
  createdSeries: 'Created {{count}} occurrences.',
  cappedNotice: 'This series was capped at {{count}} occurrences to keep it manageable.',
};

const recurrenceEs = {
  title: 'REPETIR',
  none: 'Nunca',
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  custom: 'Personalizado',
  everyNDays: 'Cada {{n}} días',
  intervalLabel: 'Repetir cada (días)',
  endDateLabel: 'FECHA DE FIN (OPCIONAL)',
  endDateHint: 'Déjalo vacío para limitar la serie automáticamente',
  createdSeries: 'Se crearon {{count}} repeticiones.',
  cappedNotice: 'Esta serie se limitó a {{count}} repeticiones para mantenerla manejable.',
};

export const plannerEn = {
  createEvent: {
    title: 'Create Event',
    subtitle: 'Schedule an upcoming social fixture',
    fields: eventFieldLabelsEn,
    placeholders: eventFieldPlaceholdersEn,
    categories: categoriesEn,
    validation: eventValidationEn,
    sessionInvalid: 'Session signature invalid.',
    genericSaveError: 'An error obstructed event persistence layout.',
    saveButton: 'Save Event',
  },
  eventDetails: {
    editTitle: 'Edit Event Details',
    editSubtitle: 'Modify your scheduled fixture context metrics',
    fields: eventFieldLabelsEn,
    placeholders: eventFieldPlaceholdersEn,
    categories: categoriesEn,
    validation: eventValidationEn,
    assignedOutfitHeading: 'Assigned Wardrobe Look',
    viewLookButton: 'View Look',
    changeButton: 'Change',
    noOutfitAssigned: 'No outfit customized for this event context',
    selectOutfitButton: 'Select Outfit',
    editButton: 'Edit Event',
    deleteButton: 'Delete Event',
    saveChangesButton: 'Save Changes',
    deleteConfirmTitle: 'Delete Event?',
    deleteConfirmMessage: 'This action cannot be undone.',
    deleteError: 'Failed to remove the target event.',
    fetchError: 'Error processing structural event payload.',
    updateError: 'An error obstructed event persistence layout.',
    missingEvent: 'Event context missing.',
  },
  eventForm: {
    fields: eventFieldLabelsEn,
    placeholders: eventFieldPlaceholdersEn,
    categories: categoriesEn,
    validation: eventValidationEn,
    recurrence: recurrenceEn,
  },
  selectOutfit: {
    title: 'Select Outfit',
    subtitleForEvent: 'Anchor lookup style to event workspace',
    subtitleForDate: 'Assign style layout context for {{date}}',
    noOutfits: 'No available looks.',
    itemsCount: '{{count}} items',
    fetchError: 'Failed processing your lookbook assets.',
    sessionInvalid: 'Your session has expired. Please sign in again.',
    saveError: 'Could not save this outfit selection. Please try again.',
  },
  smartPlanner: {
    quickActions: {
      newEvent: 'New Event',
      generateOutfit: 'Generate Outfit',
      today: 'Today',
      closet: 'Closet',
    },
    daySummary: {
      heading: 'Day Overview',
      eventsToday: '{{count}} events',
      noEvents: 'Nothing scheduled',
      nextEventLabel: 'Next: {{name}}',
      outfitReady: 'Outfit ready: {{name}}',
      outfitReadyForEvent: 'Outfit for {{eventName}}: {{name}}',
      additionalOutfits: '+{{count}} more outfit(s) planned today — see timeline',
      noOutfitYet: 'No outfit planned yet',
      temperatureUnavailable: 'Weather unavailable',
    },
    timeline: {
      heading: 'Timeline',
      noTimeSet: 'No time set',
      empty: 'No events scheduled for this day.',
    },
    weather: {
      unavailable: 'Weather not available yet',
      beyondForecastRange: 'Too far ahead for a forecast yet',
      feelsLike: 'Feels like {{temp}}°',
      rainChance: '{{percent}}% rain',
    },
    outfitAssignment: {
      heading: 'Outfit for this Event',
      recommended: 'Recommended Outfit',
      generated: 'Generated Outfit',
      saved: 'Saved Outfit',
      change: 'Change Outfit',
      generateAgain: 'Generate Again',
      generate: 'Generate Outfit',
      generating: 'Thinking about the best fit...',
      assigning: 'Saving...',
      noSuggestions: "Couldn't put together a suggestion this time.",
      chooseSaved: 'Choose from Saved Looks',
      aiTipLabel: 'AI note',
      confidenceLabel: '{{percent}}% match',
    },
    preparations: {
      heading: 'Upcoming Preparations',
      empty: "You're all set — nothing urgent to prepare.",
      reviewOutfitTonight: "Tonight: review your outfit for tomorrow's {{eventName}}.",
      assignOutfitTonight: 'Tomorrow: {{eventName}} still needs an outfit — assign one tonight.',
      laundryBeforeDate: "Laundry recommended before {{dateLabel}} — you'll need {{itemName}} again.",
    },
    conflicts: {
      heading: 'Worth a Look',
      duplicateGarment: 'The same garment is planned for both {{eventA}} and {{eventB}}.',
      weatherTooCold: "{{eventName}}'s outfit may be too light — forecast low is {{low}}°.",
      weatherTooHot: "{{eventName}}'s outfit may be too warm — forecast high is {{high}}°.",
      missingOutfit: '{{eventName}} doesn\'t have an outfit yet.',
      unpreparedImportant: '{{eventName}} is coming up soon and still has no outfit assigned.',
    },
  },
};

export const plannerEs = {
  createEvent: {
    title: 'Crear evento',
    subtitle: 'Programa tu próximo evento social',
    fields: eventFieldLabelsEs,
    placeholders: eventFieldPlaceholdersEs,
    categories: categoriesEs,
    validation: eventValidationEs,
    sessionInvalid: 'Firma de sesión no válida.',
    genericSaveError: 'Se produjo un error al guardar el evento.',
    saveButton: 'Guardar evento',
  },
  eventDetails: {
    editTitle: 'Editar detalles del evento',
    editSubtitle: 'Modifica los detalles de tu evento programado',
    fields: eventFieldLabelsEs,
    placeholders: eventFieldPlaceholdersEs,
    categories: categoriesEs,
    validation: eventValidationEs,
    assignedOutfitHeading: 'Look asignado del armario',
    viewLookButton: 'Ver look',
    changeButton: 'Cambiar',
    noOutfitAssigned: 'No hay un look asignado para este evento',
    selectOutfitButton: 'Seleccionar look',
    editButton: 'Editar evento',
    deleteButton: 'Eliminar evento',
    saveChangesButton: 'Guardar cambios',
    deleteConfirmTitle: '¿Eliminar evento?',
    deleteConfirmMessage: 'Esta acción no se puede deshacer.',
    deleteError: 'No se pudo eliminar el evento.',
    fetchError: 'Error al procesar los datos del evento.',
    updateError: 'Se produjo un error al guardar el evento.',
    missingEvent: 'No se encontró el evento.',
  },
  eventForm: {
    fields: eventFieldLabelsEs,
    placeholders: eventFieldPlaceholdersEs,
    categories: categoriesEs,
    validation: eventValidationEs,
    recurrence: recurrenceEs,
  },
  selectOutfit: {
    title: 'Seleccionar look',
    subtitleForEvent: 'Vincula un look a este evento',
    subtitleForDate: 'Asigna un look para el {{date}}',
    noOutfits: 'No hay looks disponibles.',
    itemsCount: '{{count}} prendas',
    fetchError: 'Error al procesar tu guardarropa.',
    sessionInvalid: 'Tu sesión expiró. Por favor inicia sesión de nuevo.',
    saveError: 'No se pudo guardar esta selección. Intenta de nuevo.',
  },
  smartPlanner: {
    quickActions: {
      newEvent: 'Nuevo evento',
      generateOutfit: 'Generar outfit',
      today: 'Hoy',
      closet: 'Armario',
    },
    daySummary: {
      heading: 'Resumen del día',
      eventsToday: '{{count}} eventos',
      noEvents: 'Nada programado',
      nextEventLabel: 'Siguiente: {{name}}',
      outfitReady: 'Outfit listo: {{name}}',
      outfitReadyForEvent: 'Outfit para {{eventName}}: {{name}}',
      additionalOutfits: '+{{count}} outfit(s) más planeados hoy — revisa la línea de tiempo',
      noOutfitYet: 'Aún no hay un outfit planeado',
      temperatureUnavailable: 'Clima no disponible',
    },
    timeline: {
      heading: 'Línea de tiempo',
      noTimeSet: 'Sin hora asignada',
      empty: 'No hay eventos programados para este día.',
    },
    weather: {
      unavailable: 'Clima no disponible aún',
      beyondForecastRange: 'Muy lejos para tener pronóstico todavía',
      feelsLike: 'Sensación de {{temp}}°',
      rainChance: '{{percent}}% de lluvia',
    },
    outfitAssignment: {
      heading: 'Outfit para este evento',
      recommended: 'Outfit recomendado',
      generated: 'Outfit generado',
      saved: 'Outfit guardado',
      change: 'Cambiar outfit',
      generateAgain: 'Generar de nuevo',
      generate: 'Generar outfit',
      generating: 'Pensando en la mejor combinación...',
      assigning: 'Guardando...',
      noSuggestions: 'No se pudo armar una sugerencia esta vez.',
      chooseSaved: 'Elegir de looks guardados',
      aiTipLabel: 'Nota de IA',
      confidenceLabel: '{{percent}}% de coincidencia',
    },
    preparations: {
      heading: 'Próximas preparaciones',
      empty: 'Todo listo — nada urgente que preparar.',
      reviewOutfitTonight: 'Esta noche: revisa tu outfit para {{eventName}} de mañana.',
      assignOutfitTonight: 'Mañana: {{eventName}} todavía no tiene outfit — asígnale uno esta noche.',
      laundryBeforeDate: 'Se recomienda lavar antes del {{dateLabel}} — necesitarás {{itemName}} de nuevo.',
    },
    conflicts: {
      heading: 'Vale la pena revisar',
      duplicateGarment: 'La misma prenda está planeada para {{eventA}} y {{eventB}}.',
      weatherTooCold: 'El outfit de {{eventName}} podría ser muy ligero — la mínima pronosticada es {{low}}°.',
      weatherTooHot: 'El outfit de {{eventName}} podría ser muy abrigado — la máxima pronosticada es {{high}}°.',
      missingOutfit: '{{eventName}} todavía no tiene un outfit asignado.',
      unpreparedImportant: '{{eventName}} se acerca pronto y todavía no tiene outfit asignado.',
    },
  },
};
