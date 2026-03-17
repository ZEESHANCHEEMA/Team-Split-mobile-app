#!/usr/bin/env node
/**
 * Copies assets/splash.png to iOS SplashScreenLegacy.imageset so the native
 * splash screen uses the same image as app.json. Run after changing the splash
 * or after `npx expo prebuild` if you use a custom splash.
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const splashSource = path.join(projectRoot, 'assets', 'splash.png');
const imagesetDir = path.join(projectRoot, 'ios', 'teamsplit', 'Images.xcassets', 'SplashScreenLegacy.imageset');

if (!fs.existsSync(splashSource)) {
  console.warn('copy-splash-ios: assets/splash.png not found, skipping.');
  process.exit(0);
}

if (!fs.existsSync(imagesetDir)) {
  console.warn('copy-splash-ios: iOS SplashScreenLegacy.imageset not found, skipping.');
  process.exit(0);
}

const destFiles = ['image.png', 'image@2x.png', 'image@3x.png'];
destFiles.forEach((name) => {
  const dest = path.join(imagesetDir, name);
  fs.copyFileSync(splashSource, dest);
  console.log('copy-splash-ios: copied splash to', name);
});

console.log('copy-splash-ios: done.');
