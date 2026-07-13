import { useEffect } from 'react';
import * as NotificationsService from '../services/notificationService';

export const useNotifications = () => {
  const enableNotifications = async () => {
    const granted = await NotificationsService.requestNotificationPermissions();
    if (granted) {
      await NotificationsService.scheduleDailyReminder();
    }
  };

  const disableNotifications = async () => {
    await NotificationsService.cancelAllNotifications();
  };

  const syncNotifications = async (enabled: boolean) => {
    if (enabled) {
      await enableNotifications();
    } else {
      await disableNotifications();
    }
  };

  return { syncNotifications };
};
