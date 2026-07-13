import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const requestNotificationPermissions = async () => {
  if (!Device.isDevice) {
    console.warn('Notifications only work on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token for push notification!');
    return false;
  }

  return true;
};

export const scheduleDailyReminder = async () => {
  // Cancel any existing daily reminder to avoid duplicates
  await cancelDailyReminder();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Today's Outfit",
      body: "Plan your outfit for today.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });
};

export const cancelDailyReminder = async () => {
  // We can identify the daily reminder by its content or by keeping a list of IDs.
  // For simplicity in V1, let's just find and cancel based on known title.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const daily = scheduled.find(n => n.content.title === "Today's Outfit");
  if (daily) {
    await Notifications.cancelScheduledNotificationAsync(daily.identifier);
  }
};

export const schedulePlannedOutfitReminder = async (outfitId: string, triggerDate: Date) => {
  // Trigger 1 hour before the scheduled date
  const triggerTime = new Date(triggerDate.getTime() - 60 * 60 * 1000);
  
  if (triggerTime < new Date()) return; // Don't schedule in the past

  return await Notifications.scheduleNotificationAsync({
    identifier: `outfit-${outfitId}`,
    content: {
      title: "Upcoming Outfit",
      body: "Don't forget your planned outfit.",
      data: { outfitId },
    },
    // Typecast to satisfy Expo's TypeScript definitions for a Date-based trigger
    trigger: triggerTime as unknown as Notifications.NotificationTriggerInput,
  });
};

export const cancelNotification = async (outfitId: string) => {
  await Notifications.cancelScheduledNotificationAsync(`outfit-${outfitId}`);
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
