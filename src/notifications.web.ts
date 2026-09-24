export const notificationsSupported = false;

export async function notificationsAllowed(): Promise<boolean> {
  return false;
}

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function replaceScheduledReminders(): Promise<void> {}

export async function presentNotification(): Promise<void> {}
