import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV?.trim() || "local";
  if (!["local", "preview", "production"].includes(appEnvironment)) {
    throw new Error("EXPO_PUBLIC_APP_ENV must be local, preview, or production.");
  }

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        "expo-build-properties",
        {
          android: {
            // A physical device may use a LAN HTTP API only during local development.
            // Preview and production builds are HTTPS-only.
            usesCleartextTraffic: appEnvironment === "local",
          },
        },
      ],
    ],
  } as ExpoConfig;
};
