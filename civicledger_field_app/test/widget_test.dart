import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:civicledger_field_app/models/report_model.dart';
import 'package:civicledger_field_app/widgets/ticket_card_widget.dart';

void main() {
  testWidgets('TicketCardWidget renders report information correctly', (WidgetTester tester) async {
    final report = ReportModel(
      id: 'rep-001',
      ticketId: 'TIK-2026-0001',
      title: 'Pohon Tumbang Menutup Jalan',
      description: 'Pohon besar tumbang di depan kantor pos.',
      category: 'lingkungan',
      status: 'assigned',
      priority: 'darurat',
      address: 'Jl. Merdeka No. 45',
      createdAt: DateTime.now(),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: TicketCardWidget(
            report: report,
            onTap: () {},
          ),
        ),
      ),
    );

    expect(find.text('TIK-2026-0001'), findsOneWidget);
    expect(find.text('Pohon Tumbang Menutup Jalan'), findsOneWidget);
    expect(find.text('DARURAT'), findsOneWidget);
    expect(find.text('Ditugaskan'), findsOneWidget);
  });
}
