# Android phone and tablet package

This small Java Activity hosts the same production web application from APK assets. It runs offline, supports Android 10+ (API 29), and adapts to phones, tablets, rotation and multi-window. WebGL 2 / OpenGL ES 3 and an up-to-date Android System WebView are required.

## Build

Install Node 22.13+, Java 17, Android SDK Platform 36 and Build Tools 35.0.0 (the default for this Android Gradle Plugin). Set `JAVA_HOME` and `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) as appropriate. The build script discovers common Homebrew Java and macOS SDK paths when these variables are absent.

From the repository root:

```sh
npm ci
node scripts/build-android.mjs
```

The wrapper pins Gradle 8.14.3 and its official SHA-256 checksum; Android Gradle Plugin 8.12.0 and AndroidX WebKit 1.14.0 are pinned. The script snapshots source files into a local temporary directory, verifies every copy byte-for-byte, rebuilds web assets, builds and lints Android, then writes the successful APK to `releases/dino-grove-android-v2.1.0.apk`. This avoids OS copy operations that can stall inside cloud-synced folders. It rejects short reads and removes old output before building, so a failed build never publishes a stale APK. The temporary build path is printed and retained for asset verification. No SDK path or signing key belongs in Git.

For direct Gradle use after building the web app, `./gradlew -PwebDistDir=/absolute/path/to/dist :app:assembleDebug` accepts an explicit production asset directory. By default, Gradle uses the repository's `dist` directory.

The output is **2.1.0-test**, application ID `com.breezelife.dinogrove`, signed by the local Android debug certificate. This is a directly installable testing package, not a Google Play release. Later packages need the same signing certificate to update an existing installation; a different machine's debug certificate will require uninstalling first. User-created gallery photos remain in shared media storage after uninstalling.

## Offline and photo boundary

- No Internet, camera, microphone, location or storage permission is requested.
- `WebViewAssetLoader` serves packaged files at `https://appassets.androidplatform.net/assets/`. Nonlocal resource requests and external navigation are blocked. File/content URL access is disabled. A Content Security Policy blocks external scripts and frames.
- Only debug builds permit WebView remote inspection. The host pauses timers/rendering and notifies the web audio layer when backgrounded. Android Back first closes a photo or a selected dinosaur, then exits.
- `window.DinoGroveAndroid.savePhoto(base64Png, filename, requestId)` validates a PNG, safe name and bounded dimensions/bytes, then writes asynchronously to `Pictures/Dino Grove` through MediaStore. Android 10+ allows this app-owned write without a photo-library permission prompt.
- Completion dispatches `dino-grove-photo-result` with `{ id, success, error? }`; the web application handles localized feedback. Failed writes remove incomplete media entries.
- The launcher uses the same code-generated 3D icon as the website, with an adaptive mask and a monochrome themed-icon silhouette.
- `setImmersive(boolean)` hides/restores Android system bars from the trusted local app. Edge swipes can reveal them temporarily. Back closes the photo, then the menu, then immersive mode, then the resident card. Reloads and renderer errors restore the bars. Android may show its own first-use fullscreen tutorial.

Emulator tests do not establish physical device frame rate, thermal behavior, or compatibility with every manufacturer's Gallery application. See the project's QA and handoff records for actual evidence.
