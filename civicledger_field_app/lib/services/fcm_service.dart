import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../firebase_options.dart';
import 'supabase_service.dart';

/// Top-level background handler for FCM messages when app is killed or in background
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (_) {}
  if (kDebugMode) {
    print('🔔 FCM Background Notification received: ${message.messageId}');
  }
}

class FCMService {
  static final FCMService _instance = FCMService._internal();
  factory FCMService() => _instance;
  FCMService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

  bool _isInitialized = false;
  String? _fcmToken;

  String? get fcmToken => _fcmToken;
  bool get isInitialized => _isInitialized;

  /// Callback when user taps a notification
  Function(String reportId)? onNotificationOpened;

  /// Initialize Firebase Cloud Messaging & Local Notification channels
  Future<void> initialize({Function(String reportId)? onNotificationTap}) async {
    if (_isInitialized) return;
    onNotificationOpened = onNotificationTap;

    try {
      // Initialize Firebase with project credentials
      try {
        await Firebase.initializeApp(
          options: DefaultFirebaseOptions.currentPlatform,
        );
      } catch (e) {
        if (kDebugMode) {
          print('ℹ️ Firebase.initializeApp info: $e');
        }
      }

      // 1. Request Push Notification Permissions (Android 13+ & iOS)
      final settings = await _messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      if (kDebugMode) {
        print('🔔 Push Notification Permission status: ${settings.authorizationStatus}');
      }

      // 2. Configure Local Notifications for Foreground display
      const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      const darwinSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: darwinSettings,
      );

      await _localNotifications.initialize(
        initSettings,
        onDidReceiveNotificationResponse: (NotificationResponse response) {
          final payload = response.payload;
          if (payload != null && payload.isNotEmpty && onNotificationOpened != null) {
            onNotificationOpened!(payload);
          }
        },
      );

      // Create Android Notification Channel
      const androidChannel = AndroidNotificationChannel(
        'civicledger_urgent_channel',
        'CivicLedger Tugas Lapangan',
        description: 'Notifikasi penugasan laporan dan pembaruan darurat warga',
        importance: Importance.high,
        playSound: true,
        enableVibration: true,
      );

      final androidPlugin = _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      if (androidPlugin != null) {
        await androidPlugin.createNotificationChannel(androidChannel);
      }

      // 3. Register Background Handler
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // 4. Handle Foreground Messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        if (kDebugMode) {
          print('🔔 FCM Foreground Message: ${message.notification?.title}');
        }
        _showForegroundNotification(message);
      });

      // 5. Handle Notification Click when app was in background
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        final reportId = message.data['report_id'] ?? message.data['id'];
        if (reportId != null && onNotificationOpened != null) {
          onNotificationOpened!(reportId.toString());
        }
      });

      // 6. Handle initial message when app was terminated
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        final reportId = initialMessage.data['report_id'] ?? initialMessage.data['id'];
        if (reportId != null && onNotificationOpened != null) {
          onNotificationOpened!(reportId.toString());
        }
      }

      // 7. Get and Sync Token
      await syncDeviceToken();

      // Listen for token refresh
      _messaging.onTokenRefresh.listen((newToken) {
        _fcmToken = newToken;
        _saveTokenToSupabase(newToken);
      });

      _isInitialized = true;
    } catch (e) {
      if (kDebugMode) {
        print('⚠️ FCMService init fallback: $e (App will use Supabase Realtime fallback)');
      }
    }
  }

  /// Show local head-up banner when notification arrives while app is in foreground
  Future<void> _showForegroundNotification(RemoteMessage message) async {
    final notification = message.notification;
    final android = message.notification?.android;

    if (notification != null) {
      final reportId = message.data['report_id'] ?? message.data['id'] ?? '';
      await _localNotifications.show(
        notification.hashCode,
        notification.title ?? 'CivicLedger Lapangan',
        notification.body ?? 'Ada pembaruan tugas baru.',
        NotificationDetails(
          android: AndroidNotificationDetails(
            'civicledger_urgent_channel',
            'CivicLedger Tugas Lapangan',
            channelDescription: 'Notifikasi penugasan laporan dan pembaruan darurat warga',
            importance: Importance.max,
            priority: Priority.high,
            icon: android?.smallIcon ?? '@mipmap/ic_launcher',
            color: const Color(0xFF0EA58D),
          ),
          iOS: const DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
          ),
        ),
        payload: reportId.toString(),
      );
    }
  }

  /// Fetch device token and update user profile in Supabase
  Future<String?> syncDeviceToken() async {
    try {
      _fcmToken = await _messaging.getToken();
      if (_fcmToken != null) {
        if (kDebugMode) {
          print('📱 FCM Device Token: $_fcmToken');
        }
        await _saveTokenToSupabase(_fcmToken!);
      }
      return _fcmToken;
    } catch (e) {
      if (kDebugMode) {
        print('⚠️ Could not fetch FCM token: $e');
      }
      return null;
    }
  }

  /// Save token to Supabase profiles table
  Future<void> _saveTokenToSupabase(String token) async {
    try {
      final user = SupabaseService.instance.currentUser;
      if (user != null) {
        await SupabaseService.instance.client
            .from('profiles')
            .update({'fcm_token': token})
            .eq('id', user.id);
        if (kDebugMode) {
          print('✅ FCM token synced to Supabase profile for user: ${user.id}');
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('⚠️ Failed to sync FCM token to Supabase: $e');
      }
    }
  }
}
