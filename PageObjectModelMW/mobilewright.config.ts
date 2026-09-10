import { defineConfig } from 'mobilewright';
import { resolve } from 'node:path';

export default defineConfig({
  platform: 'android',
  bundleId: 'com.way2automation.medishop',
  deviceName: process.env.MOBILEWRIGHT_DEVICE_NAME ?? 'Medium_Phone_API_36.0',
  installApps: resolve('app/way2automation.apk'),
  autoAppLaunch: true,
  reporter: 'html',


  //  workers: 2,
  // fullyParallel: true,

  // projects: [
  //   {
  //     name: 'Samsung-RealDevice',
  //     use: {
  //       platform: 'android',
  //       deviceName: 'R3CT204N57L',
  //       bundleId: 'com.way2automation.medishop',
  //       installApps: './app/way2automation.apk',
  //       autoAppLaunch: true,
  //     },
  //   },
  //   {
  //     name: 'Emulator',
  //     use: {
  //       platform: 'android',
  //       deviceName: 'emulator-5554',
  //       bundleId: 'com.way2automation.medishop',
  //       installApps: './app/way2automation.apk',
  //       autoAppLaunch: true,
  //     },
  //   },
  // ],
  timeout: 90_000,
});