import { useEffect, useRef, type ReactNode } from "react";
import {
  Animated,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

// The width-based bar animation must run on the JS driver; transforms/opacity
// can use the native driver everywhere except web (where it isn't supported).
const USE_NATIVE_DRIVER = Platform.OS !== "web";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = PressableProps & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

/** A Pressable that gently springs down while pressed. */
export function PressableScale({
  children,
  style,
  scaleTo = 0.96,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const springTo = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: USE_NATIVE_DRIVER,
      friction: 7,
      tension: 220,
    }).start();

  return (
    <AnimatedPressableBase
      {...rest}
      onPressIn={(event) => {
        springTo(scaleTo);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        springTo(1);
        onPressOut?.(event);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressableBase>
  );
}

/** Fades and rises its children in on mount. */
export function FadeInView({
  children,
  style,
  delay = 0,
  duration = 420,
  offset = 12,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
  offset?: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [progress, duration, delay]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] });

  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

/**
 * The animated fill of a progress bar; render it inside a fixed-size track.
 * The width animates to `percent` (0–100) whenever it changes.
 */
export function AnimatedBar({
  percent,
  color,
  style,
}: {
  percent: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(value, {
      toValue: percent,
      duration: 650,
      useNativeDriver: false,
    }).start();
  }, [percent, value]);

  const width = value.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return <Animated.View style={[style, { width, backgroundColor: color }]} />;
}
