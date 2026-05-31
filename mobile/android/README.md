# Sylex FOS — Android appka

Jednoduchá WebView appka, ktorá načíta nasadený FOS Dashboard a otvorí rovno
sekciu **Úlohy**. Prihlásenie (login/heslo) funguje priamo v appke, token sa
uloží (localStorage), takže ostaneš prihlásený.

> Zatiaľ je to „obal" nad webom — do budúcna sa dá rozšíriť o natívne funkcie
> (push notifikácie, offline, kamera) cez Capacitor alebo natívne API.

## Build (Android Studio)
1. Otvor priečinok `mobile/android` v **Android Studio** (Open).
2. Uprav URL: `app/src/main/res/values/strings.xml` → `app_url` na doménu tvojho
   nasadenia (Railway), napr. `https://fos-dashboard.up.railway.app`.
3. Počkaj na Gradle sync (Studio si dotiahne Gradle wrapper aj závislosti).
4. **Build → Build Bundle(s)/APK(s) → Build APK(s)** → vznikne `app-debug.apk`.
5. APK prenes do telefónu a nainštaluj (povoľ inštaláciu z neznámych zdrojov),
   alebo spusti priamo cez **Run ▶** na pripojenom zariadení.

## Poznámky
- `usesCleartextTraffic="true"` je zapnuté pre prípad interného HTTP servera;
  pri HTTPS (Railway) nie je potrebné, ale neprekáža.
- Appka otvára `#tasks`. Cez navigáciu v hlavičke sa dostaneš aj na ostatné
  sekcie (sú za prihlásením).
- Minimálne SDK 24 (Android 7.0+).
