# 📱 SEC Live Mobile Client

Aplikasi mobile resmi **SEC (Smart Education Center)** untuk fitur **Live Class**, dibangun menggunakan React Native, Agora RTC Engine, dan Expo Linking.

---

## 🚀 Fitur Utama
- **⚡ Smart Deep Linking Gateway:** Mendukung skema intent `secapp://live?room=${roomCode}` dari browser web platform SEC.
- **🎥 Agora RTC Streaming:** Audio & video latensi ultra-rendah terhubung dengan SFU channel backend SEC.
- **🔐 Secure Token Auth:** Mengambil RTC token secara dinamis dari API backend SEC (`https://sec-ysa.vercel.app/api/live-class/[roomCode]/token`).
- **☁️ Cloud Build CI/CD (Zero Local Setup):** Dibangun otomatis via GitHub Actions tanpa memerlukan instalasi Android Studio atau Gradle lokal. Berkas APK langsung dirilis ke GitHub Releases CDN secara gratis dan tanpa batas bandwidth.

---

## 🔗 Skema Deep Linking
Aplikasi ini mendaftarkan protokol URI:
```text
secapp://live?room=<ROOM_CODE>
```
Contoh:
```text
secapp://live?room=SEC-9021
```

---

## 🛠️ Panduan Pengujian USB Debugging (ADB di Linux)

Bagi pengembang atau pengguna Linux yang ingin langsung menguji berkas APK di ponsel fisik menggunakan kabel USB:

### 1. Pasang Android Debug Bridge (`adb`) di Linux
Jalankan perintah berikut di terminal Ubuntu/Debian:
```bash
sudo apt update
sudo apt install -y adb
```

### 2. Aktifkan USB Debugging di Smartphone Android
1. Buka **Pengaturan (Settings)** -> **Tentang Ponsel (About Phone)**.
2. Ketuk **Nomor Bentukan (Build Number)** sebanyak 7 kali berturut-turut hingga muncul pesan *"Anda kini seorang pengembang"*.
3. Buka **Pengaturan Tambahan / Opsi Pengembang (Developer Options)**.
4. Aktifkan toggle **Debugging USB (USB Debugging)**.
5. Sambungkan smartphone ke komputer menggunakan kabel data USB.
6. Pada layar smartphone, beri centang *"Selalu izinkan dari komputer ini"* lalu tekan **OK**.

### 3. Verifikasi Koneksi Smartphone
Pastikan ponsel Anda terdeteksi oleh `adb`:
```bash
adb devices
```
*Output yang diharapkan:*
```text
List of devices attached
RFCW10ABCDE    device
```

### 4. Pasang (Sideload) Berkas APK
Unduh berkas `sec-live.apk` dari rilis terbaru lalu pasang ke HP:
```bash
adb install -r sec-live.apk
```

### 5. Uji Coba Deep Linking via Terminal ADB
Verifikasi bahwa skema intent `secapp://live` langsung membuka aplikasi dan ruang kelas yang dituju:
```bash
adb shell am start -W -a android.intent.action.VIEW -d "secapp://live?room=SEC-TEST"
```

---

## 🔄 Alur Integrasi Web Gateway (SEC Web -> Mobile App)
1. Pengguna membuka portal Live Class di browser smartphone (`https://sec-ysa.vercel.app/courses/live`).
2. Saat mengklik **"+ Start New Class"** atau **"Join Class"**, web mencoba meluncurkan `secapp://live?room=...`.
3. Jika aplikasi telah terpasang, OS Android langsung berpindah ke aplikasi native.
4. Jika belum terpasang (timeout ~1.2 detik), web menampilkan **AppDownloadModal** berdesain modern dengan tombol unduh langsung APK dari GitHub Releases CDN serta panduan instalasi 3 langkah.
5. Pengguna juga memiliki opsi *"Lanjut di Browser Web"* jika memilih tetap bergabung via WebRTC browser.

---

## 🏗️ GitHub Actions Cloud Build
Workflow `.github/workflows/build-apk.yml` akan berjalan secara otomatis saat terdapat perubahan pada branch `main` atau pembuatan git tag `v*`.

Tautan unduhan rilis publik permanen:
```text
https://github.com/Irhamrahmatsaleh/sec-mobile/releases/latest/download/sec-live.apk
```
