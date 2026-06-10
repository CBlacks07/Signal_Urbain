import { useEffect, useRef, useState } from 'react';
import {
  ScrollView, ScrollViewProps, Keyboard, TextInput, Platform,
  findNodeHandle, NativeSyntheticEvent, NativeScrollEvent, LayoutChangeEvent,
} from 'react-native';

/**
 * ScrollView qui garantit que le champ de saisie focalisé reste visible au-dessus
 * du clavier — sur Android (adjustResize OU adjustPan) comme sur iOS.
 *
 * Principe (volontairement simple et indépendant du mode clavier natif) :
 *  - on connaît en permanence la hauteur visible de la ScrollView (onLayout),
 *    la position de défilement actuelle (onScroll) et la hauteur du clavier ;
 *  - quand le clavier s'ouvre, on mesure la position réelle du champ focalisé
 *    dans la ScrollView et, s'il est masqué par le clavier, on défile EXACTEMENT
 *    ce qu'il faut pour le faire apparaître (avec une petite marge).
 */
type Props = ScrollViewProps & { extraOffset?: number };

export function KeyboardAwareScrollView({
  children, extraOffset = 16, contentContainerStyle, onScroll, onLayout, ...props
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const offsetY = useRef(0);       // position de défilement courante
  const viewportH = useRef(0);     // hauteur visible de la ScrollView
  const kbHeightRef = useRef(0);   // hauteur du clavier
  const [kbHeight, setKbHeight] = useState(0);

  const scrollFocusedIntoView = () => {
    const focused: any = TextInput.State.currentlyFocusedInput?.();
    const scrollNode = findNodeHandle(scrollRef.current);
    if (!focused?.measureLayout || !scrollNode) return;

    focused.measureLayout(
      scrollNode,
      (_x: number, y: number, _w: number, h: number) => {
        // `y` = position du champ relative au haut VISIBLE de la ScrollView.
        // Sur iOS le clavier recouvre la ScrollView -> on retire sa hauteur.
        // Sur Android (adjustResize) la ScrollView est déjà réduite -> rien à retirer.
        const overlay = Platform.OS === 'ios' ? kbHeightRef.current : 0;
        const visibleBottom = viewportH.current - overlay;
        const fieldBottom = y + h + extraOffset;

        if (fieldBottom > visibleBottom) {
          const delta = fieldBottom - visibleBottom;
          scrollRef.current?.scrollTo({ y: Math.max(0, offsetY.current + delta), animated: true });
        }
      },
      () => {},
    );
  };

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvt, (e) => {
      const h = e?.endCoordinates?.height ?? 0;
      kbHeightRef.current = h;
      setKbHeight(h);
      // Laisse le clavier + le redimensionnement Android se stabiliser avant de mesurer.
      setTimeout(scrollFocusedIntoView, Platform.OS === 'ios' ? 50 : 220);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      kbHeightRef.current = 0;
      setKbHeight(0);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, [extraOffset]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetY.current = e.nativeEvent.contentOffset.y;
    onScroll?.(e);
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    viewportH.current = e.nativeEvent.layout.height;
    onLayout?.(e);
  };

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={handleScroll}
      onLayout={handleLayout}
      contentContainerStyle={[contentContainerStyle, { paddingBottom: kbHeight + 24 }]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

export default KeyboardAwareScrollView;
