import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../core/theme/app_theme.dart';
import '../models/report_model.dart';
import '../core/utils/navigation_helper.dart';

class TicketCardWidget extends StatelessWidget {
  final ReportModel report;
  final VoidCallback onTap;

  const TicketCardWidget({
    super.key,
    required this.report,
    required this.onTap,
  });

  Color _getPriorityColor() {
    switch (report.priority.toLowerCase()) {
      case 'darurat':
      case 'urgent':
        return AppColors.rose;
      case 'tinggi':
      case 'high':
        return AppColors.amber;
      default:
        return AppColors.blue;
    }
  }

  Color _getStatusColor() {
    switch (report.status.toLowerCase()) {
      case 'in_progress':
        return AppColors.amber;
      case 'completed':
        return AppColors.emerald;
      default:
        return AppColors.blue;
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd MMM yyyy, HH:mm');

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: report.isInProgress ? AppColors.amber.withValues(alpha: 0.5) : AppColors.border,
          width: report.isInProgress ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Bar: Ticket ID & Priority Badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.obsidian,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          report.ticketId,
                          style: GoogleFonts.ibmPlexMono(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      if (report.isAnonymous)
                        Container(
                          margin: const EdgeInsets.only(left: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.darkSlate.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: AppColors.darkSlate.withValues(alpha: 0.25)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.shield_rounded, size: 10, color: AppColors.emerald),
                              const SizedBox(width: 3),
                              Text(
                                'ANONIM',
                                style: GoogleFonts.ibmPlexMono(
                                  color: AppColors.textPrimary,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                  Row(
                    children: [
                      // Priority Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: _getPriorityColor().withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: _getPriorityColor().withValues(alpha: 0.3),
                          ),
                        ),
                        child: Text(
                          report.priority.toUpperCase(),
                          style: TextStyle(
                            color: _getPriorityColor(),
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      // Status Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: _getStatusColor().withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          report.statusLabel,
                          style: TextStyle(
                            color: _getStatusColor(),
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Title
              Text(
                report.title,
                style: GoogleFonts.spaceGrotesk(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),

              const SizedBox(height: 6),

              // Description preview
              Text(
                report.description,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),

              const SizedBox(height: 12),

              // Address and Date
              if (report.address != null && report.address!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6.0),
                  child: Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 15, color: AppColors.rose),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          report.address!,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    dateFormat.format(report.createdAt),
                    style: GoogleFonts.ibmPlexMono(
                      fontSize: 11,
                      color: AppColors.textMuted,
                    ),
                  ),

                  // Quick Action button
                  if (report.latitude != null && report.longitude != null)
                    GestureDetector(
                      onTap: () {
                        NavigationHelper.openGoogleMapsRoute(
                          latitude: report.latitude!,
                          longitude: report.longitude!,
                          title: report.title,
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.navigation_rounded, size: 12, color: AppColors.obsidian),
                            const SizedBox(width: 4),
                            Text(
                              'Navigasi',
                              style: GoogleFonts.spaceGrotesk(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppColors.obsidian,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
