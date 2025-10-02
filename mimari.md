
mermaid 
  flowchart LR
  subgraph FE["Frontend (React/Vite)"]
    FE_Dash["Dashboard.jsx"]
    FE_List["DeviceList.jsx"]
    FE_Mgmt["DeviceManagement.jsx"]
    FE_API["services/api.js"]
  end

  subgraph BE["Backend (Express/Prisma)"]
    BE_Auth["/api/auth"]
    BE_Devices["/api/devices"]
    BE_Commands["/api/commands"]
    BE_Enroll["/api/enrollment"]
    BE_Settings["/api/settings"]
    BE_Headwind["/headwind routes"]
    BE_Socket["Socket.IO"]
  end

  subgraph DB["SQLite via Prisma"]
    DB_User["User"]
    DB_Device["Device"]
    DB_Command["Command"]
    DB_App["Application, DeviceApplication"]
    DB_Policy["Policy, DevicePolicy, PolicyApplication"]
    DB_Event["DeviceEvent"]
    DB_Setting["SystemSetting"]
  end

  subgraph Agent["Android Agent (Headwind compatible)"]
    AG_Config["GET/POST /:project/rest/public/sync/configuration/:number"]
    AG_Info["POST /:project/rest/public/sync/info"]
    AG_Notif["GET /:project/rest/notifications/device/:number"]
    AG_CmdDone["POST /:project/rest/public/sync/command/:commandId"]
  end

  %% Frontend -> Backend
  FE_Dash -->|"GET devices"| BE_Devices
  FE_List -->|"select device"| FE_Mgmt
  FE_Mgmt -->|"GET apps"| BE_Devices
  FE_Mgmt -->|"POST toggle app"| BE_Devices
  FE_Mgmt -->|"POST sendCommand: lock / locate / alert"| BE_Devices
  FE_API -->|"GET / POST / PUT"| BE_Auth & BE_Devices & BE_Commands & BE_Enroll & BE_Settings

  %% Backend -> DB
  BE_Auth --> DB_User & DB_Event
  BE_Devices --> DB_Device & DB_Command & DB_App & DB_Event & DB_Policy
  BE_Commands --> DB_Command & DB_User
  BE_Enroll --> DB_Device & DB_User & DB_Event
  BE_Settings --> DB_Setting
  BE_Headwind --> DB_Device & DB_Command & DB_App & DB_Event & DB_Setting

  %% Commands and Notifications Flow
  BE_Devices -->|"create Command (PENDING)"| DB_Command
  BE_Headwind <-->|"configUpdated / ALARM payloads"| AG_Notif
  AG_Notif --> Agent
  Agent -->|"pull config"| AG_Config
  Agent -->|"send telemetry: location / apps / battery"| AG_Info
  AG_Info --> BE_Headwind
  BE_Headwind -->|"update"| DB_Device & DB_App & DB_Event
  Agent -->|"command result"| AG_CmdDone
  AG_CmdDone --> BE_Headwind -->|"update status"| DB_Command

  %% Auth
  FE_API -->|"POST login"| BE_Auth -->|"JWT"| FE_API

  %% Real-time (future use)
  BE_Socket -. broadcast .-> FE_Dash


# MDM_v2 Mimari Dokümanı

Bu doküman, MDM_v2 projesinin mimarisini; kullanılan araçları, veri modellerini, backend endpoint'lerini, frontend akışlarını ve Headwind integration'ı detaylıca açıklar. Amaç; yeni geliştiricilerin projeyi hızla kavrayabilmesi ve genişletirken tutarlılığı korumasıdır.

## Genel Bakış

- **Monorepo** yapısı: `backend/` (Node.js/Express + Prisma/SQLite) ve `frontend/` (React + Vite) birlikte.
- **Veritabanı**: Prisma ORM ile SQLite (geliştirme). Modeller: `User`, `Device`, `Command`, `Application`, `DeviceApplication`, `Policy`, `DevicePolicy`, `PolicyApplication`, `DeviceEvent`, `SystemSetting`.
- **Kimlik Doğrulama**: JWT tabanlı; `access_token` ve `refresh_token` kullanır.
- **Gerçek Zamanlı**: Socket.IO (ileride komut/olay bildirimleri için kullanılabilir).
- **MDM/Agent Entegrasyonu**: `headwind.js` ile Headwind MDM Android agent protokolüne uyumlu konfigürasyon/notification uçları.

