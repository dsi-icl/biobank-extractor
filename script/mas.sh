#!/bin/bash

set -ex

# App Store does not allow the word "subsections" in the app's name
APP="UK Biobank Extractor"

electron-packager . \
  "$APP" \
  --asar \
  --overwrite \
  --platform=mas \
  --app-bundle-id=uk.ac.ic.dsi.ukbiobank \
  --app-version="$npm_package_version" \
  --build-version="1.1.0" \
  --arch=x64 \
  --icon=sink/app-icon/mac/app.icns \
  --prune=true \
  --out=out \
  --extend-info=sink/mac/info.plist

APP_PATH="./out/biobank-extractor-mas-x64/$APP.app"
RESULT_PATH="./out/$APP.pkg"
APP_KEY="3rd Party Mac Developer Application: GitHub (TOFILL42)"
INSTALLER_KEY="3rd Party Mac Developer Installer: GitHub (TOFILL42)"
FRAMEWORKS_PATH="$APP_PATH/Contents/Frameworks"
CHILD_PLIST="./sink/mac/child.plist"
PARENT_PLIST="./sink/mac/parent.plist"

codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/Electron Framework.framework/Versions/A/Electron Framework"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/Electron Framework.framework/Versions/A/Libraries/libffmpeg.dylib"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/Electron Framework.framework/Versions/A/Libraries/libnode.dylib"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/Electron Framework.framework"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/$APP Helper.app/Contents/MacOS/$APP Helper"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/$APP Helper.app/"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/$APP Helper EH.app/Contents/MacOS/$APP Helper EH"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/$APP Helper EH.app/"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/$APP Helper NP.app/Contents/MacOS/$APP Helper NP"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/$APP Helper NP.app/"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$APP_PATH/Contents/MacOS/$APP"

codesign -s "$APP_KEY" -f --entitlements "$PARENT_PLIST" "$APP_PATH"

productbuild --component "$APP_PATH" /Applications --sign "$INSTALLER_KEY" "$RESULT_PATH"
