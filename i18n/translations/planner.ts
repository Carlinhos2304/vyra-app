/**
 * Planner namespace — create-event, event-details, and select-outfit
 * screens. A handful of small pieces (category labels, the shared event
 * form field labels/placeholders, and the shared required-field validation
 * messages) are identical between create-event.tsx and event-details.tsx,
 * so they're defined once below and referenced from both `createEvent` and
 * `eventDetails` to avoid duplicating the same copy in two places.
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
};

const eventFieldLabelsEs = {
  eventName: 'NOMBRE DEL EVENTO *',
  date: 'FECHA *',
  category: 'CATEGORÍA *',
  location: 'UBICACIÓN *',
  description: 'DESCRIPCIÓN *',
};

const eventFieldPlaceholdersEn = {
  eventName: 'e.g. Gallery Exhibition Opening',
  date: 'Select event date',
  location: 'e.g. Somerset House, London',
  description: 'Add context notes...',
};

const eventFieldPlaceholdersEs = {
  eventName: 'p. ej. Inauguración de galería',
  date: 'Selecciona la fecha del evento',
  location: 'p. ej. Somerset House, Londres',
  description: 'Añade notas de contexto...',
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
  selectOutfit: {
    title: 'Select Outfit',
    subtitleForEvent: 'Anchor lookup style to event workspace',
    subtitleForDate: 'Assign style layout context for {{date}}',
    noOutfits: 'No available looks.',
    itemsCount: '{{count}} items',
    fetchError: 'Failed processing your lookbook assets.',
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
  selectOutfit: {
    title: 'Seleccionar look',
    subtitleForEvent: 'Vincula un look a este evento',
    subtitleForDate: 'Asigna un look para el {{date}}',
    noOutfits: 'No hay looks disponibles.',
    itemsCount: '{{count}} prendas',
    fetchError: 'Error al procesar tu guardarropa.',
  },
};
