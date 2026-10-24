import { onMounted, onUnmounted, watch } from 'vue';
import { useSignalR } from './useSignalR';
import { ORDERS_SIGNALR_HUB_URL } from '@/config/signalr';

export function useEmployeeLeaveUpdates(refresh: () => void | Promise<void>) {
  const { on, off, connectionState } = useSignalR(ORDERS_SIGNALR_HUB_URL);
  const changed = () => { void Promise.resolve(refresh()).catch(() => {}); };
  const visible = () => { if (document.visibilityState === 'visible') changed(); };

  // Las vistas y el menú ya consultan los permisos al montarse. La primera
  // conexión normal no debe provocar otro refresh; sí recuperar tras un fallo
  // inicial y refrescar al reconectar una conexión que ya estuvo activa.
  let connectedOnce = connectionState.value === 'connected';
  let recoveryNeeded = connectionState.value === 'error' || connectionState.value === 'reconnecting';
  watch(connectionState, (value) => {
    if (value === 'error' || value === 'reconnecting') recoveryNeeded = true;
    if (value !== 'connected') return;
    if (connectedOnce || recoveryNeeded) changed();
    connectedOnce = true;
    recoveryNeeded = false;
  });

  onMounted(() => { on('EmployeeLeaveChanged', changed); document.addEventListener('visibilitychange', visible); });
  onUnmounted(() => { off('EmployeeLeaveChanged', changed); document.removeEventListener('visibilitychange', visible); });
}
