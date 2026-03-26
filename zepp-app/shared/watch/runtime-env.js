import { Battery } from "@zos/sensor";

export function isBatteryLevelSimulatorHint(currentBatteryLevel) {
  return Number(currentBatteryLevel) === 0;
}

export function getDeviceRuntimeEnvironment() {
  let batteryLevel = null;

  try {
    const battery = new Battery();

    if (typeof battery.getCurrent === "function") {
      batteryLevel = battery.getCurrent();
    }
  } catch (error) {
    console.log("Failed to read battery runtime hint", error);
  }

  return {
    batteryLevel,
    isSimulatorHint: isBatteryLevelSimulatorHint(batteryLevel)
  };
}

export function isProbablySimulatorDevice() {
  return getDeviceRuntimeEnvironment().isSimulatorHint;
}
