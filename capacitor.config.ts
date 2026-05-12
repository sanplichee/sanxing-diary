import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sanxing.diary',
  appName: '三省日记',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#F8FAFC',
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
