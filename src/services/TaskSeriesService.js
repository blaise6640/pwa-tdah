import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

const SERIES_COLLECTION = "taskSeries";

/**
 * Create a recurring task series
 * @param {Object} seriesData 
 * @returns {Promise}
 */
export const createTaskSeries = async (seriesData) => {
    return addDoc(collection(db, SERIES_COLLECTION), {
        ...seriesData,
        startDate: Timestamp.fromDate(seriesData.startDate),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    });
};
