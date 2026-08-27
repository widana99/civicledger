import 'package:url_launcher/url_launcher.dart';

class NavigationHelper {
  /// Membuka aplikasi navigasi native (Google Maps / Waze) dengan koordinat tujuan
  static Future<bool> openGoogleMapsRoute({
    required double latitude,
    required double longitude,
    String? title,
  }) async {
    // 1. Google Maps Navigation Intent (Native Android & iOS)
    final Uri googleMapsAppUri = Uri.parse(
      'google.navigation:q=$latitude,$longitude&mode=d',
    );

    // 2. Google Maps Universal URL Fallback
    final Uri googleMapsWebUri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=$latitude,$longitude&travelmode=driving',
    );

    try {
      if (await canLaunchUrl(googleMapsAppUri)) {
        return await launchUrl(googleMapsAppUri);
      } else if (await canLaunchUrl(googleMapsWebUri)) {
        return await launchUrl(
          googleMapsWebUri,
          mode: LaunchMode.externalApplication,
        );
      }
    } catch (_) {
      if (await canLaunchUrl(googleMapsWebUri)) {
        return await launchUrl(
          googleMapsWebUri,
          mode: LaunchMode.externalApplication,
        );
      }
    }
    return false;
  }
}
