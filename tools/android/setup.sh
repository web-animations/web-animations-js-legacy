#! /bin/bash

# Create the python environment needed by run-tests.py and closure-linter and
# other Python tools.

set -e

OLD_PWD=$PWD
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

# Download the android emualtor and adb
if [ ! -d adt ]; then
  wget -c https://dl.google.com/android/adt/adt-bundle-linux-$(uname -p)-20130729.zip -O adt.zip
  unzip adt.zip > /dev/null
  ls -l adt*
  mv adt-bundle-linux-* adt
fi
export ADB=$DIR/adt/sdk/platform-tools/adb
export EMULATOR=$DIR/adt/sdk/tools/emulator
export AVD=$DIR/adt/sdk/tools/android

# Download the chromedriver binary
if [ ! -e chromedriver ]; then
  wget -c https://chromedriver.googlecode.com/files/chromedriver_linux64_2.2.zip  -O chromedriver.zip
  unzip chromedriver.zip
fi
export CHROMEDRIVER=$DIR/chromedriver

# Create an Android Virtual Device
if [ ! -e avd ]; then
  echo "" | $AVD --verbose create avd -n Android-Chrome --target 1 --force --path avd
fi

#  # Start up the emulator so we can take a snapshot
#  ./adt/sdk/tools/emulator @Android-Chrome &
#  EMULATOR_PID=$!
#  adb wait-for-device

if [ -e Chrome.apk ]; then
  CHROME_APK=$DIR/Chrome.apk
  CHROME_APP=com.google.android.apps.chrome
else
  if [ ! -e chrome-android/apks/ChromiumTestShell.apk ]; then
    LATEST=`curl -s http://commondatastorage.googleapis.com/chromium-browser-continuous/Android/LAST_CHANGE`
    REMOTE_APK=http://commondatastorage.googleapis.com/chromium-browser-continuous/Android/$LATEST/chrome-android.zip
    wget -c $REMOTE_APK
    unzip chrome-android.zip
  fi
  CHROME_APK=$DIR/chrome-android/apks/ChromiumTestShell.apk
  CHROME_APP=org.chromium.chrome.testshell
fi

set +e

cd $OLD_PWD
