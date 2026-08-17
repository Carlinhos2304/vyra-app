/**
 * appAlert.ts
 *
 * Drop-in, same-signature replacement for React Native's `Alert.alert()` —
 * at every call site the only change is the import (`AppAlert` from here
 * instead of `Alert` from 'react-native') and the call itself
 * (`AppAlert.alert(...)` instead of `Alert.alert(...)`). Title, message, and
 * the buttons array (including `style: 'cancel' | 'destructive'`) all mean
 * exactly the same thing. This exists purely so every confirmation/error
 * dialog in the app renders with Vyra's own look (see
 * components/ui/AppAlertHost.tsx) instead of the OS's default Android/iOS
 * alert chrome (2026-08-17, user request).
 *
 * Works imperatively from anywhere — no hook, no component-tree access
 * needed, same as the native Alert.alert — via a tiny module-level bridge:
 * AppAlertHost (mounted exactly once, at the app root in app/_layout.tsx)
 * registers its own "show" function here on mount. If this is ever called
 * before that registration completes (shouldn't happen — the host mounts
 * before any screen can call this), it falls back to the real native Alert
 * so a dialog is never silently lost.
 */
import { Alert } from 'react-native';

export type AppAlertButtonStyle = 'default' | 'cancel' | 'destructive';

export interface AppAlertButton {
  text: string;
  onPress?: () => void;
  style?: AppAlertButtonStyle;
}

type ShowFn = (title: string, message?: string, buttons?: AppAlertButton[]) => void;

let showHandler: ShowFn | null = null;

/** Called by AppAlertHost only — not for use anywhere else. */
export function registerAppAlertHost(fn: ShowFn | null) {
  showHandler = fn;
}

export const AppAlert = {
  alert(title: string, message?: string, buttons?: AppAlertButton[]) {
    if (!showHandler) {
      console.warn('[AppAlert] Host not mounted yet — falling back to the native Alert.');
      Alert.alert(title, message, buttons as any);
      return;
    }
    showHandler(title, message, buttons);
  },
};
