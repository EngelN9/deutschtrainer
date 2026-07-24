import Constants from "expo-constants";
import { Platform } from "react-native";
import { mobileEnv } from "./env";

const configuredBuild =
  Platform.OS === "android"
    ? Constants.expoConfig?.android?.versionCode
    : Constants.expoConfig?.ios?.buildNumber;

export const mobileReleaseInfo = {
  apiRelease: mobileEnv.apiRelease,
  appEnvironment: mobileEnv.appEnvironment,
  appRelease: mobileEnv.appRelease,
  appVersion: Constants.expoConfig?.version ?? "unknown",
  buildVersion: configuredBuild === undefined ? "unknown" : String(configuredBuild),
  contentRelease: mobileEnv.contentRelease,
  contentSource: mobileEnv.contentSource,
} as const;
