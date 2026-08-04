/**
 * Clothing screens — garment detail, add, and edit. Covers the AI garment
 * analysis flow on add-garment.tsx.
 *
 * NOTE: This namespace intentionally does NOT include any taxonomy option
 * values (category names, colors, styles, occasions, seasons, materials,
 * tags) — those come from constants/garmentTaxonomy.ts and are matched
 * against real data stored in Supabase (`clothing_items.category`, etc.), so
 * they must never be translated. Only the UI chrome around them (section
 * labels, buttons, placeholders, validation copy) lives here.
 *
 * Also deliberately excluded: the 'Unbranded' / 'Unknown Brand' sentinel
 * strings used as default values and cross-file comparison keys for a
 * missing brand (see app/clothing/edit-garment.tsx and
 * app/(tabs)/closet.tsx) — translating those would break the equality
 * checks against data written elsewhere in the app.
 */
export const clothingEn = {
  detail: {
    loading: 'Synchronizing Wardrobe Profile...',
    sectionTitle: 'Garment Details',
    colorLabel: 'Color',
    catalogIdLabel: 'Catalog ID',
    editButton: 'Edit Item',
    deletePermanently: 'Delete Permanently',
    notAvailable: 'N/A',
    unnamedGarment: 'Unnamed Garment',
    uncategorized: 'Uncategorized',
    syncError: {
      title: 'Sync Disruption',
      message: 'Failed to pull updated details directly from your remote closet vault.',
    },
    favoriteError: {
      title: 'Policy Exception',
      message: 'Could not save favorite configuration status. Verify that row level modifications are supported.\nDetail: {{detail}}',
      rlsLockFallback: 'RLS Lock',
    },
    shareError: {
      title: 'Share Error',
      message: 'The native share operational platform rejected payload rendering.',
    },
    shareMessage: {
      header: '✨ Check out this piece from my Vyra Wardrobe ✨',
      name: '• Name: {{name}}',
      brand: '• Brand: {{brand}}',
      category: '• Style Classification: {{category}}',
      color: '• Tone Configuration: {{color}}',
      image: '\nView Visual Asset: {{image}}',
      title: 'Vyra Wardrobe Asset - {{name}}',
    },
    deleteConfirm: {
      title: 'Confirm Permanent Deletion',
      message: 'This operation is irreversible. This will remove this item record from your database and wipe its uploaded photo asset from storage completely.',
    },
    deleteError: {
      title: 'Deletion Intercepted',
      message: 'Database constraints or Row-Level security rejected table structural drop statements.',
    },
  },
  addGarment: {
    header: {
      title: 'Add Garment',
      subtitle: 'Catalog new wardrobe assets',
    },
    fields: {
      visualProfile: 'Garment Visual Profile',
      gallery: 'Gallery',
      camera: 'Camera',
      title: 'Garment Title',
      titlePlaceholder: 'e.g., Silk Linen Drape Blouse',
      brand: 'Brand Reference',
      brandPlaceholder: 'e.g., Maison Margiela',
      category: 'Category Classification',
      color: 'Dominant Tone Profile',
      style: 'Style (AI Suggested)',
      occasion: 'Occasion (AI Suggested)',
      season: 'Season (AI Suggested)',
      materials: 'Materials (comma separated)',
      materialsPlaceholder: 'e.g., cotton, polyester',
      description: 'Description',
      descriptionPlaceholder: 'Short AI-generated description',
      tags: 'Tags (comma separated)',
      tagsPlaceholder: 'e.g., basic, neutral, layering',
    },
    aiAnalyze: {
      analyzing: 'Analyzing photo...',
      reanalyze: 'Re-analyze with AI',
      analyze: 'Analyze with AI',
    },
    saveButton: 'Save to Wardrobe',
    colorPicker: {
      title: 'Custom Palette Curator',
      saturationBrightness: 'Saturation & Brightness',
      hueSpectrum: 'Hue Spectrum',
      hexLabel: 'HEX Parameter Code',
      applyColor: 'Apply Color',
    },
    permissions: {
      deniedTitle: 'Permission Denied',
      galleryMessage: 'Vyra needs access to your camera roll to fetch photos.',
      cameraMessage: 'Vyra needs hardware camera activation permissions to snap wardrobe frames.',
    },
    errors: {
      missingFieldTitle: 'Missing Field',
      missingNameMessage: 'Please provide a unique title naming definition for this piece.',
      missingCategoryMessage: 'Please select an architectural garment class categorization.',
      missingImageTitle: 'Missing Image',
      missingImageMessage: 'Please capture or attach a visual digital profile render of the garment.',
      authRequiredTitle: 'Authentication Required',
      authExpiredMessage: 'Your active security token has expired. Please log out and authenticate again to update your closet storage.',
      authExpiredShortMessage: 'Your active security token has expired. Please log out and authenticate again.',
      transactionFailureTitle: 'Transaction Failure',
      transactionFailureMessage: 'An unexpected database error occurred while registering garment profiles.',
      aiUnavailableTitle: 'AI Analysis Unavailable',
      aiUnavailableMessage: 'Could not analyze this photo right now. You can still fill in the details manually.',
    },
  },
  editGarment: {
    header: {
      title: 'Edit Garment',
      subtitle: 'Modify active closet metadata parameters',
    },
    discardChanges: {
      title: 'Discard Changes?',
      message: 'You have edited parameters on this garment structure. Leaving now drops modifications permanently.',
      stay: 'Stay Here',
      discard: 'Discard',
    },
    fields: {
      visualProfile: 'Garment Visual Profile',
      gallery: 'Gallery',
      camera: 'Camera',
      title: 'Garment Title',
      titlePlaceholder: 'e.g., Cashmere Knit Mockneck',
      brand: 'Brand Reference',
      brandPlaceholder: 'e.g., Loro Piana',
      category: 'Category Classification',
      color: 'Dominant Tone Profile',
    },
    saveButton: 'Save Changes',
    colorPicker: {
      title: 'Custom Palette Curator',
      saturationBrightness: 'Saturation & Brightness',
      hueSpectrum: 'Hue Spectrum',
      hexLabel: 'HEX Parameter Code',
      applyColor: 'Apply Color',
    },
    permissions: {
      deniedTitle: 'Permission Denied',
      galleryMessage: 'Vyra needs access to your camera roll to adjust photos.',
      cameraMessage: 'Vyra requires camera device access to capture items.',
    },
    errors: {
      sessionExpiredTitle: 'Session Expired',
      sessionExpiredMessage: 'Please authenticate again to make edits.',
      saveFailedTitle: 'Save Failed',
      saveFailedMessage: 'An unexpected transaction error occurred.',
    },
  },
};

