import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../lib/theme';

/** Bloc gris animé (pulsation) servant de placeholder pendant le chargement. */
export function Skeleton({ width, height, radius = RADIUS.sm, style }: {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: radius, backgroundColor: '#E6E3DF', opacity },
        style,
      ]}
    />
  );
}

/** Carte placeholder reproduisant la silhouette d'un incident dans les listes. */
export function IncidentCardSkeleton() {
  return (
    <View style={styles.card} accessibilityLabel="Chargement en cours">
      <View style={styles.row}>
        <Skeleton width={90} height={18} radius={6} />
        <Skeleton width={64} height={18} radius={RADIUS.pill} />
      </View>
      <Skeleton width="100%" height={12} style={{ marginTop: SPACING.md }} />
      <Skeleton width="70%" height={12} style={{ marginTop: 6 }} />
      <View style={[styles.row, { marginTop: SPACING.md }]}>
        <Skeleton width={120} height={10} />
        <Skeleton width={40} height={10} />
      </View>
    </View>
  );
}

/** Liste de N cartes placeholder. */
export function IncidentListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <IncidentCardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
