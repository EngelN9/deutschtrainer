import { StyleSheet, Text, TextInput, View } from "react-native";
import { colorTokens, radiusTokens, spacingTokens, typographyTokens } from "@deutschtrainer/ui";

interface TextFieldProps {
  accessibilityLabel: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
  keyboardType?: "default" | "email-address";
  label: string;
  onBlur: () => void;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  value: string;
}

export function TextField({
  accessibilityLabel,
  autoCapitalize = "sentences",
  error,
  keyboardType = "default",
  label,
  onBlur,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  value,
}: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        onBlur={onBlur}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    color: colorTokens.danger,
    fontSize: typographyTokens.bodySmall.fontSize,
    lineHeight: typographyTokens.bodySmall.lineHeight,
  },
  input: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.borderInput,
    borderRadius: radiusTokens.sm,
    borderWidth: 1,
    color: colorTokens.text,
    fontSize: typographyTokens.body.fontSize,
    minHeight: 48,
    paddingHorizontal: spacingTokens.md,
    paddingVertical: spacingTokens.sm,
  },
  inputError: {
    borderColor: colorTokens.danger,
  },
  label: {
    color: colorTokens.text,
    fontSize: typographyTokens.label.fontSize,
    fontWeight: typographyTokens.label.fontWeight,
    lineHeight: typographyTokens.label.lineHeight,
  },
  wrapper: {
    gap: spacingTokens.xs,
  },
});
