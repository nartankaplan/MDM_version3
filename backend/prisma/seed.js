const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Önce mevcut verileri temizle
  await prisma.deviceEvent.deleteMany()
  await prisma.deviceApplication.deleteMany()
  await prisma.devicePolicy.deleteMany()
  await prisma.policyApplication.deleteMany()
  await prisma.command.deleteMany()
  await prisma.device.deleteMany()
  await prisma.application.deleteMany()
  await prisma.policy.deleteMany()
  await prisma.user.deleteMany()
  await prisma.systemSetting.deleteMany()

  // Admin kullanıcısı oluştur
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@mdm.com',
      password: adminPassword,
      name: 'MDM Admin',
      role: 'ADMIN',
      department: 'IT',
      isActive: true,
    },
  })

  // Test kullanıcıları oluştur
  const userPassword = await bcrypt.hash('user123', 12)
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'ahmet.yilmaz@company.com',
        password: userPassword,
        name: 'Ahmet Yılmaz',
        role: 'USER',
        department: 'IT',
      },
    }),
    prisma.user.create({
      data: {
        email: 'fatma.kaya@company.com',
        password: userPassword,
        name: 'Fatma Kaya',
        role: 'USER',
        department: 'HR',
      },
    }),
    prisma.user.create({
      data: {
        email: 'mehmet.demir@company.com',
        password: userPassword,
        name: 'Mehmet Demir',
        role: 'MANAGER',
        department: 'Sales',
      },
    }),
  ])

  // Cihazları oluştur
  const devices = await Promise.all([
    prisma.device.create({
      data: {
        name: 'Samsung Galaxy S23',
        model: 'SM-S911B',
        brand: 'Samsung',
        osVersion: 'Android 14',
        status: 'ONLINE',
        battery: 85,
        location: 'İstanbul, TR',
        imei: '354123456789012',
        phoneNumber: '+90 555 123 4567',
        isEnrolled: true,
        enrollmentDate: new Date(),
        lastSeen: new Date(),
        userId: users[0].id,
      },
    }),
    prisma.device.create({
      data: {
        name: 'Google Pixel 7',
        model: 'GVU6C',
        brand: 'Google',
        osVersion: 'Android 14',
        status: 'OFFLINE',
        battery: 42,
        location: 'Ankara, TR',
        imei: '354987654321098',
        phoneNumber: '+90 555 987 6543',
        isEnrolled: true,
        enrollmentDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        lastSeen: new Date(Date.now() - 60 * 60 * 1000),
        userId: users[1].id,
      },
    }),
    prisma.device.create({
      data: {
        name: 'Xiaomi 13',
        model: '2210132C',
        brand: 'Xiaomi',
        osVersion: 'Android 13',
        status: 'ONLINE',
        battery: 67,
        location: 'İzmir, TR',
        imei: '354456789012345',
        phoneNumber: '+90 555 456 7890',
        isEnrolled: true,
        enrollmentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(),
        userId: users[2].id,
      },
    }),
    prisma.device.create({
      data: {
        name: 'OnePlus 11',
        model: 'CPH2449',
        brand: 'OnePlus',
        osVersion: 'Android 14',
        status: 'WARNING',
        battery: 15,
        location: 'Bursa, TR',
        imei: '354789012345678',
        phoneNumber: '+90 555 789 0123',
        isEnrolled: true,
        enrollmentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(Date.now() - 30 * 60 * 1000),
        userId: users[0].id,
      },
    }),
    prisma.device.create({
      data: {
        name: 'Huawei P50 Pro',
        model: 'JAD-L29',
        brand: 'Huawei',
        osVersion: 'Android 12',
        status: 'ONLINE',
        battery: 78,
        location: 'Adana, TR',
        imei: '354112233445566',
        phoneNumber: '+90 555 112 2334',
        isEnrolled: true,
        enrollmentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(Date.now() - 5 * 60 * 1000),
        userId: users[1].id,
      },
    }),
  ])

  // Komutlar oluştur
  await Promise.all([
    prisma.command.create({
      data: {
        action: 'LOCK',
        status: 'COMPLETED',
        description: 'Cihaz başarıyla kilitlendi',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 15000),
        deviceId: devices[0].id,
        createdById: admin.id,
      },
    }),
    prisma.command.create({
      data: {
        action: 'LOCATE',
        status: 'COMPLETED',
        description: 'Konum bilgisi alındı',
        result: '{"lat": 41.0082, "lng": 28.9784}',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000 + 30000),
        deviceId: devices[1].id,
        createdById: admin.id,
      },
    }),
    prisma.command.create({
      data: {
        action: 'SECURITY_SCAN',
        status: 'PENDING',
        description: 'Güvenlik taraması başlatıldı',
        createdAt: new Date(Date.now() - 45 * 60 * 1000),
        deviceId: devices[0].id,
        createdById: admin.id,
      },
    }),
  ])

  // Uygulamalar oluştur
  const applications = await Promise.all([
    // İletişim Uygulamaları
    prisma.application.create({
      data: {
        name: 'WhatsApp',
        packageName: 'com.whatsapp',
        version: '2.24.10.81',
        category: 'Communication',
        description: 'Dünya çapında en popüler mesajlaşma uygulaması',
        iconUrl: 'https://img.icons8.com/color/48/whatsapp.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Telegram',
        packageName: 'org.telegram.messenger',
        version: '10.5.0',
        category: 'Communication',
        description: 'Güvenli ve hızlı mesajlaşma uygulaması',
        iconUrl: 'https://img.icons8.com/color/48/telegram-app.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Gmail',
        packageName: 'com.google.android.gm',
        version: '2023.10.15',
        category: 'Communication',
        description: 'Google e-posta istemcisi',
        isSystemApp: true,
        iconUrl: 'https://img.icons8.com/color/48/gmail-new.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Mesajlar',
        packageName: 'com.google.android.apps.messaging',
        version: '7.8.000',
        category: 'Communication',
        description: 'Android varsayılan mesajlaşma uygulaması',
        isSystemApp: true,
        iconUrl: 'https://img.icons8.com/color/48/google-messages.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Discord',
        packageName: 'com.discord',
        version: '205.15',
        category: 'Communication',
        description: 'Gaming ve topluluk sohbet uygulaması',
        iconUrl: 'https://img.icons8.com/color/48/discord--v2.png',
      },
    }),
    
    // Sosyal Medya
    prisma.application.create({
      data: {
        name: 'Instagram',
        packageName: 'com.instagram.android',
        version: '300.0.0.37.120',
        category: 'Social',
        description: 'Fotoğraf ve video paylaşım platformu',
        iconUrl: 'https://img.icons8.com/fluency/48/instagram-new.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Facebook',
        packageName: 'com.facebook.katana',
        version: '430.0.0.20.120',
        category: 'Social',
        description: 'Sosyal ağ platformu',
        iconUrl: 'https://img.icons8.com/fluency/48/facebook-new.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Snapchat',
        packageName: 'com.snapchat.android',
        version: '12.50.0.42',
        category: 'Social',
        description: 'Geçici fotoğraf ve video paylaşımı',
        iconUrl: 'https://img.icons8.com/color/48/snapchat.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Twitter',
        packageName: 'com.twitter.android',
        version: '10.20.0',
        category: 'Social',
        description: 'Mikroblog ve sosyal medya platformu',
        iconUrl: 'https://img.icons8.com/color/48/twitter--v1.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'LinkedIn',
        packageName: 'com.linkedin.android',
        version: '4.1.844',
        category: 'Social',
        description: 'Profesyonel sosyal ağ',
        iconUrl: 'https://img.icons8.com/color/48/linkedin.png',
      },
    }),
    
    // Eğlence
    prisma.application.create({
      data: {
        name: 'YouTube',
        packageName: 'com.google.android.youtube',
        version: '18.45.43',
        category: 'Entertainment',
        description: 'Video izleme ve paylaşım platformu',
        iconUrl: 'https://img.icons8.com/fluency/48/youtube-play.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'TikTok',
        packageName: 'com.zhiliaoapp.musically',
        version: '32.0.4',
        category: 'Entertainment',
        description: 'Kısa video platformu',
        iconUrl: 'https://img.icons8.com/color/48/tiktok--v1.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Netflix',
        packageName: 'com.netflix.mediaclient',
        version: '8.95.0',
        category: 'Entertainment',
        description: 'Film ve dizi izleme platformu',
        iconUrl: 'https://img.icons8.com/color/48/netflix-desktop-app.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Spotify',
        packageName: 'com.spotify.music',
        version: '8.8.96.364',
        category: 'Music',
        description: 'Müzik dinleme ve keşfetme platformu',
        iconUrl: 'https://img.icons8.com/color/48/spotify--v1.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Twitch',
        packageName: 'tv.twitch.android.app',
        version: '15.7.0',
        category: 'Entertainment',
        description: 'Canlı yayın ve gaming platformu',
        iconUrl: 'https://img.icons8.com/color/48/twitch--v2.png',
      },
    }),
    
    // İş ve Verimlilik
    prisma.application.create({
      data: {
        name: 'Microsoft Teams',
        packageName: 'com.microsoft.teams',
        version: '1.6.0',
        category: 'Business',
        description: 'Takım işbirliği ve video konferans uygulaması',
        isRequired: true,
        iconUrl: 'https://img.icons8.com/color/48/microsoft-teams.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Zoom',
        packageName: 'us.zoom.videomeetings',
        version: '5.16.10.24168',
        category: 'Business',
        description: 'Video konferans ve toplantı uygulaması',
        iconUrl: 'https://img.icons8.com/external-others-amoghdesign/48/external-zoom-round-icons-others-amoghdesign.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Slack',
        packageName: 'com.Slack',
        version: '23.10.0.0',
        category: 'Business',
        description: 'İş yerinde iletişim ve işbirliği platformu',
        iconUrl: 'https://img.icons8.com/color/48/slack-new.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Not Defteri',
        packageName: 'com.google.android.keep',
        version: '5.24.442.03',
        category: 'Productivity',
        description: 'Not alma ve görev yönetimi uygulaması',
        iconUrl: 'https://img.icons8.com/color/48/google-keep.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Microsoft Office',
        packageName: 'com.microsoft.office.officehubrow',
        version: '16.0.16924.20154',
        category: 'Productivity',
        description: 'Ofis uygulamaları paketi',
        iconUrl: 'https://img.icons8.com/color/48/microsoft-office-2019.png',
      },
    }),
    
    // Tarayıcılar
    prisma.application.create({
      data: {
        name: 'Chrome',
        packageName: 'com.android.chrome',
        version: '118.0.5993.112',
        category: 'Browser',
        description: 'Google web tarayıcısı',
        isSystemApp: true,
        iconUrl: 'https://img.icons8.com/color/48/chrome--v1.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Firefox',
        packageName: 'org.mozilla.firefox',
        version: '119.0',
        category: 'Browser',
        description: 'Mozilla Firefox web tarayıcısı',
        iconUrl: 'https://img.icons8.com/color/48/firefox--v1.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Edge',
        packageName: 'com.microsoft.emmx',
        version: '119.0.2151.97',
        category: 'Browser',
        description: 'Microsoft Edge web tarayıcısı',
        iconUrl: 'https://img.icons8.com/color/48/ms-edge-new.png',
      },
    }),
    
    // Navigasyon
    prisma.application.create({
      data: {
        name: 'Google Maps',
        packageName: 'com.google.android.apps.maps',
        version: '11.95.0',
        category: 'Navigation',
        description: 'Navigasyon ve harita uygulaması',
        isSystemApp: true,
        iconUrl: 'https://img.icons8.com/color/48/google-maps-new.png',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Waze',
        packageName: 'com.waze',
        version: '4.95.0.0',
        category: 'Navigation',
        description: 'Topluluk tabanlı navigasyon uygulaması',
        iconUrl: 'https://img.icons8.com/color/48/waze.png',
      },
    }),
    
    // Finans
    prisma.application.create({
      data: {
        name: 'PayPal',
        packageName: 'com.paypal.android.p2pmobile',
        version: '8.50.0',
        category: 'Finance',
        description: 'Online ödeme platformu',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Revolut',
        packageName: 'com.revolut.revolut',
        version: '10.8.0',
        category: 'Finance',
        description: 'Dijital bankacılık uygulaması',
      },
    }),
    
    // Oyunlar
    prisma.application.create({
      data: {
        name: 'PUBG Mobile',
        packageName: 'com.tencent.ig',
        version: '2.7.0',
        category: 'Games',
        description: 'Popüler battle royale oyunu',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Candy Crush Saga',
        packageName: 'com.king.candycrushsaga',
        version: '1.270.0.1',
        category: 'Games',
        description: 'Popüler puzzle oyunu',
      },
    }),
    
    // Sağlık ve Fitness
    prisma.application.create({
      data: {
        name: 'Google Fit',
        packageName: 'com.google.android.apps.fitness',
        version: '2.70.0',
        category: 'Health',
        description: 'Fitness ve sağlık takip uygulaması',
      },
    }),
    prisma.application.create({
      data: {
        name: 'MyFitnessPal',
        packageName: 'com.myfitnesspal.android',
        version: '23.4.0',
        category: 'Health',
        description: 'Kalori sayma ve fitness takip uygulaması',
      },
    }),
    
    // Alışveriş
    prisma.application.create({
      data: {
        name: 'Amazon',
        packageName: 'com.amazon.mShop.android.shopping',
        version: '24.8.0.100',
        category: 'Shopping',
        description: 'Online alışveriş platformu',
      },
    }),
    prisma.application.create({
      data: {
        name: 'Trendyol',
        packageName: 'com.trendyol',
        version: '6.8.0',
        category: 'Shopping',
        description: 'Türkiye\'nin en büyük e-ticaret platformu',
      },
    }),
  ])

  // Policy oluştur
  const policy = await prisma.policy.create({
    data: {
      name: 'Standart Güvenlik Politikası',
      description: 'Şirket cihazları için standart güvenlik kuralları',
      rules: JSON.stringify({
        passwordPolicy: {
          minLength: 8,
          requireSpecialChars: true,
          requireNumbers: true,
        },
        restrictions: {
          allowInstallUnknownSources: false,
          allowDebugging: false,
          allowCamera: true,
        },
        workProfile: {
          enabled: true,
          allowPersonalApps: false,
        },
      }),
      priority: 1,
      createdById: admin.id,
    },
  })

  // DeviceApplication kayıtları oluştur - uygulamaları cihazlara ata
  console.log('📱 Uygulamaları cihazlara atanıyor...')
  
  // Her cihaz için bazı uygulamaları kurulu olarak ata
  const deviceAppAssignments = [
    // Samsung Galaxy S23 (device 1) - İş odaklı profil
    { deviceId: devices[0].id, appId: applications[0].id, isInstalled: true }, // WhatsApp
    { deviceId: devices[0].id, appId: applications[1].id, isInstalled: true }, // Telegram
    { deviceId: devices[0].id, appId: applications[2].id, isInstalled: true }, // Gmail
    { deviceId: devices[0].id, appId: applications[3].id, isInstalled: true }, // Mesajlar
    { deviceId: devices[0].id, appId: applications[4].id, isInstalled: false }, // Discord
    { deviceId: devices[0].id, appId: applications[5].id, isInstalled: false }, // Instagram
    { deviceId: devices[0].id, appId: applications[6].id, isInstalled: false }, // Facebook
    { deviceId: devices[0].id, appId: applications[7].id, isInstalled: false }, // Snapchat
    { deviceId: devices[0].id, appId: applications[8].id, isInstalled: false }, // Twitter
    { deviceId: devices[0].id, appId: applications[9].id, isInstalled: true }, // LinkedIn
    { deviceId: devices[0].id, appId: applications[10].id, isInstalled: false }, // YouTube
    { deviceId: devices[0].id, appId: applications[11].id, isInstalled: false }, // TikTok
    { deviceId: devices[0].id, appId: applications[12].id, isInstalled: false }, // Netflix
    { deviceId: devices[0].id, appId: applications[13].id, isInstalled: false }, // Spotify
    { deviceId: devices[0].id, appId: applications[14].id, isInstalled: false }, // Twitch
    { deviceId: devices[0].id, appId: applications[15].id, isInstalled: true }, // Teams
    { deviceId: devices[0].id, appId: applications[16].id, isInstalled: true }, // Zoom
    { deviceId: devices[0].id, appId: applications[17].id, isInstalled: false }, // Slack
    { deviceId: devices[0].id, appId: applications[18].id, isInstalled: true }, // Not Defteri
    { deviceId: devices[0].id, appId: applications[19].id, isInstalled: true }, // Microsoft Office
    { deviceId: devices[0].id, appId: applications[20].id, isInstalled: true }, // Chrome
    { deviceId: devices[0].id, appId: applications[21].id, isInstalled: false }, // Firefox
    { deviceId: devices[0].id, appId: applications[22].id, isInstalled: false }, // Edge
    { deviceId: devices[0].id, appId: applications[23].id, isInstalled: true }, // Google Maps
    { deviceId: devices[0].id, appId: applications[24].id, isInstalled: false }, // Waze
    
    // Google Pixel 7 (device 2) - Sosyal medya odaklı
    { deviceId: devices[1].id, appId: applications[0].id, isInstalled: true }, // WhatsApp
    { deviceId: devices[1].id, appId: applications[1].id, isInstalled: true }, // Telegram
    { deviceId: devices[1].id, appId: applications[2].id, isInstalled: true }, // Gmail
    { deviceId: devices[1].id, appId: applications[3].id, isInstalled: true }, // Mesajlar
    { deviceId: devices[1].id, appId: applications[4].id, isInstalled: true }, // Discord
    { deviceId: devices[1].id, appId: applications[5].id, isInstalled: true }, // Instagram
    { deviceId: devices[1].id, appId: applications[6].id, isInstalled: true }, // Facebook
    { deviceId: devices[1].id, appId: applications[7].id, isInstalled: true }, // Snapchat
    { deviceId: devices[1].id, appId: applications[8].id, isInstalled: true }, // Twitter
    { deviceId: devices[1].id, appId: applications[9].id, isInstalled: false }, // LinkedIn
    { deviceId: devices[1].id, appId: applications[10].id, isInstalled: true }, // YouTube
    { deviceId: devices[1].id, appId: applications[11].id, isInstalled: true }, // TikTok
    { deviceId: devices[1].id, appId: applications[12].id, isInstalled: true }, // Netflix
    { deviceId: devices[1].id, appId: applications[13].id, isInstalled: true }, // Spotify
    { deviceId: devices[1].id, appId: applications[14].id, isInstalled: true }, // Twitch
    { deviceId: devices[1].id, appId: applications[15].id, isInstalled: false }, // Teams
    { deviceId: devices[1].id, appId: applications[16].id, isInstalled: false }, // Zoom
    { deviceId: devices[1].id, appId: applications[17].id, isInstalled: false }, // Slack
    { deviceId: devices[1].id, appId: applications[18].id, isInstalled: false }, // Not Defteri
    { deviceId: devices[1].id, appId: applications[19].id, isInstalled: false }, // Microsoft Office
    { deviceId: devices[1].id, appId: applications[20].id, isInstalled: true }, // Chrome
    { deviceId: devices[1].id, appId: applications[21].id, isInstalled: false }, // Firefox
    { deviceId: devices[1].id, appId: applications[22].id, isInstalled: false }, // Edge
    { deviceId: devices[1].id, appId: applications[23].id, isInstalled: true }, // Google Maps
    { deviceId: devices[1].id, appId: applications[24].id, isInstalled: false }, // Waze
    
    // Xiaomi 13 (device 3) - Eğlence odaklı
    { deviceId: devices[2].id, appId: applications[0].id, isInstalled: true }, // WhatsApp
    { deviceId: devices[2].id, appId: applications[1].id, isInstalled: true }, // Telegram
    { deviceId: devices[2].id, appId: applications[2].id, isInstalled: true }, // Gmail
    { deviceId: devices[2].id, appId: applications[3].id, isInstalled: true }, // Mesajlar
    { deviceId: devices[2].id, appId: applications[4].id, isInstalled: true }, // Discord
    { deviceId: devices[2].id, appId: applications[5].id, isInstalled: true }, // Instagram
    { deviceId: devices[2].id, appId: applications[6].id, isInstalled: false }, // Facebook
    { deviceId: devices[2].id, appId: applications[7].id, isInstalled: true }, // Snapchat
    { deviceId: devices[2].id, appId: applications[8].id, isInstalled: false }, // Twitter
    { deviceId: devices[2].id, appId: applications[9].id, isInstalled: false }, // LinkedIn
    { deviceId: devices[2].id, appId: applications[10].id, isInstalled: true }, // YouTube
    { deviceId: devices[2].id, appId: applications[11].id, isInstalled: true }, // TikTok
    { deviceId: devices[2].id, appId: applications[12].id, isInstalled: true }, // Netflix
    { deviceId: devices[2].id, appId: applications[13].id, isInstalled: true }, // Spotify
    { deviceId: devices[2].id, appId: applications[14].id, isInstalled: true }, // Twitch
    { deviceId: devices[2].id, appId: applications[15].id, isInstalled: false }, // Teams
    { deviceId: devices[2].id, appId: applications[16].id, isInstalled: false }, // Zoom
    { deviceId: devices[2].id, appId: applications[17].id, isInstalled: false }, // Slack
    { deviceId: devices[2].id, appId: applications[18].id, isInstalled: false }, // Not Defteri
    { deviceId: devices[2].id, appId: applications[19].id, isInstalled: false }, // Microsoft Office
    { deviceId: devices[2].id, appId: applications[20].id, isInstalled: true }, // Chrome
    { deviceId: devices[2].id, appId: applications[21].id, isInstalled: false }, // Firefox
    { deviceId: devices[2].id, appId: applications[22].id, isInstalled: false }, // Edge
    { deviceId: devices[2].id, appId: applications[23].id, isInstalled: true }, // Google Maps
    { deviceId: devices[2].id, appId: applications[24].id, isInstalled: false }, // Waze
    { deviceId: devices[2].id, appId: applications[25].id, isInstalled: false }, // PayPal
    { deviceId: devices[2].id, appId: applications[26].id, isInstalled: false }, // Revolut
    { deviceId: devices[2].id, appId: applications[27].id, isInstalled: true }, // PUBG Mobile
    { deviceId: devices[2].id, appId: applications[28].id, isInstalled: false }, // Candy Crush
    { deviceId: devices[2].id, appId: applications[29].id, isInstalled: false }, // Google Fit
    { deviceId: devices[2].id, appId: applications[30].id, isInstalled: false }, // MyFitnessPal
    { deviceId: devices[2].id, appId: applications[31].id, isInstalled: false }, // Amazon
    { deviceId: devices[2].id, appId: applications[32].id, isInstalled: false }, // Trendyol
    
    // OnePlus 11 (device 4) - Karışık profil
    { deviceId: devices[3].id, appId: applications[0].id, isInstalled: true }, // WhatsApp
    { deviceId: devices[3].id, appId: applications[1].id, isInstalled: true }, // Telegram
    { deviceId: devices[3].id, appId: applications[2].id, isInstalled: true }, // Gmail
    { deviceId: devices[3].id, appId: applications[3].id, isInstalled: true }, // Mesajlar
    { deviceId: devices[3].id, appId: applications[4].id, isInstalled: false }, // Discord
    { deviceId: devices[3].id, appId: applications[5].id, isInstalled: true }, // Instagram
    { deviceId: devices[3].id, appId: applications[6].id, isInstalled: false }, // Facebook
    { deviceId: devices[3].id, appId: applications[7].id, isInstalled: false }, // Snapchat
    { deviceId: devices[3].id, appId: applications[8].id, isInstalled: false }, // Twitter
    { deviceId: devices[3].id, appId: applications[9].id, isInstalled: true }, // LinkedIn
    { deviceId: devices[3].id, appId: applications[10].id, isInstalled: true }, // YouTube
    { deviceId: devices[3].id, appId: applications[11].id, isInstalled: false }, // TikTok
    { deviceId: devices[3].id, appId: applications[12].id, isInstalled: false }, // Netflix
    { deviceId: devices[3].id, appId: applications[13].id, isInstalled: true }, // Spotify
    { deviceId: devices[3].id, appId: applications[14].id, isInstalled: false }, // Twitch
    { deviceId: devices[3].id, appId: applications[15].id, isInstalled: true }, // Teams
    { deviceId: devices[3].id, appId: applications[16].id, isInstalled: false }, // Zoom
    { deviceId: devices[3].id, appId: applications[17].id, isInstalled: false }, // Slack
    { deviceId: devices[3].id, appId: applications[18].id, isInstalled: true }, // Not Defteri
    { deviceId: devices[3].id, appId: applications[19].id, isInstalled: false }, // Microsoft Office
    { deviceId: devices[3].id, appId: applications[20].id, isInstalled: true }, // Chrome
    { deviceId: devices[3].id, appId: applications[21].id, isInstalled: false }, // Firefox
    { deviceId: devices[3].id, appId: applications[22].id, isInstalled: false }, // Edge
    { deviceId: devices[3].id, appId: applications[23].id, isInstalled: true }, // Google Maps
    { deviceId: devices[3].id, appId: applications[24].id, isInstalled: false }, // Waze
    { deviceId: devices[3].id, appId: applications[25].id, isInstalled: false }, // PayPal
    { deviceId: devices[3].id, appId: applications[26].id, isInstalled: false }, // Revolut
    { deviceId: devices[3].id, appId: applications[27].id, isInstalled: false }, // PUBG Mobile
    { deviceId: devices[3].id, appId: applications[28].id, isInstalled: true }, // Candy Crush
    { deviceId: devices[3].id, appId: applications[29].id, isInstalled: true }, // Google Fit
    { deviceId: devices[3].id, appId: applications[30].id, isInstalled: false }, // MyFitnessPal
    { deviceId: devices[3].id, appId: applications[31].id, isInstalled: false }, // Amazon
    { deviceId: devices[3].id, appId: applications[32].id, isInstalled: false }, // Trendyol
    
    // Huawei P50 Pro (device 5) - İş odaklı profil
    { deviceId: devices[4].id, appId: applications[0].id, isInstalled: true }, // WhatsApp
    { deviceId: devices[4].id, appId: applications[1].id, isInstalled: true }, // Telegram
    { deviceId: devices[4].id, appId: applications[2].id, isInstalled: true }, // Gmail
    { deviceId: devices[4].id, appId: applications[3].id, isInstalled: true }, // Mesajlar
    { deviceId: devices[4].id, appId: applications[4].id, isInstalled: false }, // Discord
    { deviceId: devices[4].id, appId: applications[5].id, isInstalled: false }, // Instagram
    { deviceId: devices[4].id, appId: applications[6].id, isInstalled: false }, // Facebook
    { deviceId: devices[4].id, appId: applications[7].id, isInstalled: false }, // Snapchat
    { deviceId: devices[4].id, appId: applications[8].id, isInstalled: false }, // Twitter
    { deviceId: devices[4].id, appId: applications[9].id, isInstalled: true }, // LinkedIn
    { deviceId: devices[4].id, appId: applications[10].id, isInstalled: false }, // YouTube
    { deviceId: devices[4].id, appId: applications[11].id, isInstalled: false }, // TikTok
    { deviceId: devices[4].id, appId: applications[12].id, isInstalled: false }, // Netflix
    { deviceId: devices[4].id, appId: applications[13].id, isInstalled: false }, // Spotify
    { deviceId: devices[4].id, appId: applications[14].id, isInstalled: false }, // Twitch
    { deviceId: devices[4].id, appId: applications[15].id, isInstalled: true }, // Teams
    { deviceId: devices[4].id, appId: applications[16].id, isInstalled: true }, // Zoom
    { deviceId: devices[4].id, appId: applications[17].id, isInstalled: true }, // Slack
    { deviceId: devices[4].id, appId: applications[18].id, isInstalled: true }, // Not Defteri
    { deviceId: devices[4].id, appId: applications[19].id, isInstalled: true }, // Microsoft Office
    { deviceId: devices[4].id, appId: applications[20].id, isInstalled: true }, // Chrome
    { deviceId: devices[4].id, appId: applications[21].id, isInstalled: false }, // Firefox
    { deviceId: devices[4].id, appId: applications[22].id, isInstalled: false }, // Edge
    { deviceId: devices[4].id, appId: applications[23].id, isInstalled: true }, // Google Maps
    { deviceId: devices[4].id, appId: applications[24].id, isInstalled: false }, // Waze
    { deviceId: devices[4].id, appId: applications[25].id, isInstalled: false }, // PayPal
    { deviceId: devices[4].id, appId: applications[26].id, isInstalled: false }, // Revolut
    { deviceId: devices[4].id, appId: applications[27].id, isInstalled: false }, // PUBG Mobile
    { deviceId: devices[4].id, appId: applications[28].id, isInstalled: false }, // Candy Crush
    { deviceId: devices[4].id, appId: applications[29].id, isInstalled: false }, // Google Fit
    { deviceId: devices[4].id, appId: applications[30].id, isInstalled: false }, // MyFitnessPal
    { deviceId: devices[4].id, appId: applications[31].id, isInstalled: false }, // Amazon
    { deviceId: devices[4].id, appId: applications[32].id, isInstalled: false }, // Trendyol
  ]

  await Promise.all(
    deviceAppAssignments.map(assignment =>
      prisma.deviceApplication.create({
        data: {
          deviceId: assignment.deviceId,
          applicationId: assignment.appId,
          isInstalled: assignment.isInstalled,
          installedAt: assignment.isInstalled ? new Date() : null,
          version: assignment.isInstalled ? applications.find(app => app.id === assignment.appId)?.version : null
        }
      })
    )
  )

  console.log('✅ Uygulamalar cihazlara atandı!')

  // Device events oluştur
  await Promise.all(
    devices.map((device) => [
      prisma.deviceEvent.create({
        data: {
          eventType: 'DEVICE_ENROLLED',
          title: 'Cihaz kaydedildi',
          description: 'Cihaz MDM sistemine başarıyla kaydedildi',
          severity: 'INFO',
          timestamp: device.enrollmentDate,
          deviceId: device.id,
        },
      }),
      prisma.deviceEvent.create({
        data: {
          eventType: 'STATUS_CHANGE',
          title: 'Durum değişikliği',
          description: `Cihaz durumu ${device.status} olarak güncellendi`,
          severity: device.status === 'WARNING' ? 'WARNING' : 'INFO',
          timestamp: device.lastSeen || new Date(),
          deviceId: device.id,
        },
      }),
    ]).flat()
  )

  // System settings oluştur
  await Promise.all([
    prisma.systemSetting.create({
      data: {
        key: 'app_name',
        value: 'MDM System',
        category: 'general',
        description: 'Application name',
        isPublic: true,
      },
    }),
    prisma.systemSetting.create({
      data: {
        key: 'max_devices_per_user',
        value: '5',
        category: 'limits',
        description: 'Maximum devices per user',
        isPublic: false,
      },
    }),
    prisma.systemSetting.create({
      data: {
        key: 'session_timeout',
        value: '1440',
        category: 'security',
        description: 'Session timeout in minutes',
        isPublic: false,
      },
    }),
  ])

  console.log('✅ Seed data created successfully!')
  console.log('👤 Admin: admin@mdm.com / admin123')
  console.log('🔍 Test users: ahmet.yilmaz@company.com / user123')
  console.log('📱 Created', devices.length, 'devices')
  console.log('📋 Created', applications.length, 'applications')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
