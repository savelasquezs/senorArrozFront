import { onMounted, onUnmounted, watch } from 'vue';
import { useSignalR } from './useSignalR';
import { ORDERS_SIGNALR_HUB_URL } from '@/config/signalr';

export function useEmployeeLeaveUpdates(refresh: () => void | Promise<void>) {
  const { on, off, connectionState } = useSignalR(ORDERS_SIGNALR_HUB_URL);
  const changed = () => { void Promise.resolve(refresh()).catch(() => {}); };
  const visible = () => { if (document.visibilityState === 'visible') changed(); };
  watch(connectionState, (value, previous) => { if (value === 'connected' && previous !== value) changed(); });
  onMounted(() => { on('EmployeeLeaveChanged', changed); document.addEventListener('visibilitychange', visible); });
  onUnmounted(() => { off('EmployeeLeaveChanged', changed); document.removeEventListener('visibilitychange', visible); });
}
