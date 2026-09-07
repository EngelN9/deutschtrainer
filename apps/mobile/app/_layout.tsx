import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotificationCoordinator } from "../src/features/notifications/NotificationCoordinator";
import { OfflineCoordinator } from "../src/features/offline/OfflineCoordinator";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <OfflineCoordinator />
        <NotificationCoordinator />
        <Stack
          screenOptions={{
            animation: "fade_from_bottom",
            animationDuration: 180,
            headerShown: false,
          }}
        />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
