import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { FadeInView, PressableScale } from "@/components/animated";
import { useAuth } from "@/components/auth-provider";
import { ScreenBackground } from "@/components/screen-background";
import { Fonts, softShadow } from "@/lib/theme";

type Mode = "signIn" | "signUp";

export function AuthScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === "signUp";

  const continueWithGoogle = async () => {
    setMessage(null);
    const result = await signInWithGoogle();
    if (result.error) {
      setMessage(result.error);
    }
    // On success the page redirects to Google, so nothing else to do here.
  };

  const submit = async () => {
    setMessage(null);

    if (!email.trim() || !password) {
      setMessage("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    const result = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);
    setIsSubmitting(false);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    if (result.needsEmailConfirmation) {
      setMessage("Check your email to confirm your account, then sign in.");
      setMode("signIn");
    }
    // On success with a session, AuthProvider's listener swaps to the app.
  };

  const switchMode = () => {
    setMode(isSignUp ? "signIn" : "signUp");
    setMessage(null);
  };

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <FadeInView style={styles.card}>
        <Text style={styles.brand}>Quadrant</Text>
        <Text style={styles.tagline}>Spend more time on what matters.</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? "Create your account" : "Welcome back"}
        </Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#A1A1A1"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          style={styles.input}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#A1A1A1"
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          secureTextEntry
          style={styles.input}
        />

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <PressableScale
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={submit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>{isSignUp ? "Create account" : "Sign in"}</Text>
          )}
        </PressableScale>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <PressableScale style={styles.googleButton} onPress={continueWithGoogle}>
          <Ionicons name="logo-google" size={18} color="#3F3F3F" />
          <Text style={styles.googleText}>Continue with Google</Text>
        </PressableScale>

        <Pressable onPress={switchMode} style={styles.switchButton}>
          <Text style={styles.switchText}>
            {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
          </Text>
        </Pressable>
      </FadeInView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 30,
    ...softShadow,
  },
  brand: {
    fontFamily: Fonts.serif,
    fontSize: 40,
    color: "#2B2B2B",
    letterSpacing: 0.2,
  },
  tagline: {
    fontSize: 14,
    color: "#556B4D",
    marginTop: 6,
    fontWeight: "500",
  },
  subtitle: {
    fontSize: 15,
    color: "#8B8B8B",
    marginTop: 16,
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "#FAFAF8",
  },
  message: {
    color: "#8A5A4A",
    fontSize: 13,
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#556B4D",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ECE9E2",
  },
  dividerText: {
    color: "#A1A1A1",
    fontSize: 13,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0DED7",
    backgroundColor: "#FFFFFF",
  },
  googleText: {
    color: "#3F3F3F",
    fontSize: 15,
    fontWeight: "600",
  },
  switchButton: {
    marginTop: 18,
    alignItems: "center",
  },
  switchText: {
    color: "#556B4D",
    fontWeight: "600",
    fontSize: 14,
  },
});
