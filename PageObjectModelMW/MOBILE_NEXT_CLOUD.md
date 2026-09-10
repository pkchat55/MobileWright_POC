# Mobile Next Cloud

Run Android tests on a real Google Pixel 10 device:

1. Sign in locally with `npx mobilecli auth login`.
2. Export the Mobile Next API key as `MOBILE_NEXT_API_KEY`.
3. Run `npm run test:cloud`.

The cloud mode uses a real Android device. It installs `app/way2automation.apk`, runs the maintained test spec, then releases the device.

For GitHub Actions, create a repository secret named `MOBILE_NEXT_API_KEY` and set `MOBILEWRIGHT_CLOUD=1` in the cloud workflow.