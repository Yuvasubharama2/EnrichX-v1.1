import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface RealtimeConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onUpdate?: (payload: any) => void;
}

export function useRealtime({ table, event = '*', onUpdate }: RealtimeConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', 
        { event, schema: 'public', table },
        (payload) => {
          console.log(`Realtime update on ${table}:`, payload);
          setLastUpdate(new Date());
          if (onUpdate) {
            onUpdate(payload);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status for ${table}:`, status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      channel.unsubscribe();
      setIsConnected(false);
    };
  }, [table, event, onUpdate]);

  return { isConnected, lastUpdate };
}

export function useRealtimeStats() {
  const [stats, setStats] = useState({
    companies: 0,
    contacts: 0,
    lastUpdated: new Date()
  });

  const fetchStats = async () => {
    try {
      const [companiesResult, contactsResult] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('contacts').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        companies: companiesResult.count || 0,
        contacts: contactsResult.count || 0,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Error fetching realtime stats:', error);
    }
  };

  useRealtime({
    table: 'companies',
    onUpdate: fetchStats
  });

  useRealtime({
    table: 'contacts',
    onUpdate: fetchStats
  });

  useEffect(() => {
    fetchStats();
  }, []);

  return stats;
}