import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    updateDoc,
    doc,
    Timestamp
} from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";

const SERIES_COLLECTION = "taskSeries";
const TASKS_COLLECTION = "tasks";

/**
 * Check and generate recurring tasks
 * Should be called on app init
 */
export const checkAndGenerateRecurringTasks = async () => {
    console.log("Checking recurring tasks...");

    const seriesQuery = query(collection(db, SERIES_COLLECTION));
    const snapshot = await getDocs(seriesQuery);

    const now = dayjs();
    const generateWindow = 30; // generate for next 30 days

    for (const docSnap of snapshot.docs) {
        const series = { id: docSnap.id, ...docSnap.data() };
        await generateOccurrencesForSeries(series, now, generateWindow);
    }
};

const generateOccurrencesForSeries = async (series, now, windowDays) => {
    if (!series.frequency || !series.startDate) return;

    const startDate = dayjs(series.startDate.toDate());
    const tasksRef = collection(db, TASKS_COLLECTION);

    // Check existing tasks for this series in the future
    const upcomingTasksQuery = query(
        tasksRef,
        where("seriesId", "==", series.id),
        where("dueAt", ">=", Timestamp.fromDate(now.toDate()))
    );
    const existingDocs = await getDocs(upcomingTasksQuery);
    const existingDates = existingDocs.docs.map(d => dayjs(d.data().dueAt.toDate()).format('YYYY-MM-DD'));

    // Generate next N days
    for (let i = 0; i < windowDays; i++) {
        const checkDate = now.add(i, 'day');
        const dateStr = checkDate.format('YYYY-MM-DD');

        // Skip if already exists
        if (existingDates.includes(dateStr)) continue;

        let shouldGenerate = false;

        // Determine if we should generate for this date based on frequency
        switch (series.frequency) {
            case 'daily':
                shouldGenerate = true;
                break;

            case 'weekly':
                // Generate if day of week matches any in daysOfWeek array
                if (series.daysOfWeek && Array.isArray(series.daysOfWeek)) {
                    const dayOfWeek = checkDate.day(); // 0 = Sunday, 6 = Saturday
                    shouldGenerate = series.daysOfWeek.includes(dayOfWeek);
                }
                break;

            case 'monthly':
                // Generate on the same day of month as startDate
                shouldGenerate = checkDate.date() === startDate.date();
                break;

            case 'specific_days':
                // Same as weekly - check daysOfWeek
                if (series.daysOfWeek && Array.isArray(series.daysOfWeek)) {
                    const dayOfWeek = checkDate.day();
                    shouldGenerate = series.daysOfWeek.includes(dayOfWeek);
                }
                break;

            case 'school_days':
                // Monday to Friday (1-5 in dayjs, where 0=Sunday, 6=Saturday)
                const dayOfWeek = checkDate.day();
                shouldGenerate = dayOfWeek >= 1 && dayOfWeek <= 5;
                break;

            default:
                break;
        }

        if (shouldGenerate) {
            // Create task
            const dueAt = checkDate
                .hour(series.dueHour || 18)
                .minute(series.dueMinute || 0)
                .second(0);

            await addDoc(tasksRef, {
                title: series.titleTemplate || "Tâche récurrente",
                description: series.description || "",
                dueAt: Timestamp.fromDate(dueAt.toDate()),
                status: 'scheduled',
                createdByUid: series.createdByUid,
                assignedTo: series.assignedTo,
                seriesId: series.id,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            console.log(`Generated ${series.frequency} task for ${dateStr}`);
        }
    }
};
