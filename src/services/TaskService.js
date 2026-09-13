import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    getDocs,
    limit
} from "firebase/firestore";
import { db } from "../firebase";

const TASKS_COLLECTION = "tasks";
const SERIES_COLLECTION = "taskSeries";

/**
 * Creates a new task
 * @param {Object} taskData 
 * @param {string} taskData.title
 * @param {string} taskData.status - 'scheduled', 'done', 'overdue'
 * @param {Date} taskData.dueAt
 * @param {string} taskData.assignedTo
 * @param {string} taskData.createdByUid
 */
export const createTask = async (taskData) => {
    return addDoc(collection(db, TASKS_COLLECTION), {
        ...taskData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
};

/**
 * Updates a task status
 * @param {string} taskId 
 * @param {string} status 
 */
export const updateTaskStatus = async (taskId, status) => {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    return updateDoc(taskRef, {
        status,
        updatedAt: serverTimestamp()
    });
};

/**
 * Deletes a task
 * @param {string} taskId 
 */
export const deleteTask = async (taskId) => {
    return deleteDoc(doc(db, TASKS_COLLECTION, taskId));
};

/**
 * Subscribe to tasks for a specific user (or all if parent)
 * This simplification fetches all tasks for now as usually pwa needs offline support
 * but we filter in query if needed.
 * @param {Function} callback 
 */
export const subscribeToAllTasks = (callback) => {
    // Query: tasks where status != 'done' OR done recently?
    // For simplicity, let's get all non-done tasks + done today

    const q = query(
        collection(db, TASKS_COLLECTION),
        orderBy("dueAt", "asc")
    );

    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dueAt: doc.data().dueAt?.toDate() // Convert Timestamp to Date
        }));
        callback(tasks);
    });
};

/**
 * Mark a task as done
 */
export const markTaskDone = async (taskId) => {
    return updateTaskStatus(taskId, 'done');
};
