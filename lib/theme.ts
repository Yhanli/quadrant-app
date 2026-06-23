import type { ViewStyle } from "react-native";

// Editorial serif used for display headings; body text stays on the system sans.
export const Fonts = {
  serif: "Fraunces_600SemiBold",
  serifMedium: "Fraunces_500Medium",
  serifRegular: "Fraunces_400Regular",
};

// Warm off-white gradient that forms the base of every screen.
export const SCREEN_GRADIENT = ["#FBF9F5", "#F1EDE5"] as const;

// Soft, layered shadow for gentle depth on cards.
export const softShadow: ViewStyle = {
  shadowColor: "#3A332A",
  shadowOpacity: 0.07,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};
