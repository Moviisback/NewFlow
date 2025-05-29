// ----- Constants -----
export const SUBJECT_COLORS = [
    "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300",
    "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300",
    "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300",
    "bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300",
    "bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300",
    "bg-pink-100 border-pink-300 text-pink-800 dark:bg-pink-900/30 dark:border-pink-700 dark:text-pink-300",
    "bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300",
    "bg-teal-100 border-teal-300 text-teal-800 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-300",
];
export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MIN_STUDY_BLOCK = 30;
export const MAX_STUDY_BLOCK = 120;
export const SLEEP_START_TIME = "23:00"; // 11 PM
export const SLEEP_END_TIME = "07:00";   // 7 AM
export const EVENT_BUFFER = 15;          // 15 minute buffer around fixed events
export const TIMETABLE_START_HOUR = 7;   // Start timetable display at 7 AM
export const TIMETABLE_END_HOUR = 23;    // End timetable display at 11 PM
export const TIMETABLE_HOUR_HEIGHT = 60; // Pixels per hour in timetable view