import { useEffect } from 'react';
import { subscribeToAllTasks } from '../services/TaskService';
import { useSnackbar } from '../contexts/SnackbarProvider';
import dayjs from 'dayjs';

const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute (triggered every 5 mins effectively by logic)

const useAggressiveReminders = () => {
    const { showInfo, showWarning } = useSnackbar();

    useEffect(() => {
        let tasks = [];

        // Subscribe to tasks to have fresh data
        const unsubscribe = subscribeToAllTasks((updatedTasks) => {
            tasks = updatedTasks;
        });

        const intervalId = setInterval(() => {
            const now = dayjs();
            const overdueTasks = tasks.filter(t => t.status !== 'done' && dayjs(t.dueAt).isBefore(now));

            if (overdueTasks.length > 0) {
                // Simple logic: Trigger every check if there are overdue tasks
                // Requirement: "si non terminée : toutes les 5 minutes"
                // We can just show it every minute if we want to be annoying, or track last shown.
                // For simplicity/robustness, we show it every minute divisible by 5? 
                // Or just every minute. Let's do every minute for "Aggressive".

                // Actually, let's try to verify if we are at a 5-minute mark or just rely on the interval being 5 mins.
                // But the interval restarts on reload. 
                // Let's just show it.

                showWarning(`⚠ ${overdueTasks.length} Tâche(s) en retard !`);

                // Play sound if possible
                try {
                    // A beep sound or similar. Browsers require interaction first, so this might fail until click.
                    // We won't embed a sound file to keep it simple, just the visual.
                } catch (e) { }
            }
        }, 5 * 60 * 1000); // 5 minutes

        return () => {
            unsubscribe();
            clearInterval(intervalId);
        };
    }, [showInfo, showWarning]);
};

export default useAggressiveReminders;
