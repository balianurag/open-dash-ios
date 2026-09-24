import * as Notifications from 'expo-notifications';

import type { PlannedReminder } from './reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function isAllowed(status: Notifications.NotificationPermissionsStatus): boolean {
  return status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export const notificationsSupported = true;

export async function notificationsAllowed(): Promise<boolean> {
  return isAllowed(await Notifications.getPermissionsAsync());
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (await notificationsAllowed()) return true;
  return isAllowed(
    await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }),
  );
}

export async function replaceScheduledReminders(prefix: string, reminders: PlannedReminder[]): Promise<void> {
  const wanted = new Set(reminders.map((r) => r.id));
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const request of scheduled) {
    if (request.identifier.startsWith(prefix) && !wanted.has(request.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  }
  for (const reminder of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: { title: reminder.title, body: reminder.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date },
    });
  }
}

export async function presentNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
}
