import { requireOptionalNativeModule } from 'expo';
import type { LiveActivity, LiveActivityFactory } from 'expo-widgets';
import { Platform } from 'react-native';

import type { RideActivityProps } from './RideLiveActivity';

const RIDE_URL = 'opendash://rides';

let factoryPromise: Promise<LiveActivityFactory<RideActivityProps> | null> | null = null;

function rideFactory(): Promise<LiveActivityFactory<RideActivityProps> | null> {
  factoryPromise ??=
    Platform.OS === 'ios' && requireOptionalNativeModule('ExpoWidgets')
      ? import('./RideLiveActivity').then((m) => m.default).catch(() => null)
      : Promise.resolve(null);
  return factoryPromise;
}

async function activeRideActivities(): Promise<LiveActivity<RideActivityProps>[]> {
  try {
    return (await rideFactory())?.getInstances() ?? [];
  } catch {
    return [];
  }
}

export async function startRideActivity(props: RideActivityProps): Promise<void> {
  const factory = await rideFactory();
  if (!factory) return;
  try {
    for (const activity of await activeRideActivities()) await activity.end('immediate');
    factory.start(props, RIDE_URL);
  } catch (error) {
    console.warn('OpenDash could not start the ride Live Activity', error);
  }
}

export async function ensureRideActivity(props: RideActivityProps): Promise<void> {
  const activities = await activeRideActivities();
  if (activities.length) {
    await updateRideActivity(props);
  } else {
    await startRideActivity(props);
  }
}

export async function updateRideActivity(props: RideActivityProps): Promise<void> {
  for (const activity of await activeRideActivities()) {
    try {
      await activity.update(props);
    } catch {
      /* activity was dismissed */
    }
  }
}

export async function endRideActivity(): Promise<void> {
  for (const activity of await activeRideActivities()) {
    try {
      await activity.end('immediate');
    } catch {
      /* already ended */
    }
  }
}
