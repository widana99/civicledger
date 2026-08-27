import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/theme/app_theme.dart';
import '../core/utils/chat_security_guard.dart';
import '../models/direct_chat_model.dart';
import '../services/supabase_service.dart';

class OfficerPoskoChatSheet extends StatefulWidget {
  const OfficerPoskoChatSheet({super.key});

  @override
  State<OfficerPoskoChatSheet> createState() => _OfficerPoskoChatSheetState();
}

class _OfficerPoskoChatSheetState extends State<OfficerPoskoChatSheet> with SingleTickerProviderStateMixin {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<DirectChatModel> _messages = [];
  StreamSubscription<List<DirectChatModel>>? _streamSub;
  RealtimeChannel? _typingChannel;
  Timer? _typingDebounce;
  bool _isAdminTyping = false;
  bool _isLoading = true;
  bool _isSending = false;
  String _selectedCategory = 'umum';
  String? _validationError;

  final Map<String, String> _categories = {
    'umum': '💬 Umum',
    'kendala': '⚠️ Kendala Lapangan',
    'alat': '🚜 Butuh Alat/Armada',
    'darurat': '🚨 Darurat / Urgent',
    'laporan': '📋 Laporan Situasi',
  };

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _subscribeStream();
    _initTypingChannel();
    _markRead();
  }

  @override
  void dispose() {
    _streamSub?.cancel();
    _typingDebounce?.cancel();
    if (_typingChannel != null) {
      SupabaseService.instance.client.removeChannel(_typingChannel!);
    }
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _markRead() {
    SupabaseService.instance.markDirectChatsAsRead();
  }

  void _initTypingChannel() {
    final user = SupabaseService.instance.currentUser;
    if (user == null) return;

    _typingChannel = SupabaseService.instance.client.channel('posko_chat_${user.id}');
    _typingChannel?.onBroadcast(event: 'typing', callback: (payload) {
      if (mounted) {
        if (payload['sender'] == 'admin') {
          final isTyping = payload['is_typing'] as bool? ?? false;
          setState(() => _isAdminTyping = isTyping);
          if (isTyping) {
            _scrollToBottom();
          }
        }
      }
    }).subscribe();
  }

  void _onTextChanged(String text) {
    final user = SupabaseService.instance.currentUser;
    if (user == null || _typingChannel == null) return;

    _typingChannel?.sendBroadcastMessage(
      event: 'typing',
      payload: {'sender': 'officer', 'is_typing': text.trim().isNotEmpty},
    );

    _typingDebounce?.cancel();
    _typingDebounce = Timer(const Duration(seconds: 2), () {
      _typingChannel?.sendBroadcastMessage(
        event: 'typing',
        payload: {'sender': 'officer', 'is_typing': false},
      );
    });
  }

  void _subscribeStream() {
    try {
      _streamSub = SupabaseService.instance.getDirectChatsStream().listen((msgs) {
        if (mounted) {
          setState(() {
            _messages = msgs;
            _isLoading = false;
          });
          _markRead();
          _scrollToBottom();
        }
      });
    } catch (_) {}
  }

  Future<void> _loadMessages() async {
    setState(() => _isLoading = true);
    try {
      final data = await SupabaseService.instance.getDirectChats();
      if (mounted) {
        setState(() {
          _messages = data;
          _isLoading = false;
        });
        _markRead();
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent + 60,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final rawText = _textController.text;

    // Security & Moderation Check
    final secResult = ChatSecurityGuard.validateMessage(rawText);
    if (!secResult.isValid) {
      setState(() => _validationError = secResult.errorMessage);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(secResult.errorMessage ?? 'Pesan tidak valid.'),
          backgroundColor: AppColors.rose,
        ),
      );
      return;
    }

    setState(() {
      _validationError = null;
      _isSending = true;
    });

    final textToSend = secResult.cleanMessage;
    _textController.clear();
    _onTextChanged('');

    try {
      await SupabaseService.instance.sendDirectChat(
        message: textToSend,
        category: _selectedCategory,
        isFlagged: secResult.isFlagged,
      );
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengirim pesan: $e'), backgroundColor: AppColors.rose),
      );
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Future<void> _callPoskoEmergency() async {
    final Uri telUrl = Uri.parse('tel:112');
    try {
      if (await canLaunchUrl(telUrl)) {
        await launchUrl(telUrl);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = SupabaseService.instance.currentUser?.id ?? '';

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        color: Color(0xFFF8FAFC),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag Handle
          const SizedBox(height: 10),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.obsidian,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.headset_mic_rounded, color: AppColors.emerald, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'POSKO KOMANDO ADMIN',
                        style: GoogleFonts.spaceGrotesk(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Row(
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: _isAdminTyping ? AppColors.emerald : AppColors.emerald,
                            ),
                          ),
                          const SizedBox(width: 5),
                          Expanded(
                            child: Text(
                              _isAdminTyping ? 'Admin sedang mengetik...' : '24/7 Terhubung Langsung • Terenkripsi',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11,
                                color: _isAdminTyping ? AppColors.emerald : AppColors.textSecondary,
                                fontWeight: _isAdminTyping ? FontWeight.w700 : FontWeight.w500,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.phone_in_talk_rounded, color: AppColors.rose, size: 22),
                  tooltip: 'Panggilan Darurat Posko (112)',
                  onPressed: _callPoskoEmergency,
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Category Selector Pills
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            color: Colors.white,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _categories.entries.map((entry) {
                  final isSelected = _selectedCategory == entry.key;
                  return Padding(
                    padding: const EdgeInsets.only(right: 6.0),
                    child: ChoiceChip(
                      label: Text(
                        entry.value,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? Colors.white : AppColors.textPrimary,
                        ),
                      ),
                      selected: isSelected,
                      selectedColor: AppColors.obsidian,
                      backgroundColor: const Color(0xFFF1F5F9),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      onSelected: (selected) {
                        if (selected) setState(() => _selectedCategory = entry.key);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Messages List (Ordered ASC, bottom is newest)
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.obsidian))
                : _messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.forum_outlined, size: 48, color: Colors.grey.shade400),
                            const SizedBox(height: 10),
                            Text(
                              'Belum ada percakapan dengan Posko.',
                              style: GoogleFonts.spaceGrotesk(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Kirim pesan untuk koordinasi kendala, alat, atau cuti/sakit.',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11.5,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        itemCount: _messages.length + (_isAdminTyping ? 1 : 0),
                        itemBuilder: (context, index) {
                          // If at the end and admin is typing -> show WhatsApp typing bubble
                          if (_isAdminTyping && index == _messages.length) {
                            return Align(
                              alignment: Alignment.centerLeft,
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: const BorderRadius.only(
                                    topLeft: Radius.circular(16),
                                    topRight: Radius.circular(16),
                                    bottomRight: Radius.circular(16),
                                    bottomLeft: Radius.circular(4),
                                  ),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.03),
                                      blurRadius: 4,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const SizedBox(
                                      width: 12,
                                      height: 12,
                                      child: CircularProgressIndicator(strokeWidth: 1.5, color: AppColors.emerald),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Admin sedang mengetik...',
                                      style: GoogleFonts.plusJakartaSans(
                                        fontSize: 11.5,
                                        fontStyle: FontStyle.italic,
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }

                          final msg = _messages[index];
                          final isMe = msg.senderId == currentUserId;

                          return Align(
                            alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              constraints: BoxConstraints(
                                maxWidth: MediaQuery.of(context).size.width * 0.80,
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: isMe ? AppColors.obsidian : Colors.white,
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(16),
                                  topRight: const Radius.circular(16),
                                  bottomLeft: isMe ? const Radius.circular(16) : const Radius.circular(4),
                                  bottomRight: isMe ? const Radius.circular(4) : const Radius.circular(16),
                                ),
                                border: Border.all(
                                  color: isMe ? AppColors.obsidian : const Color(0xFFE2E8F0),
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.04),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                                children: [
                                  // Category & Sender Header
                                  if (!isMe)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 4.0),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(Icons.admin_panel_settings_rounded, size: 13, color: AppColors.amber),
                                          const SizedBox(width: 4),
                                          Text(
                                            'ADMIN POSKO',
                                            style: GoogleFonts.ibmPlexMono(
                                              fontSize: 10,
                                              fontWeight: FontWeight.w800,
                                              color: AppColors.amber,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),

                                  if (msg.category != 'umum')
                                    Container(
                                      margin: const EdgeInsets.only(bottom: 4),
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: isMe ? Colors.white24 : const Color(0xFFF1F5F9),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        msg.category.toUpperCase(),
                                        style: TextStyle(
                                          fontSize: 9,
                                          fontWeight: FontWeight.w800,
                                          color: isMe ? Colors.white : AppColors.textPrimary,
                                        ),
                                      ),
                                    ),

                                  // Message Body
                                  Text(
                                    msg.message,
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 13.5,
                                      color: isMe ? Colors.white : const Color(0xFF1E293B),
                                      height: 1.35,
                                    ),
                                  ),
                                  const SizedBox(height: 4),

                                  // Timestamp & Read Status (Double Checkmark WhatsApp style)
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        msg.formattedTime,
                                        style: GoogleFonts.ibmPlexMono(
                                          fontSize: 9.5,
                                          color: isMe ? Colors.white60 : AppColors.textMuted,
                                        ),
                                      ),
                                      if (isMe) ...[
                                        const SizedBox(width: 4),
                                        Icon(
                                          msg.isRead ? Icons.done_all_rounded : Icons.done_all_rounded,
                                          size: 14,
                                          color: msg.isRead ? const Color(0xFF10B981) : Colors.white38,
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),

          // Security Error Banner
          if (_validationError != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              color: AppColors.roseLight,
              child: Row(
                children: [
                  const Icon(Icons.shield_outlined, size: 14, color: AppColors.rose),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _validationError!,
                      style: const TextStyle(fontSize: 11, color: AppColors.rose, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),

          // Input Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _textController,
                      minLines: 1,
                      maxLines: 3,
                      onChanged: _onTextChanged,
                      decoration: InputDecoration(
                        hintText: 'Ketik pesan ke Posko Komando...',
                        hintStyle: const TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        filled: true,
                        fillColor: const Color(0xFFF1F5F9),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: const BoxDecoration(
                      color: AppColors.obsidian,
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: _isSending
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                      onPressed: _isSending ? null : _sendMessage,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
