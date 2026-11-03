import { ExpoConfig } from 'expo/config';
const config: ExpoConfig = {
  name: 'FOLIO', slug: 'folio', version: '0.1.0', orientation: 'portrait',
  userInterfaceStyle: 'automatic', icon: './assets/icon.png',
  newArchEnabled: true,
  android: {
    package: 'app.folio.reading', versionCode: 1,
    adaptiveIcon: { foregroundImage: './assets/adaptive-foreground.png', backgroundImage: './assets/adaptive-background.png', monochromeImage: './assets/adaptive-monochrome.png', backgroundColor: '#182D2C' },
    permissions: [], blockedPermissions: ['android.permission.RECORD_AUDIO', 'android.permission.SYSTEM_ALERT_WINDOW'],
    edgeToEdgeEnabled: true, predictiveBackGestureEnabled: true,
    allowBackup: false,
  },
  plugins: [
    ['expo-splash-screen', { backgroundColor: '#182D2C', image: './assets/splash.png', imageWidth: 180, dark: {backgroundColor: '#182D2C',image:'./assets/splash.png'} }],
    ['expo-image-picker', { photosPermission: 'Выберите обложку книги для локальной библиотеки FOLIO.', cameraPermission: false, microphonePermission: false }],
    './plugins/withLocalRelease',
  ],
};
export default config;
