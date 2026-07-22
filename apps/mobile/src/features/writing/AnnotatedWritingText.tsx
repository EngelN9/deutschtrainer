import { useMemo } from "react";
import type { WritingFeedback } from "@deutschtrainer/ai-schemas";
import { StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";

type InlineError = WritingFeedback["inlineErrors"][number];

interface AnnotatedWritingTextProps {
  errors: InlineError[];
  onSelectError: (error: InlineError) => void;
  selectedError?: InlineError;
  textDe: string;
}

interface TextSegment {
  text: string;
  error?: InlineError;
}

export function AnnotatedWritingText({
  errors,
  onSelectError,
  selectedError,
  textDe,
}: AnnotatedWritingTextProps) {
  const segments = useMemo(() => createSegments(textDe, errors), [errors, textDe]);

  return (
    <View style={styles.container}>
      <Text selectable style={styles.text}>
        {segments.map((segment, index) =>
          segment.error ? (
            <Text
              accessibilityLabel={`錯誤片段：${segment.text}`}
              key={`${segment.error.startOffset}-${index}`}
              onPress={() => onSelectError(segment.error as InlineError)}
              style={[
                styles.errorText,
                selectedError?.startOffset === segment.error.startOffset
                  ? styles.selectedErrorText
                  : null,
              ]}
            >
              {segment.text}
            </Text>
          ) : (
            <Text key={`plain-${index}`}>{segment.text}</Text>
          ),
        )}
      </Text>
    </View>
  );
}

function createSegments(text: string, errors: InlineError[]): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const error of [...errors].sort((left, right) => left.startOffset - right.startOffset)) {
    if (error.startOffset > cursor) {
      segments.push({ text: text.slice(cursor, error.startOffset) });
    }
    segments.push({ text: text.slice(error.startOffset, error.endOffset), error });
    cursor = error.endOffset;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }
  return segments;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacingTokens.md,
  },
  errorText: {
    backgroundColor: "#FEE2E2",
    color: colorTokens.danger,
    textDecorationLine: "underline",
  },
  selectedErrorText: {
    backgroundColor: "#FECACA",
    fontWeight: "800",
  },
  text: {
    color: colorTokens.text,
    fontSize: 17,
    lineHeight: 29,
  },
});
