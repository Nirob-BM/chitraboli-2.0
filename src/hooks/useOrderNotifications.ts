import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useOrderNotifications = (isAdmin: boolean) => {
  const [newOrderCount, setNewOrderCount] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastOrderIdRef = useRef<string | null>(null);

  const playNotificationSound = () => {
    try {
      // Create audio context on demand
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Pleasant notification sound (two-tone chime)
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1200, ctx.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;

    // Seed the lastOrderId baseline so we only alert on truly new orders
    const seed = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data?.id) {
        lastOrderIdRef.current = data.id;
      }
    };

    const poll = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || error || !data) return;
      if (lastOrderIdRef.current && data.id !== lastOrderIdRef.current) {
        lastOrderIdRef.current = data.id;
        playNotificationSound();
        setNewOrderCount(prev => prev + 1);
        toast.success(`New Order!`, {
          description: `Order from ${data.customer_name}`,
          duration: 5000,
        });
      } else if (!lastOrderIdRef.current) {
        lastOrderIdRef.current = data.id;
      }
    };

    seed();
    const interval = setInterval(poll, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAdmin]);

  const clearNotifications = () => {
    setNewOrderCount(0);
  };

  return { newOrderCount, clearNotifications };
};
