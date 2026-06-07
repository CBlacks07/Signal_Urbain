import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = { dark: '#1A472A', orange: '#D4760A' };

// Icones SVG-like dessinees avec des View/Text purs (pas d'emoji)
function HomeIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Toit */}
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: size * 0.5, borderRightWidth: size * 0.5,
        borderBottomWidth: size * 0.38, borderLeftColor: 'transparent',
        borderRightColor: 'transparent', borderBottomColor: color,
        marginBottom: -1,
      }} />
      {/* Corps */}
      <View style={{
        width: size * 0.7, height: size * 0.45,
        backgroundColor: color, borderBottomLeftRadius: 2, borderBottomRightRadius: 2,
      }} />
    </View>
  );
}

function AlertIcon({ size = 24 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.7, fontWeight: '900', color: '#fff', lineHeight: size }}>!</Text>
    </View>
  );
}

function ProfileIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Tete */}
      <View style={{
        width: size * 0.38, height: size * 0.38,
        borderRadius: size * 0.19, backgroundColor: color, marginBottom: 1,
      }} />
      {/* Corps */}
      <View style={{
        width: size * 0.65, height: size * 0.28,
        backgroundColor: color, borderTopLeftRadius: size * 0.3,
        borderTopRightRadius: size * 0.3,
      }} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#EDECEA',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: COLORS.dark,
        tabBarInactiveTintColor: '#B0ADA8',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.fab}>
              <AlertIcon />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
