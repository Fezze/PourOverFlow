import { ble } from "./runtime.ts";

export const createConnect = ble.createConnect;
export const disConnect = ble.disConnect;
export const send = ble.send;
export const connectStatus = ble.connectStatus;
export const addListener = ble.addListener;
export const removeListener = ble.removeListener;