export const clothingEs = {
  detail: {
    loading: 'Sincronizando perfil del armario...',
    sectionTitle: 'Detalles de la prenda',
    colorLabel: 'Color',
    catalogIdLabel: 'ID de catálogo',
    editButton: 'Editar prenda',
    deletePermanently: 'Eliminar definitivamente',
    notAvailable: 'N/D',
    unnamedGarment: 'Prenda sin nombre',
    uncategorized: 'Sin categoría',
    syncError: {
      title: 'Interrupción de sincronización',
      message: 'No se pudieron obtener los detalles actualizados desde tu armario remoto.',
    },
    favoriteError: {
      title: 'Excepción de política',
      message: 'No se pudo guardar el estado de favorito. Verifica que las modificaciones a nivel de fila estén permitidas.\nDetalle: {{detail}}',
      rlsLockFallback: 'Bloqueo RLS',
    },
    shareError: {
      title: 'Error al compartir',
      message: 'La plataforma nativa de compartir rechazó la generación del contenido.',
    },
    shareMessage: {
      header: '✨ Mira esta prenda de mi armario Vyra ✨',
      name: '• Nombre: {{name}}',
      brand: '• Marca: {{brand}}',
      category: '• Clasificación de estilo: {{category}}',
      color: '• Configuración de tono: {{color}}',
      image: '\nVer recurso visual: {{image}}',
      title: 'Prenda del armario Vyra - {{name}}',
    },
    deleteConfirm: {
      title: 'Confirmar eliminación permanente',
      message: 'Esta operación es irreversible. Se eliminará el registro de este artículo de tu base de datos y se borrará su foto del almacenamiento por completo.',
    },
    deleteError: {
      title: 'Eliminación interrumpida',
      message: 'Las restricciones de la base de datos o la seguridad a nivel de fila rechazaron la eliminación.',
    },
  },
  addGarment: {
    header: {
      title: 'Añadir prenda',
      subtitle: 'Cataloga nuevas piezas de tu armario',
    },
    fields: {
      visualProfile: 'Perfil visual de la prenda',
      gallery: 'Galería',
      camera: 'Cámara',
      title: 'Título de la prenda',
      titlePlaceholder: 'ej., Blusa drapeada de lino y seda',
      brand: 'Marca de referencia',
      brandPlaceholder: 'ej., Maison Margiela',
      category: 'Clasificación de categoría',
      color: 'Tono predominante',
      style: 'Estilo (sugerido por IA)',
      occasion: 'Ocasión (sugerida por IA)',
      season: 'Temporada (sugerida por IA)',
      materials: 'Materiales (separados por comas)',
      materialsPlaceholder: 'ej., algodón, poliéster',
      description: 'Descripción',
      descriptionPlaceholder: 'Breve descripción generada por IA',
      tags: 'Etiquetas (separadas por comas)',
      tagsPlaceholder: 'ej., básico, neutro, capas',
    },
    aiAnalyze: {
      analyzing: 'Analizando foto...',
      reanalyze: 'Volver a analizar con IA',
      analyze: 'Analizar con IA',
    },
    saveButton: 'Guardar en el armario',
    colorPicker: {
      title: 'Selector de color personalizado',
      saturationBrightness: 'Saturación y brillo',
      hueSpectrum: 'Espectro de tono',
      hexLabel: 'Código HEX',
      applyColor: 'Aplicar color',
    },
    permissions: {
      deniedTitle: 'Permiso denegado',
      galleryMessage: 'Vyra necesita acceso a tu galería para obtener fotos.',
      cameraMessage: 'Vyra necesita permisos de cámara para capturar prendas del armario.',
    },
    errors: {
      missingFieldTitle: 'Campo obligatorio',
      missingNameMessage: 'Proporciona un título único para esta pieza.',
      missingCategoryMessage: 'Selecciona una clasificación de categoría para la prenda.',
      missingImageTitle: 'Falta la imagen',
      missingImageMessage: 'Captura o adjunta una imagen visual de la prenda.',
      authRequiredTitle: 'Autenticación requerida',
      authExpiredMessage: 'Tu sesión ha expirado. Cierra sesión y vuelve a autenticarte para actualizar tu armario.',
      authExpiredShortMessage: 'Tu sesión ha expirado. Cierra sesión y vuelve a autenticarte.',
      transactionFailureTitle: 'Error de transacción',
      transactionFailureMessage: 'Ocurrió un error inesperado en la base de datos al registrar la prenda.',
      aiUnavailableTitle: 'Análisis de IA no disponible',
      aiUnavailableMessage: 'No se pudo analizar esta foto en este momento. Aún puedes completar los detalles manualmente.',
    },
  },
  editGarment: {
    header: {
      title: 'Editar prenda',
      subtitle: 'Modifica los datos de esta prenda del armario',
    },
    discardChanges: {
      title: '¿Descartar cambios?',
      message: 'Has editado parámetros de esta prenda. Si sales ahora, se perderán las modificaciones.',
      stay: 'Quedarme aquí',
      discard: 'Descartar',
    },
    fields: {
      visualProfile: 'Perfil visual de la prenda',
      gallery: 'Galería',
      camera: 'Cámara',
      title: 'Título de la prenda',
      titlePlaceholder: 'ej., Cuello alto de punto de cachemira',
      brand: 'Marca de referencia',
      brandPlaceholder: 'ej., Loro Piana',
      category: 'Clasificación de categoría',
      color: 'Tono predominante',
    },
    saveButton: 'Guardar cambios',
    colorPicker: {
      title: 'Selector de color personalizado',
      saturationBrightness: 'Saturación y brillo',
      hueSpectrum: 'Espectro de tono',
      hexLabel: 'Código HEX',
      applyColor: 'Aplicar color',
    },
    permissions: {
      deniedTitle: 'Permiso denegado',
      galleryMessage: 'Vyra necesita acceso a tu galería para ajustar fotos.',
      cameraMessage: 'Vyra necesita acceso a la cámara para capturar artículos.',
    },
    errors: {
      sessionExpiredTitle: 'Sesión expirada',
      sessionExpiredMessage: 'Vuelve a autenticarte para hacer cambios.',
      saveFailedTitle: 'Error al guardar',
      saveFailedMessage: 'Ocurrió un error inesperado en la transacción.',
    },
  },
};
