import { defineConfig } from 'mobilewright';
import { MobileNextDriver } from '@mobilewright/driver-mobilenext';
import { browserStackDriver } from '@browserstack/mobilewright';
import { resolve } from 'node:path';

const runOnMobileNextCloud = process.env.MOBILEWRIGHT_CLOUD === '1';
const runOnBrowserStack = process.env.MOBILEWRIGHT_BROWSERSTACK === '1';
const apkPath = resolve('app/way2automation.apk');

export default defineConfig({
  platform: 'android',
  bundleId: 'com.way2automation.medishop',
  deviceName: runOnMobileNextCloud
    ? /Google Pixel 10/
    : runOnBrowserStack
      ? new RegExp(process.env.BROWSERSTACK_DEVICE_NAME ?? 'Google Pixel 8')
      : process.env.MOBILEWRIGHT_DEVICE_NAME ?? 'Medium_Phone_API_36.0',
  deviceType: runOnMobileNextCloud || runOnBrowserStack ? 'real' : undefined,
  installApps: runOnBrowserStack ? undefined : apkPath,
  autoAppLaunch: true,
  reporter: 'html',
  driver: runOnMobileNextCloud
    ? new MobileNextDriver({
      apiKey: process.env.MOBILE_NEXT_API_KEY,
      allocationTimeout: 300_000,
    })
    : runOnBrowserStack
      ? browserStackDriver({
        app: apkPath,
        project: 'MobileWright_POC',
      })
      : undefined,


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