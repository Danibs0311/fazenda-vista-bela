import { storage } from './storageService';
import { WeekStatus, HarvestWeek } from '../types';
import { getWeekRange } from '../utils/dateUtils';

/**
 * Automates the closing of expired harvest cycles (Thursdays at 23:59:30)
 * and the opening of new weekly cycles (Fridays at 00:00:00).
 * 
 * Returns true if any changes were made to the cycles in the database.
 */
export const checkAndManageCycles = async (): Promise<boolean> => {
  try {
    const weeks = await storage.getWeeks();
    const now = new Date();
    let updated = false;

    // 1. Close expired open cycles
    for (const week of weeks) {
      if (week.status === WeekStatus.OPEN) {
        // Parse week.data_fim (Thursday) in local time
        const [year, month, day] = week.data_fim.split('-').map(Number);
        const closeTime = new Date(year, month - 1, day, 23, 59, 30);
        
        if (now >= closeTime) {
          console.log(`[CycleManager] Auto-closing week ${week.id} as it is past Thursday 23:59:30`);
          const updatedWeek: HarvestWeek = {
            ...week,
            status: WeekStatus.CLOSED,
            data_fechamento: now.toISOString()
          };
          await storage.saveWeek(updatedWeek);
          updated = true;
        }
      }
    }

    // 2. Open new cycle if it is Friday or later and does not exist in the database yet
    const currentRange = getWeekRange();
    
    // We are in the transition window on Thursday if it is Thursday and time is >= 23:59:30.
    // In this window, getWeekRange() still returns the current Thursday's week (which we just closed).
    // Outside of this 30-second window (or once it's Friday), getWeekRange() shifts or is ready.
    const isTransitionWindow = now.getDay() === 4 && (
      now.getHours() > 23 || (
        now.getHours() === 23 && (
          now.getMinutes() > 59 || (
            now.getMinutes() === 59 && now.getSeconds() >= 30
          )
        )
      )
    );

    if (!isTransitionWindow) {
      const hasCurrentWeek = weeks.some(w => w.id === currentRange.id);
      if (!hasCurrentWeek) {
        console.log(`[CycleManager] Auto-opening new week ${currentRange.id}`);
        const newWeek: HarvestWeek = {
          id: currentRange.id,
          data_inicio: currentRange.start,
          data_fim: currentRange.end,
          status: WeekStatus.OPEN
        };
        await storage.saveWeek(newWeek);
        updated = true;
      }
    }

    if (updated) {
      // Broadcast event so active views know to reload data
      window.dispatchEvent(new Event('cycle-status-change'));
    }

    return updated;
  } catch (error) {
    console.error('[CycleManager] Error running cycle automation:', error);
    return false;
  }
};