## Dizin Yapısı (Kısaca)

- `backend/server.js`: Express ve Socket.IO sunucusu, route mounting, statik dosyalar, health endpoint.
- `backend/src/routes/`: İşlevsel route grupları
  - `auth.js`, `devices.js`, `commands.js`, `enrollment.js`, `settings.js`, `users.js`, `headwind.js`
- `backend/src/middleware/auth.js`: JWT doğrulama ve rol/tabanlı yetkilendirme, sahiplik kontrolleri.
- `backend/prisma/schema.prisma`: Veri modeli tanımları (aşağıda detaylı).
- `frontend/src/`: React uygulaması (sayfalar, bileşenler, context ve API servisleri).

## Kullanılan Araçlar ve Teknolojiler

- **Node.js + Express**: REST API servisleri.
- **Prisma Client**: ORM; tip güvenli veritabanı erişimi.
- **SQLite**: Geliştirme veritabanı; tek dosya dağıtım kolaylığı.
- **JWT (JSON Web Token)**: Kimlik doğrulama/oturum yönetimi.
- **Socket.IO**: Gerçek zamanlı bildirim kanalı (şu an temel iskelet).
- **Vite + React**: SPA yönetim paneli.
- **Lucide React**: İkon seti.

## Veri Modelleri (Özet)

Aşağıdaki özetler `backend/prisma/schema.prisma` tanımlarına karşılık gelir:

- **User**: `id, email, password(hash), name, role(ADMIN|MANAGER|USER), department, isActive, lastLogin, createdAt, updatedAt`
  - İlişkiler: `devices, commands, createdPolicies`
- **Device**: Cihaz meta ve Headwind alanları
  - `status(ONLINE|OFFLINE|WARNING|...), battery, location, imei(unique), isEnrolled, lastSeen, ...`
  - Headwind: `deviceId, project, mdmMode, kioskMode, launcherPackage, ...`
  - İlişkiler: `user, commands, applications, policies, events`
- **Command**: Cihaza gönderilen komutlar
  - `action(CommandType), status(CommandStatus), description, parameters(JSON string), result, errorMessage, created/exec/complete timestamps`
  - `CommandType`: `LOCK, UNLOCK, WIPE, LOCATE, RESTART, SECURITY_SCAN, BACKUP, INSTALL_APP, UNINSTALL_APP, ALARM, SET_POLICY`
- **Application / DeviceApplication**: Uygulama envanteri ve cihaz-uygulama durumları
- **Policy / DevicePolicy / PolicyApplication**: Politika ve uygulama aksiyonları (ALLOW/BLOCK/REQUIRE)
- **DeviceEvent**: Cihaz olay/aktivite günlükleri (STATUS_CHANGE, LOCATION_UPDATE, ...)
- **SystemSetting**: Sistem/tema ayarları.

## Backend Sunucu (server.js)

- CORS kuralları (lokal IP/localhost whitelisting)
- JSON/URL-encoded gövde limitleri
- Statik dosyalar (`public/`)
- API route'ları: `/api/auth, /api/devices, /api/users, /api/commands, /api/enrollment, /api/settings`
- Headwind endpoint'leri root altında mount edilir (`/` -> `headwind.js`).
- Health endpoint: `GET /health`
- Socket.IO event iskeleti: `deviceStatusUpdate, mdmCommand`

## Middleware (auth.js)

- `authenticateToken`: `Authorization: Bearer <token>` doğrular, `req.user` ekler.
- `requireRole([roles])`, `requireAdmin`, `requireManagerOrAdmin`: rol tabanlı yetki.
- `requireOwnershipOrAdmin(userIdParam)`: Kullanıcı verisi sahipliği kontrolü (gelecekte departman kontrolü ile genişletilebilir).
- `requireDeviceOwnership`: Kullanıcının yalnızca kendi cihazlarına erişmesine izin verir (ADMIN|MANAGER bypass).
- `optionalAuth`: Token varsa doğrular, yoksa anonim devam eder.

## Endpointler ve Davranışlar

Aşağıda önemli endpointler ve uygulamada yarattıkları etkiler özetlenmiştir. Tam kod için ilgili route dosyasına bakınız.

