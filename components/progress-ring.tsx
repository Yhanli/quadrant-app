import { type ReactNode, useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** An Apple-Watch-style progress ring. `progress` is 0–1. */
export function ProgressRing({
  progress,
  size = 170,
  strokeWidth = 16,
  color = "#556B4D",
  trackColor = "#E7E3DA",
  children,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const animated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animated, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration: 800,
      // strokeDashoffset isn't supported by the native driver.
      useNativeDriver: false,
    }).start();
  }, [animated, progress]);

  const strokeDashoffset = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {/* Rotate just the SVG so the ring starts at the top, leaving the
          centred children upright. */}
      <View style={styles.rotated}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </Svg>
      </View>
      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  rotated: {
    position: "absolute",
    transform: [{ rotate: "-90deg" }],
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
