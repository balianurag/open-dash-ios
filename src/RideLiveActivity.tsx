import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  font,
  foregroundStyle,
  lineLimit,
  monospacedDigit,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment, type LiveActivityFactory } from 'expo-widgets';

export type RideActivityProps = {
  bike: string;
  startMs: number;
  distanceKm: number;
};

const RideActivity = (props: RideActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const bg = '#070707';
  const accent = environment.isLuminanceReduced ? '#C8C4BD' : '#B78B4B';
  const text = '#C8C4BD';
  const textMid = '#A89B88';
  const textLo = '#716A61';
  const km = props.distanceKm.toFixed(1);
  const started = new Date(props.startMs);

  return {
    banner: (
      <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 16 }), activityBackgroundTint(bg)]}>
        <HStack spacing={6}>
          <Image systemName="record.circle.fill" color={accent} size={13} />
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(textMid), lineLimit(1)]}>
            {props.bike}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(textLo)]}>OpenDash ride</Text>
        </HStack>
        <HStack>
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 32, weight: 'bold' }), foregroundStyle(accent), monospacedDigit()]}>
              {km + ' km'}
            </Text>
            <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(textLo)]}>DISTANCE</Text>
          </VStack>
          <Spacer />
          <VStack alignment="trailing" spacing={2}>
            <Text
              date={started}
              dateStyle="timer"
              modifiers={[font({ size: 32, weight: 'bold' }), foregroundStyle(text), monospacedDigit()]}
            />
            <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(textLo)]}>ELAPSED</Text>
          </VStack>
        </HStack>
      </VStack>
    ),
    compactLeading: <Image systemName="speedometer" color={accent} />,
    compactTrailing: (
      <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(accent), monospacedDigit()]}>
        {km + ' km'}
      </Text>
    ),
    minimal: <Image systemName="speedometer" color={accent} />,
    expandedLeading: (
      <VStack alignment="leading" spacing={2} modifiers={[padding({ leading: 6 })]}>
        <Text modifiers={[font({ size: 26, weight: 'bold' }), foregroundStyle(accent), monospacedDigit()]}>
          {km + ' km'}
        </Text>
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(textLo)]}>DISTANCE</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={2} modifiers={[padding({ trailing: 6 })]}>
        <Text
          date={started}
          dateStyle="timer"
          modifiers={[font({ size: 26, weight: 'bold' }), foregroundStyle(text), monospacedDigit()]}
        />
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(textLo)]}>ELAPSED</Text>
      </VStack>
    ),
    expandedBottom: (
      <HStack spacing={6} modifiers={[padding({ horizontal: 6 })]}>
        <Image systemName="record.circle.fill" color={accent} size={12} />
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(textMid), lineLimit(1)]}>
          {props.bike}
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 12 }), foregroundStyle(textLo)]}>Recording</Text>
      </HStack>
    ),
  };
};

const RideActivityFactory: LiveActivityFactory<RideActivityProps> = createLiveActivity<RideActivityProps>(
  'RideActivity',
  RideActivity,
);

export default RideActivityFactory;