### Auth (`/api/auth`)
- `POST /login`: E-posta/şifre doğrular, `accessToken` ve `refreshToken` üretir, `lastLogin` günceller, login event (opsiyonel) yazar.
- `POST /logout`: Logout event yazar, refresh token cookie temizleyebilir.
- `POST /refresh`: `refreshToken` ile yeni `accessToken` üretir.
- `GET /me`: Mevcut kullanıcı bilgisi ve izinleri.
- `POST /change-password`: Mevcut şifreyi doğrular, yeni şifreyi hashleyip kaydeder, event yazar.
- `GET /validate`: Optional auth ile token geçerlilik kontrolü.

### Devices (`/api/devices`)
- `GET /` (auth required): Rol bazlı filtrelerle cihaz listesi döner. Frontend’de Dashboard cihaz kartlarını besler. Response alanları: `id, name, model, brand, osVersion, status(lowercase), battery, location, imei, phoneNumber, employee, lastSeen(humanized), isEnrolled, commandCount, eventCount, kioskMode`.
- `POST /` (manager/admin): Yeni cihaz oluşturur, default uygulamaları ilişkilendirir, event yazar.
- `GET /:id`: Mock üzerinden tek cihaz (yeni kodun yanında mock kalıntısı; gerçek akış listede çalışıyor).
- `POST /:id/commands` (ownership required): Cihaza komut gönderir. `action` (`lock, unlock, wipe, locate, restart, alert, install_app, uninstall_app`) doğrulanır; `Command` kaydı oluşturulur. `alert` gibi özel komutlarda `parameters` JSON saklanır.
- `GET /:id/apps` (ownership): Cihaz uygulama listesi (DeviceApplication join ile Application alanları). Frontend’de “Uygulama Yönetimi” modalı bu endpoint’i kullanır.
- `POST /:id/apps/:appId/toggle` (ownership): Cihazda uygulama kurulu/pasif durumunu değiştirir, ilgili `Command` (`INSTALL_APP`/`UNINSTALL_APP`) ve `DeviceEvent` kaydı oluşturur. Frontend’de toggle switch ile tetiklenir.
- `DELETE /:id` (manager/admin): Cihazı ve ilişkili komut/uygulama/policy/event verilerini siler; event yazar.

### Commands (`/api/commands`)
- `GET /`: Mock komut listesi (filtreler: `deviceId`, `status`).
- `GET /:id`: Mock tek komut.
- `POST /`: Mock komut oluşturma (demo amaçlı).
- `PUT /:id`: Mock komut güncelleme.
- `GET /device/:deviceId` (ownership): Gerçek `Command` kayıtlarını döner; frontend aktivite listesi bunu kullanır.

### Settings (`/api/settings`)
- `GET /theme` (auth): Tema ayarlarını döner.
- `PUT /theme` (manager/admin): Tema renkleri ve arka plan görselini günceller; dosyayı `public/uploads/` altına yazar.

### Enrollment (`/api/enrollment`)
- `POST /validate`: Cihaz ID kontrolü (kayıtlı değil mi?).
- `POST /connect`: Cihazı `isEnrolled=true` yapar, Headwind alanlarını doldurabilir, event yazar.
- `GET /devices`: Kayıt edilmeyi bekleyen cihazlar.
- `POST /disconnect`: Cihazı kayıtsız duruma çevirir, event yazar.

### Headwind/Agent (`/default-project/...`)
- `POST/GET /:project/rest/public/sync/configuration/:number`: Headwind agent’ın çektiği launcher konfigürasyonu. Cihaz kaydı veya güncellemeleri sırasında `Device` alanlarını da senkronize eder, ikon/uygulama listesi verir.
- `POST /:project/rest/public/sync/info`: Agent’tan gelen telemetry (batarya, konum, uygulamalar) ile `Device` ve `DeviceApplication` kayıtları güncellenir, `DeviceEvent` yazılır.
- `GET /:project/rest/notifications/device/:number`: Bekleyen komutları Headwind push formatına çevirir. `ALARM` için notification payload döner; diğer komutlarda `configUpdated` ile agent’ın yeni konfigürasyonu çekmesi tetiklenebilir.
- `POST /:project/rest/public/sync/command/:commandId`: Agent komutu tamamladığında `Command` durumu güncellenir; `Device.lastSeen` gibi alanlar tazelenir.

