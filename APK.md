## APK yükleme ve kurulum akışı (Teknik)

Bu doküman, web panelinden sürükle-bırak ile APK eklenmesinden Android cihazda kurulumun başlamasına kadar olan uçtan uca (E2E) süreci özetler.

### 1) Frontend (web panel) – APK ekleme UI

- Dosya düşürme alanı: `frontend/src/components/DeviceManagement.jsx` içinde "APK ekle" sekmesi.
- Dosya seçildiğinde `uploadApi.uploadApk(file)` çağrılır ve backend'e `POST /api/uploads/apk` isteği atılır.
- Backend cevabında dönen `downloadUrl` ve (varsa) metadata ile form alanları doldurulur.
- Kullanıcı Ad ve Package alanlarını doldurduktan sonra "Ekle" butonu aktif olur.
- "Ekle":
  1. `POST /api/applications` – Uygulama kaydı oluşturulur veya (idempotent) varsa güncellenir. `downloadUrl`, `version`, `versionCode` gibi alanlar kaydedilir.
  2. `POST /api/devices/:id/apps/:appId/toggle` – İlgili cihaz-uygulama ilişkisi `isInstalled=true` olarak işaretlenir ve kurulum komutunu tetiklemek için bir `Command` kaydı eklenir.

### 2) Backend – APK yükleme & metadata çıkarma

- Endpoint: `backend/src/routes/uploads.js`
- Yükleme: `multer` ile dosya `public/uploads/apks/` altına kaydedilir. Maks 200MB limit.
- Metadata: `node-apk-parser` ile `AndroidManifest.xml` okunur, şu alanlar çıkarılmaya çalışılır:
  - `application.label` → name
  - `package` → packageName
  - `versionName` → versionName
  - `versionCode` → versionCode
- Cevap olarak `downloadUrl` ve metadata döndürülür. Metadata okunamazsa `null` gelebilir (kullanıcı UI'da elle girebilir).

Örnek cevap:
```
{
  success: true,
  data: {
    fileName: "demo.apk",
    storedName: "demo_1699999999999.apk",
    size: 12345678,
    downloadUrl: "http://<host>:3001/uploads/apks/demo_1699...apk",
    metadata: { name, packageName, versionName, versionCode }
  }
}
```

### 3) Backend – Uygulama kaydı ve cihazla ilişkilendirme

- Uygulama oluşturma/güncelleme: `backend/src/routes/applications.js`
  - Body alanları: `name`, `packageName`, `version?`, `versionCode?`, `downloadUrl?`, `iconUrl?`, `description?`, `category?`
  - Aynı `packageName` zaten varsa idempotent davranır: 200 ile mevcut kaydı (gerekirse metadata’yı güncelleyerek) döndürür.
- Cihaza ilişkilendirme: `backend/src/routes/devices.js` → `POST /api/devices/:id/apps/:appId/toggle` 
  - `DeviceApplication` kaydını `isInstalled=true` yapar.
  - Bir `Command` (INSTALL_APP) üretir.

### 4) Backend – Headwind (Agent) konfigürasyon sağlama

- Endpoint: `backend/src/routes/headwind.js`
- Cihaz, belirli aralıklarla veya push ile `/{project}/rest/public/sync/configuration/{number}` adresinden konfigürasyonu çeker.
- `getDeviceApplications(deviceId, req)` fonksiyonu, o cihaza ait uygulamaları Headwind Launcher’ın beklediği forma çevirir:
  - `name`, `pkg` (package), `version`, `code` (versionCode), `url` (downloadUrl), `remove` (kurulu değilse true)
- Önemli: `Application.downloadUrl` alanı bu adımda `url` olarak gönderilir. Agent bu URL’den APK’yı indirir.

### 5) Android Agent (Headwind) – İndirme ve kurulum

- Android tarafında `hmdm-android-master` (Headwind Launcher) içinde kurulum mantığı `PackageInstaller` kullanır.
- İlgili sınıflar (örnek):
  - `app/src/main/java/com/hmdm/launcher/util/InstallUtils.java`
  - `app/src/main/java/com/hmdm/launcher/util/XapkUtils.java`
  - `app/src/main/java/com/hmdm/launcher/helper/ConfigUpdater.java`
- Akış özet:
  1. Agent, konfigürasyondaki uygulama listesinde `remove=false` ve `url` dolu olan öğeleri görür.
  2. APK’yı `url`’den indirir.
  3. Android `PackageInstaller` API’si ile sessiz/yarı-sessiz kurulum dener (cihaz ve izin durumuna göre kullanıcı etkileşimi gerekebilir).
  4. Sonuç (başarılı/başarısız) backend’e `/{project}/rest/public/sync/command/{commandId}` ile raporlanır ve `Command` durumu güncellenir.

### 6) Veri modeli (Prisma)

- `Application` (özet)
  - `name`, `packageName (unique)`, `version?`, `versionCode?`, `downloadUrl?`, `iconUrl?`, `description?`, `category?`, `isSystemApp`, `isRequired`
- `DeviceApplication`
  - `deviceId`, `applicationId` (unique pair), `isInstalled`, `version?`, `installedAt?`
- `Command`
  - `action` (INSTALL_APP, UNINSTALL_APP, ...), `status`, `parameters` (JSON), `deviceId`, `createdById`

### 7) Güvenlik ve sınırlar

- Yükleme boyutu limiti: 200MB (multer `limits.fileSize`).
- Kabul edilen tür: yalnızca `.apk` (dosya adı kontrolü).
- `uploads/apks/` altında sunulan dosyalar `express.static('public')` ile servis edilir.
- Yükleme, sadece yetkili kullanıcılar (MANAGER/ADMIN) için açıktır.

### 8) Hızlı sorun giderme

- "Ekle" butonu pasifse: Ad ve Package alanlarını doldurun.
- Cihazda kurulum başlamıyorsa:
  - `GET /{project}/rest/notifications/device/{number}` çağrısının döndüğü payload’da `configUpdated` mesajları geliyor mu?
  - Cihazın `configuration` cevabında ilgili uygulama için `url` dolu mu?
  - Android tarafında Unknown Sources / PackageInstaller yetkileri ve MDM politika kısıtları kontrol edilmeli.

### 9) Sonuç

Özetle, web paneli APK’yı sunucuya yükler ve bir `downloadUrl` üretir; bu URL uygulama kaydına yazılır. Cihaz konfigürasyonunu çekerken `url` alanını görür, APK’yı indirir ve `PackageInstaller` ile kurulum yapar. Kurulumun tetiklenmesi, cihaz-uygulama ilişkisinde `isInstalled=true` işaretlenmesi ve `Command` oluşturulmasıyla sağlanır.


