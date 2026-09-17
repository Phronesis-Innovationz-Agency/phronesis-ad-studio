import type { CapacitorConfig } from '@capacitor/cli';

// This app is a thin WebView wrapper, not an offline bundle - the real app
// (Claude generation, TTS, Remotion rendering, Stripe checkout, job polling)
// only runs on the hosted server, so the APK just loads that server's URL
// full-screen rather than shipping web-ui/ as static assets. `webDir` still
// has to point at a real folder for `cap` to be happy even though its
// contents are never used at runtime once `server.url` is set below.
//
// Live at https://phronesis-ad-studio.onrender.com (Render assigned this
// from the service name in render.yaml). If the service is ever renamed or
// redeployed under a different name, update `server.url` below to match and
// rebuild the APK.
const config: CapacitorConfig = {
  appId: 'com.phronesisinnovationz.adstudio',
  appName: 'Phronesis Ad Studio',
  webDir: 'web-ui',
  server: {
    url: 'https://phronesis-ad-studio.onrender.com',
    cleartext: false,
  },
};

export default config;