Not: Kiosk Mode akışı şu aşamada UI’da pasifleştirilmiş, ileride Headwind konfigürasyon kısıtları ve/veya Device Owner/Lock Task tetikleyen handler ile genişletilecektir.

## Frontend (React)

- Sayfalar: `pages/Dashboard.jsx, Enrollment.jsx, Login.jsx, Theme.jsx, Help.jsx`
- Bileşenler: `components/DeviceList.jsx, DeviceManagement.jsx, Header.jsx, Sidebar.jsx`
- Context: `contexts/AuthContext.jsx` (authenticatedFetch), `contexts/ThemeContext.jsx`
- Servisler: `services/api.js` (dinamik base URL + JWT; `deviceApi`, `authApi`, `userApi`, `commandApi`, `enrollmentApi`)

### Önemli Bileşen Akışları

- `Dashboard.jsx`
  - `deviceApi.getAll()` ile cihaz listesini çeker, `DeviceList` ve seçime göre `DeviceManagement` gösterir.

- `DeviceList.jsx`
  - Arama ve istatistik filtreleri ile cihaz kartlarını listeler; seçim `onSelectDevice` ile yönetilir.

- `DeviceManagement.jsx`
  - Genel bilgiler, cihaz işlemleri ve aktiviteler paneli.
  - “Uygulama Yönet” modalı: `deviceApi.getApps()` ile uygulamaları çeker; arama kutusu ile isim/paket filtreleme; toggle ile `POST /devices/:id/apps/:appId/toggle` çağrısı ve komut/event üretimi; son aktiviteler `commandApi.getByDevice()` ile listelenir.
  - “Konum Bul” butonu: Modal açar (Google Haritalar linki) ve arka planda `deviceApi.sendCommand(id,'locate')` gönderir.
  - “Kiosk Modu” butonu: Şimdilik pasif durumda (gelecekte `SET_POLICY`/Headwind ile yeniden etkinleştirilecek).

### API Servisleri (`frontend/src/services/api.js`)

- Dinamik `getApiBaseUrl()` (health probe ile 3001 portu), `apiCall()` JWT başlık ekleme.
- `deviceApi`
  - `getAll, getById, sendCommand(deviceId, action, parameters?), create, update, getApps, toggleApp, delete`
- `commandApi`
  - `getAll, getById, create, update, getByDevice`
- `authApi`, `userApi`, `enrollmentApi`, `healthCheck`

## Komut Akışı (Örnekler)

- Uygulama Toggle:
  1. Frontend: `deviceApi.toggleApp(deviceId, appId, isInstalled)`
  2. Backend: DeviceApp upsert; `Command` (INSTALL_APP/UNINSTALL_APP) + `DeviceEvent` oluşturulur.
  3. Headwind notifications: `configUpdated` push ile agent konfig çekmeye yönlendirilir.

- Konum İsteği:
  1. Frontend: `deviceApi.sendCommand(deviceId, 'locate')` ve modal açılır.
  2. Backend: `Command` kaydı (LOCATE). Agent `info` ile konum gönderdiğinde `Device.location` güncellenir, `DeviceEvent` yazılır.

## Güvenlik ve Yetkilendirme

- Tüm kritik endpointler `authenticateToken` gerektirir.
- Cihaz/uygulama işlemleri kullanıcı sahiplik kontrolüne tabidir (`requireDeviceOwnership`).
- Yönetim aksiyonları sadece `MANAGER|ADMIN` rolleri tarafından çağrılabilir.

## Statik İçerik ve Tema

- `public/` altından servis edilir.
- Tema ayarları `SystemSetting` içinde saklanır ve `headwind.js` konfig çıktısında duvar kağıdı alanlarında kullanılır.

## Geliştirme Notları ve Gelecek Çalışmalar

- Kiosk Mode: Headwind konfig parametrelerinin agent sürümüyle uyumlanması ve/veya Device Owner/Lock Task akışının agent tarafında etkinleştirilmesi.
- Socket.IO: Cihaz durumu/komut geri bildirimleri için gerçek zamanlı kanalın aktif kullanımı.
- Users Route: Şu an mock; Prisma tabanlı tam CRUD’a geçirilebilir.
- Error/Retry: Agent push/config akışı için yeniden deneme ve durum senkronizasyonları zenginleştirilebilir.

---
