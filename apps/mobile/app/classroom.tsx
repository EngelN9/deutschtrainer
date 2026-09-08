import { Platform, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../src/features/auth/AuthGate";
import { ContentScreen } from "../src/components/ContentScreen";

// The classroom is a separate Vite bundle (Excalidraw, react-dom, WebRTC) published into this
// app's own static output at /classroom-app/, and reached through a same-origin iframe. Keeping it
// out of the Metro bundle means the shared web bundle does not grow, the native build never has to
// resolve browser-only packages, and the classroom's global stylesheet stays sandboxed. Same origin
// is what removes the second login: both documents read one Supabase session from one localStorage.
//
// One file rather than a ClassroomFrame.web.tsx split on purpose — apps/mobile/tsconfig.json
// includes app/**/*.tsx and src/**/*.ts but not src/**/*.tsx, so a .web.tsx component that nothing
// imports on the native side would never be typechecked.
const CLASSROOM_URL = "/classroom-app/index.html";

// ponytail: a fixed frame height inside ContentScreen's ScrollView, which is a tuning knob rather
// than a truth. Give the classroom its own full-height layout if the board ever needs the viewport.
const frameStyle = {
  border: 0,
  display: "block",
  height: "min(80vh, 1200px)",
  minHeight: 560,
  width: "100%",
} as const;

export default function ClassroomScreen() {
  return (
    <AuthGate mode="protected">
      <ContentScreen
        description="與 AI 導師語音對話，白板會同步寫下你正在學的德文。"
        eyebrow="虛擬教室"
        showMainNavigation
        title="德語語音虛擬教室"
      >
        {Platform.OS === "web" ? (
          // allow= is redundant while the frame is same-origin (Permissions Policy defaults
          // microphone to `self`, which covers same-origin children), but it is what keeps the
          // microphone working if the classroom is ever served from its own origin.
          <iframe allow="microphone" src={CLASSROOM_URL} style={frameStyle} title="虛擬教室" />
        ) : (
          <View style={styles.unsupported}>
            <Text style={styles.unsupportedText}>
              虛擬教室需要瀏覽器的麥克風與 WebRTC 支援，目前僅提供網頁版。
            </Text>
          </View>
        )}
      </ContentScreen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  unsupported: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacingTokens.lg,
  },
  unsupportedText: {
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
});
