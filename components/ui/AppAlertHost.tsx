/**
 * AppAlertHost — Vyra's own styled replacement for the OS Alert dialog.
 * Mounted exactly once, at the app root (app/_layout.tsx). Registers itself
 * with lib/ui/appAlert.ts's imperative bridge on mount so any screen can
 * call `AppAlert.alert(title, message, buttons)` — same shape as React
 * Native's `Alert.alert` — without needing this component anywhere in its
 * own tree.
 *
 * Visual shell reuses PremiumModal (backdrop + animated card — see that
 * file); this component owns the title/message/button-row content on top of
 * it, so every call site gets that layout for free instead of hand-building
 * it (which is what several screens were already doing ad hoc for their OWN
 * one-off modals before this — see e.g. edit-garment.tsx's photo-source
 * picker).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PremiumModal } from './PremiumModal';
import { PremiumTouchable } from './PremiumTouchable';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import { registerAppAlertHost, AppAlertButton } from '../../lib/ui/appAlert';

interface AlertState {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
}

export function AppAlertHost() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [state, setState] = useState<AlertState | null>(null);

  const show = useCallback(
    (title: string, message?: string, buttons?: AppAlertButton[]) => {
      // Matches native Alert.alert's own default: omitting `buttons`
      // entirely renders a single "OK" dismiss button, not an empty dialog.
      setState({ title, message, buttons: buttons && buttons.length > 0 ? buttons : [{ text: t('common.ok') }] });
    },
    [t]
  );

  useEffect(() => {
    registerAppAlertHost(show);
    return () => registerAppAlertHost(null);
  }, [show]);

  const dismiss = () => setState(null);

  const handlePress = (button: AppAlertButton) => {
    // Close first, then fire the callback — the dialog is gone before the
    // handler's own side effects (navigation, another alert, an async
    // request) run, matching the native Alert's timing instead of leaving a
    // button visible mid-press while something async happens behind it.
    dismiss();
    button.onPress?.();
  };

  return (
    <PremiumModal isVisible={!!state} onClose={dismiss}>
      {state && (
        <View>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{state.title}</Text>
          {state.message ? (
            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{state.message}</Text>
          ) : null}

          <View style={state.buttons.length > 2 ? styles.buttonColumn : styles.buttonRow}>
            {state.buttons.map((button, index) => {
              const isDestructive = button.style === 'destructive';
              const isCancel = button.style === 'cancel';
              // 'default' and 'destructive' both read as the "committing"
              // action visually (filled button) — only 'cancel' gets the
              // quieter outlined treatment, same convention the app's
              // hand-rolled two-button rows already used before this.
              const isPrimary = !isCancel;

              return (
                <PremiumTouchable
                  key={`${button.text}-${index}`}
                  style={[
                    styles.button,
                    isPrimary
                      ? { backgroundColor: isDestructive ? theme.colors.danger : theme.colors.accent }
                      : { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border, borderWidth: 1 },
                  ]}
                  onPress={() => handlePress(button)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: isPrimary ? theme.colors.accentForeground : theme.colors.textPrimary },
                    ]}
                  >
                    {button.text}
                  </Text>
                </PremiumTouchable>
              );
            })}
          </View>
        </View>
      )}
    </PremiumModal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  buttonColumn: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 22,
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
