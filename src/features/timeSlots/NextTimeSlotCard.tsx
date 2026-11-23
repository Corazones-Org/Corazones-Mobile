import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/Badge/Badge';
import { Button } from '@/components/Button/Button';
import { useToast } from '@/components/Toast/ToastProvider';
import { TipCard } from '@/components/TipCard/TipCard';
import { useProfile } from '@/features/profile/ProfileProvider';
import { useTheme } from '@/theme/ThemeProvider';

import { TimeSlotError, registerErrorMessageKey, registerForNextTimeSlot } from './api';
import { deriveCardState } from './cardState';
import { DisclaimerModal } from './DisclaimerModal';
import { formatCountdown } from './format';
import { getCurrentCoordinates } from './location';
import { useCountdown, useServerClock, type ServerClock } from './useServerClock';
import { useTimeSlotStatus } from './useTimeSlotStatus';

// Things the card explains under the countdown after a sign up attempt. They are not stored: the
// next attempt clears them.
type Notice = 'outOfZone' | 'locationDenied' | 'locationBlocked' | 'locationUnavailable';

const NOTICE_KEY: Record<Notice, string> = {
  outOfZone: 'timeSlots.notices.outOfZone',
  locationDenied: 'timeSlots.notices.locationDenied',
  locationBlocked: 'timeSlots.notices.locationBlocked',
  locationUnavailable: 'timeSlots.notices.locationUnavailable',
};

function Countdown({ target, clock }: { target: number; clock: ServerClock }) {
  const { colors, typography } = useTheme();
  const { text } = useCountdown(target, clock);

  return (
    <Text
      accessibilityRole="timer"
      style={[typography.h2, styles.countdown, { color: colors.primaryText }]}
    >
      {text}
    </Text>
  );
}

