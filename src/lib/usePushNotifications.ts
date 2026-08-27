import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { STATUS_CONFIG } from '../lib/constants';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * Hook that:
 * 1. Requests browser notification permission
 * 2. Subscribes to Supabase Realtime on `notifications` and `status_logs`
 * 3. Fires browser push notification via Service Worker on new events
 */
export function usePushNotifications() {
  const { profile } = useAuth();
  const [permission, setPermission] = useState<PermissionState>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission as PermissionState;
  });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return 'unsupported' as PermissionState;
    }
    if (Notification.permission === 'granted') {
      setPermission('granted');
      return 'granted' as PermissionState;
    }
    if (Notification.permission === 'denied') {
      setPermission('denied');
      return 'denied' as PermissionState;
    }
    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);
    return result as PermissionState;
  }, []);

  const showNotification = useCallback((title: string, body: string, url?: string, tag?: string) => {
    if (Notification.permission !== 'granted') return;

    // Use Service Worker for persistent notifications (works when tab is in background)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        payload: { title, body, icon: '/favicon.svg', tag: tag || 'civicledger-' + Date.now(), url },
      });
    } else {
      // Fallback: basic Notification API
      const notif = new Notification(title, {
        body,
        icon: '/favicon.svg',
        tag: tag || 'civicledger-' + Date.now(),
      });
      notif.onclick = () => {
        window.focus();
        if (url) window.location.href = url;
      };
    }
  }, []);

  // Subscribe to Supabase Realtime for push notifications
  useEffect(() => {
    if (!profile || permission !== 'granted') return;

    const channel = supabase
      .channel('push-notifications')
      // Listen for new notifications inserted for this user
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const n = payload.new as { title: string; message: string; report_id: string | null; type: string };
          const url = n.report_id ? `/reports/${n.report_id}` : '/app/notifications';
          showNotification(
            `🏛️ ${n.title}`,
            n.message,
            url,
            `notif-${n.type}-${Date.now()}`
          );
        }
      )
      // Also listen for status_logs changes (fallback if notifications table trigger is not set up)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'status_logs',
        },
        async (payload) => {
          const log = payload.new as { report_id: string; to_status: string };

          // Only notify if this status change is relevant to the current user
          const { data: report } = await supabase
            .from('reports')
            .select('reporter_id, assigned_petugas_id, ticket_id, title')
            .eq('id', log.report_id)
            .maybeSingle();

          if (!report) return;

          const isMyReport = report.reporter_id === profile.id;
          const isAssignedToMe = report.assigned_petugas_id === profile.id;
          const isAdmin = profile.role === 'admin';

          if (!isMyReport && !isAssignedToMe && !isAdmin) return;

          const statusLabel = STATUS_CONFIG[log.to_status as keyof typeof STATUS_CONFIG]?.label || log.to_status;
          showNotification(
            `🏛️ Status Diperbarui → ${statusLabel}`,
            `${report.ticket_id} — ${report.title}`,
            `/reports/${log.report_id}`,
            `status-${log.report_id}`
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profile, permission, showNotification]);

  return { permission, requestPermission };
}
