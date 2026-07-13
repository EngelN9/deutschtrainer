import { useEffect } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Pause, Play, RotateCcw } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { formatAudioTime } from "./audioLabels";

interface AudioPlayerControlsProps {
  sourceUri?: string;
  onPlay?: (slow: boolean) => void;
}

export function AudioPlayerControls({ sourceUri, onPlay }: AudioPlayerControlsProps) {
  const player = useAudioPlayer(sourceUri ?? null, { updateInterval: 200 });
  const status = useAudioPlayerStatus(player);
  const slow = status.playbackRate < 0.9;

  useEffect(() => {
    player.replace(sourceUri ?? null);
  }, [player, sourceUri]);

  const togglePlay = () => {
    if (!sourceUri) return;
    if (status.playing) {
      player.pause();
    } else {
      player.play();
      onPlay?.(slow);
    }
  };

  const replay = () => {
    if (!sourceUri) return;
    void player.seekTo(0);
    player.play();
    onPlay?.(slow);
  };

  const setRate = (rate: number) => {
    player.setPlaybackRate(rate, "medium");
  };

  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Pressable
          accessibilityLabel={status.playing ? "暫停音訊" : "播放音訊"}
          accessibilityRole="button"
          disabled={!sourceUri}
          onPress={togglePlay}
          style={({ pressed }) => [
            styles.primaryControl,
            pressed ? styles.pressed : null,
            !sourceUri ? styles.disabled : null,
          ]}
        >
          {status.playing ? (
            <Pause color="#FFFFFF" fill="#FFFFFF" size={22} />
          ) : (
            <Play color="#FFFFFF" fill="#FFFFFF" size={22} />
          )}
        </Pressable>
        <Pressable
          accessibilityLabel="從頭播放"
          accessibilityRole="button"
          disabled={!sourceUri}
          onPress={replay}
          style={({ pressed }) => [
            styles.iconControl,
            pressed ? styles.pressed : null,
            !sourceUri ? styles.disabled : null,
          ]}
        >
          <RotateCcw color={colorTokens.text} size={20} />
        </Pressable>
        <View accessibilityRole="radiogroup" style={styles.rateControl}>
          {[1, 0.75].map((rate) => {
            const active = Math.abs(status.playbackRate - rate) < 0.05;
            return (
              <Pressable
                accessibilityLabel={rate === 1 ? "正常速度" : "慢速播放"}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                key={rate}
                onPress={() => setRate(rate)}
                style={[styles.rateOption, active ? styles.rateOptionActive : null]}
              >
                <Text style={[styles.rateText, active ? styles.rateTextActive : null]}>
                  {rate === 1 ? "1×" : "0.75×"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.timelineRow}>
        <Text style={styles.time}>{formatAudioTime(status.currentTime)}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.time}>{formatAudioTime(status.duration)}</Text>
      </View>
      {status.error ? <Text style={styles.error}>音訊載入失敗，請重新取得音檔。</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.md,
    minHeight: 112,
    padding: spacingTokens.md,
  },
  controls: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.sm,
  },
  disabled: { opacity: 0.45 },
  error: { color: colorTokens.danger, fontSize: 13, lineHeight: 19 },
  fill: { backgroundColor: colorTokens.primary, height: "100%" },
  iconControl: {
    alignItems: "center",
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pressed: { opacity: 0.72 },
  primaryControl: {
    alignItems: "center",
    backgroundColor: colorTokens.primary,
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 48,
  },
  rateControl: {
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    marginLeft: "auto",
    overflow: "hidden",
  },
  rateOption: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    minWidth: 58,
    paddingHorizontal: spacingTokens.sm,
  },
  rateOptionActive: { backgroundColor: "#E8F0FE" },
  rateText: { color: colorTokens.mutedText, fontSize: 13, fontWeight: "800" },
  rateTextActive: { color: colorTokens.primary },
  time: { color: colorTokens.mutedText, fontSize: 12, fontVariant: ["tabular-nums"], width: 36 },
  timelineRow: { alignItems: "center", flexDirection: "row", gap: spacingTokens.sm },
  track: {
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    flex: 1,
    height: 7,
    overflow: "hidden",
  },
});