// The Main screen's "Próximo turno" card: the time left to the next turn and the way to sign up.
// The person only sees the countdown: which slot they are signed up for is decided by the server
// (always the next one), and every time shown comes from the server's clock.
export function NextTimeSlotCard({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { t } = useTranslation();
  const { colors, radius, shadow, spacing, typography } = useTheme();
  const { profile } = useProfile();
  const toast = useToast();
  const clock = useServerClock();
  const { state, reload, applyStatus } = useTimeSlotStatus(clock);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const profileReady = Boolean(profile?.onboardingComplete && profile.name?.trim());

  const showIncompleteProfile = () =>
    toast.show({
      tone: 'warning',
      title: t('timeSlots.toasts.profileIncompleteTitle'),
      message: t('timeSlots.toasts.profileIncompleteMessage'),
      action: t('timeSlots.toasts.openProfile'),
      onAction: onOpenProfile,
    });

  const handleRegisterPress = () => {
    if (!profileReady) {
      showIncompleteProfile();
      return;
    }
    setNotice(null);
    setDisclaimerOpen(true);
  };

  const handleAccept = async () => {
    if (registering) {
      return;
    }
    setRegistering(true);
    try {
      const location = await getCurrentCoordinates();
      if (!location.ok) {
        setDisclaimerOpen(false);
        setNotice(
          location.reason === 'unavailable'
            ? 'locationUnavailable'
            : location.canAskAgain
              ? 'locationDenied'
              : 'locationBlocked'
        );
        return;
      }

      const sentAt = Date.now();
      const status = await registerForNextTimeSlot({
        latitude: location.latitude,
        longitude: location.longitude,
        disclaimerAccepted: true,
      });
      applyStatus(status, sentAt);
      setDisclaimerOpen(false);
      toast.show({
        tone: 'success',
        title: t('timeSlots.toasts.registeredTitle'),
        message: t('timeSlots.toasts.registeredMessage', {
          time: status.registrations.find((r) => r.startsAt > status.serverNow)?.localTime ?? '',
        }),
      });
    } catch (error) {
      setDisclaimerOpen(false);
      const code = error instanceof TimeSlotError ? error.code : 'unknown';
      if (code === 'out_of_zone') {
        setNotice('outOfZone');
      } else if (code === 'profile_incomplete') {
        showIncompleteProfile();
      } else {
        if (code === 'already_used_today' || code === 'slot_inactive') {
          // What we showed is out of date: ask the server again.
          reload();
        }
        toast.show({
          tone: 'error',
          title: t('timeSlots.toasts.errorTitle'),
          message: t(registerErrorMessageKey(code)),
        });
      }
    } finally {
      setRegistering(false);
    }
  };

  const renderBody = () => {
    if (state.status === 'loading') {
      return (
        <ActivityIndicator
          testID="time-slot-loading"
          accessibilityLabel={t('timeSlots.card.loading')}
          color={colors.primary}
        />
      );
    }

    if (state.status === 'error') {
      return (
        <View style={{ gap: spacing[3] }}>
          <Text style={[typography.body, { color: colors.textPrimary }]}>{t('timeSlots.card.loadError')}</Text>
          <Button variant="link" onPress={reload}>
            {t('timeSlots.card.retry')}
          </Button>
        </View>
      );
    }

    const { main, inProgress } = deriveCardState(state.data, clock.now);

    return (
      <View style={{ gap: spacing[4] }}>
        {main.kind === 'refreshing' ? (
          <ActivityIndicator
            testID="time-slot-loading"
            accessibilityLabel={t('timeSlots.card.loading')}
            color={colors.primary}
          />
        ) : null}

        {main.kind === 'free' ? (
          <>
            <View style={{ gap: spacing[2] }}>
              <Badge tone="primary" icon="calendar">
                {t('timeSlots.card.next')}
              </Badge>
              <Text style={[typography.h1, { color: colors.textPrimary }]}>{main.localTime}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {t('timeSlots.card.startsIn')}
              </Text>
              <Countdown target={main.startsAt} clock={clock} />
            </View>
            {notice ? <TipCard icon="pin">{t(NOTICE_KEY[notice])}</TipCard> : null}
            <Button size="lg" block disabled={!main.canRegister} onPress={handleRegisterPress}>
              {t('timeSlots.card.register')}
            </Button>
            {!main.canRegister ? (
              <Text style={[typography.caption, styles.centered, { color: colors.textSecondary }]}>
                {t('timeSlots.card.registerLater')}
              </Text>
            ) : null}
          </>
        ) : null}

        {main.kind === 'waiting' ? (
          <View style={{ gap: spacing[2] }}>
            <Badge tone="success" icon="checkCircle">
              {t('timeSlots.card.registered')}
            </Badge>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>
              {t('timeSlots.card.waitingTitle', { time: main.localTime })}
            </Text>
            <Countdown target={main.startsAt} clock={clock} />
          </View>
        ) : null}

        {main.kind === 'used' ? (
          <View style={{ gap: spacing[2] }}>
            <Badge tone="neutral" icon="lock">
              {t('timeSlots.card.used')}
            </Badge>
            <Text style={[typography.h4, { color: colors.textPrimary }]}>{t('timeSlots.card.usedMessage')}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {t('timeSlots.card.usedRenews')}
            </Text>
            <Countdown target={main.resetsAt} clock={clock} />
          </View>
        ) : null}

        {main.kind === 'noSlots' ? (
          <View style={{ gap: spacing[2] }}>
            <Badge tone="neutral" icon="calendar">
              {t('timeSlots.card.next')}
            </Badge>
            <Text style={[typography.body, { color: colors.textPrimary }]}>{t('timeSlots.card.noSlots')}</Text>
          </View>
        ) : null}

        {inProgress ? (
          <View style={[styles.inProgress, { borderTopColor: colors.border, paddingTop: spacing[3], gap: spacing[1] }]}>
            <Text style={[typography.label, { color: colors.successText }]}>
              {t('timeSlots.card.inProgress', { time: inProgress.localTime })}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {t('timeSlots.card.endsIn', { countdown: formatCountdown(inProgress.endsAt - clock.now) })}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View
      testID="next-time-slot-card"
      style={[styles.card, { borderRadius: radius.xl, borderColor: colors.border }, shadow.card]}
    >
      <LinearGradient
        colors={[colors.gradSoftEnd, colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius.xl }]}
      />
      <View style={{ padding: spacing[5] }}>{renderBody()}</View>
      <DisclaimerModal
        visible={disclaimerOpen}
        loading={registering}
        onAccept={handleAccept}
        onCancel={() => setDisclaimerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  countdown: {
    fontVariant: ['tabular-nums'],
  },
  centered: {
    textAlign: 'center',
  },
  inProgress: {
    borderTopWidth: 1,
  },
});
