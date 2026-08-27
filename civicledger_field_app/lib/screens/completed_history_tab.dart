import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme/app_theme.dart';
import '../models/report_model.dart';
import '../services/supabase_service.dart';
import '../widgets/ticket_card_widget.dart';
import 'task_detail_screen.dart';

class CompletedHistoryTab extends StatefulWidget {
  const CompletedHistoryTab({super.key});

  @override
  State<CompletedHistoryTab> createState() => _CompletedHistoryTabState();
}

class _CompletedHistoryTabState extends State<CompletedHistoryTab> {
  List<ReportModel> _completedTasks = [];
  bool _isLoading = true;
  String? _errorMessage;
  StreamSubscription? _streamSub;

  @override
  void initState() {
    super.initState();
    _fetchCompletedTasks();
    _initRealtimeStream();
  }

  @override
  void dispose() {
    _streamSub?.cancel();
    super.dispose();
  }

  void _initRealtimeStream() {
    try {
      _streamSub = SupabaseService.instance.getOfficerTasksStream().listen(
        (allTasks) {
          if (mounted) {
            setState(() {
              _completedTasks = allTasks.where((t) => t.isCompleted).toList();
              _isLoading = false;
              _errorMessage = null;
            });
          }
        },
        onError: (err) {
          _fetchCompletedTasks(showLoading: false);
        },
      );
    } catch (_) {}
  }

  Future<void> _fetchCompletedTasks({bool showLoading = true}) async {
    if (showLoading && mounted) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final allTasks = await SupabaseService.instance.getOfficerTasks();
      if (mounted) {
        setState(() {
          _completedTasks = allTasks.where((t) => t.isCompleted).toList();
          _isLoading = false;
          _errorMessage = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Riwayat Selesai',
              style: GoogleFonts.spaceGrotesk(
                fontWeight: FontWeight.w800,
                fontSize: 20,
              ),
            ),
            Text(
              'Arsip tugas yang telah tuntas dikerjakan',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Perbarui Riwayat',
            onPressed: () => _fetchCompletedTasks(),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.obsidian,
        onRefresh: () => _fetchCompletedTasks(showLoading: false),
        child: _buildContent(),
      ),
    );
  }

  Widget _buildContent() {
    if (_isLoading && _completedTasks.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.obsidian),
      );
    }

    if (_errorMessage != null && _completedTasks.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.5,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline_rounded, size: 40, color: AppColors.rose),
                    const SizedBox(height: 12),
                    Text(
                      'Gagal memuat riwayat',
                      style: GoogleFonts.spaceGrotesk(fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _errorMessage!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => _fetchCompletedTasks(),
                      icon: const Icon(Icons.refresh, size: 16),
                      label: const Text('Coba Lagi'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      );
    }

    if (_completedTasks.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.5,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: AppColors.emeraldLight.withValues(alpha: 0.5),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.check_circle_outline_rounded,
                        size: 32,
                        color: AppColors.emerald,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Belum Ada Riwayat Selesai',
                      style: GoogleFonts.spaceGrotesk(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Laporan yang Anda selesaikan beserta bukti foto penanganan akan otomatis tersimpan di sini.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Tarik ke bawah (Swipe down) untuk me-refresh',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11,
                        color: AppColors.textMuted,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      itemCount: _completedTasks.length,
      itemBuilder: (context, index) {
        final task = _completedTasks[index];
        return TicketCardWidget(
          report: task,
          onTap: () async {
            await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => TaskDetailScreen(reportId: task.id),
              ),
            );
            _fetchCompletedTasks(showLoading: false);
          },
        );
      },
    );
  }
}
