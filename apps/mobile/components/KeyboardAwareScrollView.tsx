import { forwardRef, useEffect, useRef, useState } from 'react';
import {
  ScrollView, ScrollViewProps, Keyboard, TextInput, Platform,
  findNodeHandle,
} from 'react-native';

/**
 * ScrollView qui amène TOUJOURS le champ de saisie focalisé au-dessus du clavier,
 * sur Android comme sur iOS — indépendamment du mode natif (adjustResize/adjustPan).
 *
 * Pourquoi ce composant : ni `KeyboardAvoidingView` (qui ajoute juste du padding
 * sans défiler vers le champ) ni `automaticallyAdjustKeyboardInsets` (iOS only)
 * ne garantissent que le champ focalisé soit visible. Ici on :
 *  1. ajoute un padding bas = hauteur du clavier (donne de la place pour défiler),
 *  2. défile nativement jusqu'au champ focalisé via le ScrollResponder.
 */
type Props = ScrollViewProps & { extraOffset?: number };

export const KeyboardAwareScrollView = forwardRef<ScrollView, Props>(
  ({ children, extraOffset = 24, contentContainerStyle, ...props }, _ref) => {
    const scrollRef = useRef<ScrollView>(null);
    const [kbHeight, setKbHeight] = useState(0);

    useEffect(() => {
      const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

      const scrollToFocused = () => {
        const focused = TextInput.State.currentlyFocusedInput?.();
        const responder: any = scrollRef.current?.getScrollResponder?.();
        const node = focused ? findNodeHandle(focused as any) : null;
        if (responder?.scrollResponderScrollNativeHandleToKeyboard && node) {
          // Défile pour que le champ soit à `extraOffset` px au-dessus du clavier.
          responder.scrollResponderScrollNativeHandleToKeyboard(node, extraOffset, true);
        }
      };

      const showSub = Keyboard.addListener(showEvt, (e) => {
        setKbHeight(e.endCoordinates?.height ?? 0);
        // Laisse le focus + le layout s'établir avant de défiler (surtout Android).
        requestAnimationFrame(() => setTimeout(scrollToFocused, 0));
      });
      const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));

      return () => { showSub.remove(); hideSub.remove(); };
    }, [extraOffset]);

    return (
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[contentContainerStyle, { paddingBottom: kbHeight + extraOffset }]}
        {...props}
      >
        {children}
      </ScrollView>
    );
  },
);

KeyboardAwareScrollView.displayName = 'KeyboardAwareScrollView';

export default KeyboardAwareScrollView;
