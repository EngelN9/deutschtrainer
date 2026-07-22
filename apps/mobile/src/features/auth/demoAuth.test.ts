import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { userSettingsResponseSchema } from "@deutschtrainer/validation";
import {
  demoAuthEnabled,
  demoUserSettings,
  isDemoAuthActive,
  persistDemoAuthActive,
} from "./demoAuth";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    removeItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const getItem = jest.mocked(AsyncStorage.getItem);
const removeItem = jest.mocked(AsyncStorage.removeItem);
const setItem = jest.mocked(AsyncStorage.setItem);

describe("offline demo authentication", () => {
  beforeEach(() => {
    getItem.mockReset();
    removeItem.mockReset();
    setItem.mockReset();
  });

  it("ships a complete, onboarding-ready demo profile", () => {
    expect(demoAuthEnabled).toBe(true);
    expect(userSettingsResponseSchema.parse(demoUserSettings).profile).toMatchObject({
      displayName: "Demo 學習者",
      onboardingCompleted: true,
      role: "learner",
    });
  });

  it("persists and clears the local demo session without a token", async () => {
    setItem.mockResolvedValue();
    getItem.mockResolvedValue("active");
    removeItem.mockResolvedValue();

    await persistDemoAuthActive(true);
    expect(setItem).toHaveBeenCalledWith(expect.stringContaining("demo-auth"), "active");
    await expect(isDemoAuthActive()).resolves.toBe(true);

    await persistDemoAuthActive(false);
    expect(removeItem).toHaveBeenCalledWith(expect.stringContaining("demo-auth"));
  });
});
