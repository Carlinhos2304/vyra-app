/**
 * Sub-screens reachable from the main Profile tab — edit-profile, favorites,
 * history — living at app/profile/*.tsx. These merge alongside
 * profileMain.ts's `profile.main` namespace as `profile.editProfile`,
 * `profile.favorites`, and `profile.history`.
 */
export const profileSubEn = {
  editProfile: {
    title: 'Edit Profile',
    loadingProfile: 'Loading profile...',
    sectionProfileIdentity: 'Profile identity',
    sectionPersonalDetails: 'Personal details',
    usernameLabel: 'Username',
    usernamePlaceholder: 'Enter your username',
    birthDateLabel: 'Birth Date',
    birthDatePlaceholder: 'Select your birth date',
    genderLabel: 'Gender',
    genderPlaceholder: 'Select your gender',
    selectGenderTitle: 'Select Gender',
    genderOptions: {
      male: 'Male',
      female: 'Female',
      nonBinary: 'Non-binary',
      preferNotToSay: 'Prefer not to say',
    },
    saveChanges: 'Save Changes',
    errors: {
      loadProfileTitle: 'Error loading profile',
      notAuthenticated: 'User not authenticated.',
      userIdNotFoundTitle: 'Error',
      userIdNotFoundMessage: 'User ID not found.',
      saveProfileTitle: 'Error saving profile',
    },
    success: {
      title: 'Success',
      message: 'Profile updated successfully!',
    },
  },
  favorites: {
    title: 'Favorites',
    loadingFavorites: 'Syncing favorites pool...',
    errors: {
      userContextFailed: 'User context validation failed.',
      fetchFailed: 'Failed to sync favorite garments.',
      connectionFaultTitle: 'Sync Connection Fault',
      retryConnection: 'Retry Connection',
    },
    empty: {
      title: 'No favorite garments yet',
      subtitle: 'Start adding favorites from your wardrobe.',
      goToCloset: 'Go to Closet',
    },
  },
  history: {
    title: 'History Log',
    loadingHistory: 'Parsing historical logs...',
    relativeTime: {
      yesterday: 'Yesterday',
      daysAgo: '{{count}} days ago',
      someTimeAgo: 'Some time ago',
    },
    actions: {
      garmentAdded: 'Garment added',
      garmentDeleted: 'Garment deleted',
      favoriteAdded: 'Added to favorites',
      favoriteRemoved: 'Removed from favorites',
      outfitCreated: 'Outfit created',
      outfitDeleted: 'Outfit deleted',
      activityLogged: 'Activity logged',
    },
    errors: {
      authFailed: 'Authentication coordinates verification trace failed.',
      fetchFailed: 'Failed to establish continuous sync with log data.',
      syncFaultTitle: 'Log Synchronization Fault',
      retrySync: 'Retry Synchronization',
    },
    empty: {
      title: 'No activity logged yet',
      subtitle: 'Your style operations, additions, and updates will materialize here automatically.',
    },
  },
};

export const profileSubEs = {
  editProfile: {
    title: 'Editar Perfil',
    loadingProfile: 'Cargando perfil...',
    sectionProfileIdentity: 'Identidad del perfil',
    sectionPersonalDetails: 'Datos personales',
    usernameLabel: 'Nombre de usuario',
    usernamePlaceholder: 'Ingresa tu nombre de usuario',
    birthDateLabel: 'Fecha de nacimiento',
    birthDatePlaceholder: 'Selecciona tu fecha de nacimiento',
    genderLabel: 'Género',
    genderPlaceholder: 'Selecciona tu género',
    selectGenderTitle: 'Seleccionar Género',
    genderOptions: {
      male: 'Masculino',
      female: 'Femenino',
      nonBinary: 'No binario',
      preferNotToSay: 'Prefiero no decirlo',
    },
    saveChanges: 'Guardar Cambios',
    errors: {
      loadProfileTitle: 'Error al cargar el perfil',
      notAuthenticated: 'Usuario no autenticado.',
      userIdNotFoundTitle: 'Error',
      userIdNotFoundMessage: 'No se encontró el ID de usuario.',
      saveProfileTitle: 'Error al guardar el perfil',
    },
    success: {
      title: 'Éxito',
      message: '¡Perfil actualizado correctamente!',
    },
  },
  favorites: {
    title: 'Favoritos',
    loadingFavorites: 'Sincronizando tus favoritos...',
    errors: {
      userContextFailed: 'Error al validar el contexto del usuario.',
      fetchFailed: 'No se pudieron sincronizar tus prendas favoritas.',
      connectionFaultTitle: 'Error de Conexión al Sincronizar',
      retryConnection: 'Reintentar Conexión',
    },
    empty: {
      title: 'Aún no tienes prendas favoritas',
      subtitle: 'Empieza a añadir favoritos desde tu armario.',
      goToCloset: 'Ir al Armario',
    },
  },
  history: {
    title: 'Historial',
    loadingHistory: 'Procesando historial...',
    relativeTime: {
      yesterday: 'Ayer',
      daysAgo: 'Hace {{count}} días',
      someTimeAgo: 'Hace un tiempo',
    },
    actions: {
      garmentAdded: 'Prenda añadida',
      garmentDeleted: 'Prenda eliminada',
      favoriteAdded: 'Añadido a favoritos',
      favoriteRemoved: 'Eliminado de favoritos',
      outfitCreated: 'Outfit creado',
      outfitDeleted: 'Outfit eliminado',
      activityLogged: 'Actividad registrada',
    },
    errors: {
      authFailed: 'Error al verificar la autenticación.',
      fetchFailed: 'No se pudo sincronizar el historial de actividad.',
      syncFaultTitle: 'Error de Sincronización del Historial',
      retrySync: 'Reintentar Sincronización',
    },
    empty: {
      title: 'Aún no hay actividad registrada',
      subtitle: 'Tus operaciones de estilo, adiciones y actualizaciones aparecerán aquí automáticamente.',
    },
  },
};
