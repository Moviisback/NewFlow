'use client';

import React, { useState, useEffect, ChangeEvent, useRef, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    format, addDays, differenceInDays, startOfWeek, endOfWeek, getDay, parse, set,
    eachMinuteOfInterval, isWithinInterval, addMinutes, subMinutes, formatISO, parseISO,
    differenceInMinutes, startOfDay, endOfDay, getHours, getMinutes
} from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock, Award, AlertCircle, Upload, CheckCircle, Trash2, PlusCircle, BookCopy, Lock, GripVertical, ArrowRight, Info, Eye, Grip, Columns } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Utility function for merging class names
const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// ----- Data Structures -----

interface Task {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  title: string;
  description: string;
  duration: number; // in minutes
  taskType: 'study' | 'practice' | 'review' | 'other'; // Added task type
  isScheduled: boolean;
  scheduledDay?: string; // ISO Date string if scheduled
  scheduledTime?: string; // "HH:MM" if scheduled
}

interface DaySchedule {
  date: string; // ISO String
  tasks: Task[]; // Tasks *scheduled* for this day
  fixedEvents: FixedEventBlock[];
  availableSlots: TimeSlot[]; // Calculated available time slots
}

interface Subject {
  id: string;
  name: string;
  examDate?: Date;
  priorKnowledge: string;
  file?: File;
  fileName?: string;
  fileType?: string;
  suggestedMinutes?: number; // Optional: Suggestion from calculation
  allocatedMinutes: number; // User-adjusted or confirmed allocation
}

interface FixedEvent {
  id: string;
  name: string;
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat (Date-fns format)
  startTime: string; // "HH:MM" format (24-hour)
  endTime: string; // "HH:MM" format (24-hour)
}

interface FixedEventBlock {
    id: string;
    name: string;
    startTime: string; // "HH:MM"
    endTime: string; // "HH:MM"
}

// Represents a block of available time
interface TimeSlot {
    start: Date; // Date object for precise comparison
    end: Date;
}

// Type for the overall planning state
type WorkflowStep = 'input' | 'allocate' | 'schedule' | 'view'; // 'view' is implicitly handled by schedule state now
type ScheduleViewMode = 'dragdrop' | 'timetable';

// ----- Constants -----
const SUBJECT_COLORS = [
    "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300",
    "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300",
    "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300",
    "bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300",
    "bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300",
    "bg-pink-100 border-pink-300 text-pink-800 dark:bg-pink-900/30 dark:border-pink-700 dark:text-pink-300",
    "bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300",
    "bg-teal-100 border-teal-300 text-teal-800 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-300",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MIN_STUDY_BLOCK = 30;
const MAX_STUDY_BLOCK = 120;
const SLEEP_START_TIME = "23:00"; // 11 PM
const SLEEP_END_TIME = "07:00";   // 7 AM
const EVENT_BUFFER = 15;          // 15 minute buffer around fixed events
const TIMETABLE_START_HOUR = 7;   // Start timetable display at 7 AM
const TIMETABLE_END_HOUR = 23;    // End timetable display at 11 PM
const TIMETABLE_HOUR_HEIGHT = 60; // Pixels per hour in timetable view


// ----- Helper Functions -----

const timeToMinutes = (time: string): number => {
    const parts = time.split(':');
    if (parts.length !== 2) return 0;
    const [hours, minutes] = parts.map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const calculateAvailability = (fixedEvents: FixedEvent[], weekStart: Date): { availabilityMap: { [dayIndex: number]: TimeSlot[] }, fixedBlocksMap: { [dayIndex: number]: FixedEventBlock[] } } => {
    const availabilityMap: { [dayIndex: number]: TimeSlot[] } = {};
    const fixedBlocksMap: { [dayIndex: number]: FixedEventBlock[] } = {};

    for (let i = 0; i < 7; i++) {
        const dayDate = addDays(weekStart, i);
        // Define day start and end for clarity
        const dayStart = startOfDay(dayDate);
        const dayEnd = endOfDay(dayDate);

        // Handle sleep time properly, potentially crossing midnight
        const sleepStartHour = parseInt(SLEEP_START_TIME.split(':')[0]);
        const sleepStartMin = parseInt(SLEEP_START_TIME.split(':')[1]);
        const sleepEndHour = parseInt(SLEEP_END_TIME.split(':')[0]);
        const sleepEndMin = parseInt(SLEEP_END_TIME.split(':')[1]);

        let sleepStartDateTime = set(dayDate, { hours: sleepStartHour, minutes: sleepStartMin, seconds: 0, milliseconds: 0 });
        let sleepEndDateTime = set(dayDate, { hours: sleepEndHour, minutes: sleepEndMin, seconds: 0, milliseconds: 0 });

        // If sleep crosses midnight (e.g., starts at 23:00, ends at 07:00)
        const sleepBlocks = [];
        if (timeToMinutes(SLEEP_START_TIME) > timeToMinutes(SLEEP_END_TIME)) {
            // Sleep block 1: From sleep start time to end of day
             sleepBlocks.push({ start: sleepStartDateTime, end: dayEnd });
             // Sleep block 2: From start of *next* day to sleep end time (applied to the *current* day's calculation for simplicity)
             sleepBlocks.push({ start: dayStart, end: sleepEndDateTime });
        } else {
             // Sleep is within the same day
             sleepBlocks.push({ start: sleepStartDateTime, end: sleepEndDateTime });
        }

        // Initial full availability for the day
        let currentDaySlots: TimeSlot[] = [{ start: dayStart, end: dayEnd }];

        // Remove sleep blocks
        sleepBlocks.forEach(sleepBlock => {
            const updatedSlots: TimeSlot[] = [];
            currentDaySlots.forEach(slot => {
                 // Check for overlap
                 const overlaps = isWithinInterval(sleepBlock.start, { start: slot.start, end: slot.end }) || // FIX: isWithinInterval second arg is Interval
                                isWithinInterval(subMinutes(sleepBlock.end, 1), { start: slot.start, end: slot.end }) || // FIX: isWithinInterval second arg is Interval
                                isWithinInterval(slot.start, { start: sleepBlock.start, end: sleepBlock.end }); // FIX: isWithinInterval second arg is Interval

                 if (overlaps) {
                     // Split slot if needed
                     if (slot.start < sleepBlock.start) {
                         updatedSlots.push({ start: slot.start, end: sleepBlock.start });
                     }
                      if (slot.end > sleepBlock.end) {
                         updatedSlots.push({ start: sleepBlock.end, end: slot.end });
                      }
                 } else {
                     // No overlap, keep the slot
                     updatedSlots.push(slot);
                 }
            });
             currentDaySlots = updatedSlots;
        });
         // Filter initial short slots from sleep removal AND ensure difference is >= MIN_STUDY_BLOCK
         availabilityMap[i] = currentDaySlots.filter(slot => differenceInMinutes(slot.end, slot.start) >= MIN_STUDY_BLOCK);
         fixedBlocksMap[i] = []; // Initialize fixed blocks for the day
    }

    // Remove fixed events and buffers
    fixedEvents.forEach(event => {
        try {
            const eventStartBase = parse(event.startTime, 'HH:mm', new Date());
            const eventEndBase = parse(event.endTime, 'HH:mm', new Date());

            if (isNaN(eventStartBase.getTime()) || isNaN(eventEndBase.getTime())) {
                console.warn(`Skipping fixed event "${event.name}" due to invalid time format.`);
                return;
            }

            event.days.forEach(dayIndex => {
                const dayDate = addDays(weekStart, dayIndex);
                const eventStartDateTime = set(dayDate, { hours: eventStartBase.getHours(), minutes: eventStartBase.getMinutes(), seconds: 0, milliseconds: 0 });
                const eventEndDateTime = set(dayDate, { hours: eventEndBase.getHours(), minutes: eventEndBase.getMinutes(), seconds: 0, milliseconds: 0 });

                // Calculate buffered block
                const blockStart = subMinutes(eventStartDateTime, EVENT_BUFFER);
                const blockEnd = addMinutes(eventEndDateTime, EVENT_BUFFER);

                 // Add to fixedBlocksMap *before* removing from availability
                 fixedBlocksMap[dayIndex].push({
                     id: event.id,
                     name: event.name,
                     startTime: format(eventStartDateTime, 'HH:mm'), // Store original time, not buffered
                     endTime: format(eventEndDateTime, 'HH:mm')
                 });

                 // Remove buffered block from availability for this day
                let currentSlots = availabilityMap[dayIndex];
                const updatedSlots: TimeSlot[] = [];
                currentSlots.forEach(slot => {
                    const slotInterval = { start: slot.start, end: slot.end };
                    const blockInterval = { start: blockStart, end: blockEnd };

                    const overlaps = isWithinInterval(blockInterval.start, slotInterval) ||
                                   isWithinInterval(subMinutes(blockInterval.end, 1), slotInterval) ||
                                   isWithinInterval(slotInterval.start, blockInterval);

                    if (overlaps) {
                        if (slot.start < blockInterval.start) {
                             updatedSlots.push({ start: slot.start, end: blockInterval.start });
                        }
                         if (slot.end > blockInterval.end) {
                             updatedSlots.push({ start: blockInterval.end, end: slot.end });
                         }
                    } else {
                        updatedSlots.push(slot);
                    }
                });
                // Filter out slots that become too short *after* removing the event
                 availabilityMap[dayIndex] = updatedSlots.filter(slot => differenceInMinutes(slot.end, slot.start) >= MIN_STUDY_BLOCK);
            });
        } catch (parseError) {
             console.error(`Error parsing time for fixed event "${event.name}":`, parseError);
        }
    });

     // Sort fixed blocks for consistent display
     Object.values(fixedBlocksMap).forEach(dayBlocks => dayBlocks.sort((a,b) => a.startTime.localeCompare(b.startTime)));

    return { availabilityMap, fixedBlocksMap };
};

// ----- Main Component -----

export default function StudyPlanPage() {
  // --- Core State ---
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('input');
  const [scheduleViewMode, setScheduleViewMode] = useState<ScheduleViewMode>('dragdrop'); // New state for view mode
  const [subjects, setSubjects] = useState<Subject[]>([
     { id: crypto.randomUUID(), name: '', priorKnowledge: 'Basic', allocatedMinutes: 0 }
  ]);
  const [fixedEvents, setFixedEvents] = useState<FixedEvent[]>([
      // Example: { id: crypto.randomUUID(), name: 'Work', days: [1, 2, 3, 4, 5], startTime: '10:00', endTime: '15:00' } // Mon-Fri 10-3
  ]);
  const [totalWeeklyStudyTime, setTotalWeeklyStudyTime] = useState<string>('20');

  // --- Derived/Calculated State ---
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday start
  const [availabilityMap, setAvailabilityMap] = useState<{ [dayIndex: number]: TimeSlot[] }>({});
  const [fixedBlocksMap, setFixedBlocksMap] = useState<{ [dayIndex: number]: FixedEventBlock[] }>({});
  const [taskPool, setTaskPool] = useState<Task[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>([]);

  // --- UI/Interaction State ---
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showFocus, setShowFocus] = useState<boolean>(false);
  const [dailyAgenda, setDailyAgenda] = useState<DaySchedule | null>(null);

  const totalAvailableMinutes = useMemo(() => {
    // This calculates the *actual* available time slots AFTER considering sleep and fixed events
    return Object.values(availabilityMap).flat().reduce((sum, slot) => sum + differenceInMinutes(slot.end, slot.start), 0);
  }, [availabilityMap]);

  // --- Effects ---
  useEffect(() => {
    if (workflowStep === 'schedule') {
      const todayStr = formatISO(new Date(), { representation: 'date' });
      const todayAgenda = weeklySchedule.find(day => day.date === todayStr);
      setDailyAgenda(todayAgenda || null);
    } else {
      setDailyAgenda(null);
    }
  }, [workflowStep, weeklySchedule]);


  // --- Subject Management Handlers ---
  const addSubject = () => setSubjects([...subjects, { id: crypto.randomUUID(), name: '', priorKnowledge: 'Basic', allocatedMinutes: 0 }]);

  const removeSubject = (id: string) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter(subject => subject.id !== id));
      if (workflowStep !== 'input') {
          setWorkflowStep('input'); setTaskPool([]); setWeeklySchedule([]); setAvailabilityMap({}); setFixedBlocksMap({}); setWarnings([]); setError(null);
      }
    }
  };

  const updateSubject = (id: string, field: keyof Subject, value: any) => {
     if (workflowStep !== 'input' && field !== 'allocatedMinutes') {
         console.warn("Changing subject details requires restarting planning.");
         setWorkflowStep('input'); setTaskPool([]); setWeeklySchedule([]); setAvailabilityMap({}); setFixedBlocksMap({}); setWarnings([]); setError(null);
     }
    setSubjects(subjects.map(subject =>
      subject.id === id ? { ...subject, [field]: value } : subject
    ));
  };

  const updateSubjectAllocation = (id: string, minutes: number) => {
    setSubjects(subjects.map(subject =>
      subject.id === id ? { ...subject, allocatedMinutes: minutes } : subject
    ));
  };

  const handleFileChange = (id: string, event: ChangeEvent<HTMLInputElement>) => {
     if (workflowStep !== 'input') {
         console.warn("Changing files requires restarting planning.");
         setWorkflowStep('input'); setTaskPool([]); setWeeklySchedule([]); setAvailabilityMap({}); setFixedBlocksMap({}); setWarnings([]); setError(null);
     }
    const file = event.target.files?.[0];
    if (!file) return;
    updateSubject(id, 'file', file);
    updateSubject(id, 'fileName', file.name);
    updateSubject(id, 'fileType', file.type);
    // NOTE: Actual file analysis for task generation is not implemented here.
    setWarnings(prev => [...prev, `Note: File '${file.name}' uploaded. Task generation based on file content is not yet supported; using standard task breakdown.`])
  };


  // --- Fixed Event Management Handlers ---
   const addFixedEvent = () => {
       if (workflowStep !== 'input') { setWorkflowStep('input'); setWarnings([]); setError(null); }
       setFixedEvents([
           ...fixedEvents, { id: crypto.randomUUID(), name: '', days: [], startTime: '09:00', endTime: '10:00' }
       ]);
   };

   const removeFixedEvent = (id: string) => {
       if (workflowStep !== 'input') { setWorkflowStep('input'); setWarnings([]); setError(null); }
       setFixedEvents(fixedEvents.filter(event => event.id !== id));
   };

   const updateFixedEvent = (id: string, field: keyof FixedEvent, value: any) => {
        if (workflowStep !== 'input') { setWorkflowStep('input'); setWarnings([]); setError(null); }
       if ((field === 'startTime' || field === 'endTime') && typeof value === 'string') {
            const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
            if (!timePattern.test(value)) {
                 console.warn(`Invalid time format for ${field}: ${value}. Use HH:MM.`);
                return;
            }
        }
       setFixedEvents(fixedEvents.map(event =>
           event.id === id ? { ...event, [field]: value } : event
        ));
    };

    const handleDayToggle = (eventId: string, dayIndex: number) => {
        if (workflowStep !== 'input') { setWorkflowStep('input'); setWarnings([]); setError(null); }
        const event = fixedEvents.find(e => e.id === eventId);
        if (!event) return;
        const currentDays = event.days;
        let newDays;
        if (currentDays.includes(dayIndex)) {
            newDays = currentDays.filter(d => d !== dayIndex);
        } else {
            newDays = [...currentDays, dayIndex].sort((a,b) => a-b);
        }
        updateFixedEvent(eventId, 'days', newDays);
    };


  // --- Workflow Step Handlers ---
  const handleProceedToAllocation = () => {
    setError(null);
    setWarnings([]);

    // --- Validation ---
    let isValid = true;
    const tempWarnings: string[] = [];
    if (subjects.some(s => !s.name.trim())) { setError("Please provide a name for all subjects."); isValid = false; }
    if (subjects.length === 0) { setError("Please add at least one subject."); isValid = false; }
    if (fixedEvents.some(e => !e.name.trim())) { setError("Please provide a name for all fixed commitments."); isValid = false; }
    if (fixedEvents.some(e => e.days.length === 0)) { setError("Please select at least one day for each fixed commitment."); isValid = false; }
    fixedEvents.forEach(e => {
         const startMins = timeToMinutes(e.startTime);
         const endMins = timeToMinutes(e.endTime);
         if (startMins === 0 && e.startTime !== '00:00') { // Basic check for invalid parse
             setError(`Invalid start time format "${e.startTime}" for commitment "${e.name}". Use HH:MM.`); isValid = false;
         }
         if (endMins === 0 && e.endTime !== '00:00') {
             setError(`Invalid end time format "${e.endTime}" for commitment "${e.name}". Use HH:MM.`); isValid = false;
         }
         if (startMins >= endMins && isValid) { // Only check if times were valid format
             setError(`End time must be after start time for commitment "${e.name}".`); isValid = false;
         }
    });

    if (!isValid) return;

    setIsLoading(true);
    // Use setTimeout to simulate async work
    setTimeout(() => {
      try {
         console.log("Calculating availability based on fixed events:", fixedEvents);
         const { availabilityMap: calculatedAvMap, fixedBlocksMap: calculatedFxMap } = calculateAvailability(fixedEvents, weekStart);
         console.log("Availability Map:", calculatedAvMap);
         console.log("Fixed Blocks Map:", calculatedFxMap);

         const totalMins = Object.values(calculatedAvMap).flat().reduce((sum, slot) => sum + differenceInMinutes(slot.end, slot.start), 0);
         console.log(`Total available minutes this week (after fixed events & sleep): ${totalMins} (${minutesToHours(totalMins)} hrs)`);

         if (totalMins <= 0) {
             tempWarnings.push("Warning: No available study time found based on your fixed commitments and sleep schedule. You can still proceed but won't be able to schedule tasks.");
         }

         const weeklyGoalMinutesInput = parseFloat(totalWeeklyStudyTime) * 60;
         const effectiveWeeklyGoal = !isNaN(weeklyGoalMinutesInput) && weeklyGoalMinutesInput > 0 ? weeklyGoalMinutesInput : totalMins;

         console.log(`Suggesting allocations based on available ${totalMins} mins and goal ${effectiveWeeklyGoal} mins.`);
         const subjectsWithSuggestions = suggestSubjectAllocations(subjects, totalMins, effectiveWeeklyGoal);

         setAvailabilityMap(calculatedAvMap);
         setFixedBlocksMap(calculatedFxMap);
         setSubjects(subjectsWithSuggestions);
         setWarnings(tempWarnings);
         setWorkflowStep('allocate');

      } catch (err: any) { // Type the error object
         console.error("Error during allocation calculation:", err);
         setError(`Failed to calculate availability or suggest allocations: ${err.message || 'An unknown error occurred'}`);
         setAvailabilityMap({});
         setFixedBlocksMap({});
      } finally {
         setIsLoading(false);
      }
    }, 50);
  };

  const handleConfirmAllocation = () => {
      setError(null);
      setIsLoading(true);
      const currentWarnings: string[] = [...warnings]; // Keep existing warnings

      const totalAllocated = subjects.reduce((sum, s) => sum + s.allocatedMinutes, 0);

      if (totalAllocated > totalAvailableMinutes) {
          currentWarnings.push(`Warning: You've allocated ${minutesToHours(totalAllocated)} hrs, which is more than the estimated available ${minutesToHours(totalAvailableMinutes)} hrs. Scheduling might be tight or impossible.`);
      }
      if (totalAllocated === 0 && totalAvailableMinutes > 0){
          currentWarnings.push(`Note: You haven't allocated any study time, but there is available time. Proceeding with an empty task pool.`);
      } else if (totalAllocated > 0 && totalAllocated < totalAvailableMinutes * 0.5) {
          currentWarnings.push(`Note: You've allocated significantly less time (${minutesToHours(totalAllocated)} hrs) than available (${minutesToHours(totalAvailableMinutes)} hrs).`);
      }
      setWarnings(currentWarnings);

      setTimeout(() => {
          try {
              console.log("Generating task pool...");
              // Pass subjects with final allocatedMinutes
              const pool = generateTaskPool(subjects);
              setTaskPool(pool);
              console.log("Task pool generated:", pool);

              console.log("Initializing weekly schedule with calculated availability/fixed blocks...");
              const initialSchedule: DaySchedule[] = Array(7).fill(null).map((_, i) => {
                  const dayDate = addDays(weekStart, i);
                  return {
                      date: formatISO(dayDate, { representation: 'date' }),
                      tasks: [],
                      fixedEvents: fixedBlocksMap[i] || [],
                      availableSlots: availabilityMap[i] || []
                  };
              });
              setWeeklySchedule(initialSchedule);
              console.log("Weekly schedule initialized:", initialSchedule);

              setWorkflowStep('schedule');

          } catch (err: any) { // FIX: Was missing closing brace for catch block
              console.error("Error generating task pool or schedule:", err);
              setError(`Failed to generate task pool or initialize schedule: ${err.message || 'Unknown error'}`);
          } finally { // FIX: Added missing closing brace for catch block above
              setIsLoading(false);
          }
      }, 50);
  };

 // --- Scheduling Handlers (Remain Largely the Same Logic) ---
   const handleScheduleTask = (taskId: string, dayDateISO: string, startTime: Date) => {
       // Update weekly schedule
       setWeeklySchedule((currentSchedule: DaySchedule[]): DaySchedule[] => { // FIX: Added types
           const newSchedule = currentSchedule.map((day: DaySchedule) => ({ ...day, tasks: [...day.tasks] })); // FIX: Added type for day

           // Find task in the pool (need access to taskPool state here)
           const taskIndexInPool = taskPool.findIndex((t: Task) => t.id === taskId); // FIX: Added type for t
           if (taskIndexInPool === -1) {
                console.error("Task not found in pool:", taskId);
                // Maybe add the task to the pool if it's missing but being scheduled? Or just return.
                return currentSchedule; // Return original schedule if task not found
           }
           const taskToSchedule = { ...taskPool[taskIndexInPool] }; // Clone task from pool

           const dayIndex = newSchedule.findIndex((d: DaySchedule) => d.date === dayDateISO); // FIX: Added type for d
           if (dayIndex === -1) { console.error("Target day not found:", dayDateISO); return currentSchedule; }

            taskToSchedule.isScheduled = true;
            taskToSchedule.scheduledDay = dayDateISO;
            taskToSchedule.scheduledTime = format(startTime, 'HH:mm');

            const targetDay = newSchedule[dayIndex];
            let inserted = false;
            for (let i = 0; i < targetDay.tasks.length; i++) {
                if ((targetDay.tasks[i].scheduledTime ?? "24:00") > taskToSchedule.scheduledTime) {
                    targetDay.tasks.splice(i, 0, taskToSchedule);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) { targetDay.tasks.push(taskToSchedule); }

            // Important: State updates are batched. The taskPool update should happen *after* this.
            // We return the new schedule here. The taskPool update happens separately.
            return newSchedule;
       });

       // Update task pool *after* scheduling
       setTaskPool((currentPool: Task[]) => currentPool.filter((t: Task) => t.id !== taskId)); // FIX: Added types
  };

   // FIX: Refactored handleUnscheduleTask
   const handleUnscheduleTask = (taskId: string, sourceDayDateISO: string) => {
       let taskToMoveToPool: Task | undefined = undefined;

       // First, update the weekly schedule to remove the task
       setWeeklySchedule((currentSchedule: DaySchedule[]): DaySchedule[] => { // FIX: Added type
           const dayIndex = currentSchedule.findIndex((d: DaySchedule) => d.date === sourceDayDateISO); // FIX: Added type
           if (dayIndex === -1) {
               console.warn("Source day not found for unscheduling:", sourceDayDateISO);
               return currentSchedule; // Return original state if day not found
           }

           const targetDay = currentSchedule[dayIndex];
           const taskIndexOnDay = targetDay.tasks.findIndex((t: Task) => t.id === taskId); // FIX: Added type

           if (taskIndexOnDay === -1) {
               console.warn("Task not found on source day for unscheduling:", taskId);
               return currentSchedule; // Return original state if task not found on day
           }

           // Find the task *before* modifying the schedule state
           taskToMoveToPool = targetDay.tasks[taskIndexOnDay];

           // Create a new schedule array with the task removed
           const newSchedule = [...currentSchedule];
           const updatedDayTasks = targetDay.tasks.filter((t: Task) => t.id !== taskId); // FIX: Added type
           newSchedule[dayIndex] = { ...targetDay, tasks: updatedDayTasks };
           return newSchedule;
       });

       // If the task was successfully found and removed from the schedule, add it back to the pool
       if (taskToMoveToPool) {
           const updatedTask = { ...taskToMoveToPool, isScheduled: false, scheduledDay: undefined, scheduledTime: undefined };
           setTaskPool((currentPool: Task[]): Task[] => // FIX: Added type
               [...currentPool, updatedTask].sort((a, b) => { // FIX: Corrected spread syntax and added types
                   const nameCompare = a.subjectName.localeCompare(b.subjectName);
                   if (nameCompare !== 0) return nameCompare;
                   return a.title.localeCompare(b.title);
               })
           );
       }
   };


  // --- Other Handlers ---
  const toggleFocusMode = () => setShowFocus((currentFocus: boolean) => !currentFocus); // FIX: Added type

  const isInputValid = useMemo(() => {
      if (subjects.length === 0 || subjects.some((s: Subject) => !s.name.trim())) return false; // FIX: Added type
      if (fixedEvents.some((e: FixedEvent) => !e.name.trim() || e.days.length === 0)) return false; // FIX: Added type
       // Check time validity (format checked implicitly by timeToMinutes)
      if (fixedEvents.some((e: FixedEvent) => { // FIX: Added type
           const startMins = timeToMinutes(e.startTime);
           const endMins = timeToMinutes(e.endTime);
           // Prevent error if time format is invalid (already caught earlier, but good defense)
           if (startMins === 0 && e.startTime !== '00:00') return true; // Invalid start time counts as invalid input
           if (endMins === 0 && e.endTime !== '00:00') return true; // Invalid end time counts as invalid input
           return startMins >= endMins;
      })) return false;
      return true;
  }, [subjects, fixedEvents]); // FIX: Simplified dependency array, removed duplicate checks


  // --- Render ---
  return (
    <div className="container mx-auto py-6 max-w-full px-4 md:px-6"> {/* Wider container */}
        <TooltipProvider delayDuration={200}>
            {/* Header */}
            <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
                 <h1 className="text-3xl font-bold flex items-center gap-2">
                    <BookCopy className="h-8 w-8"/> Interactive Study Planner
                </h1>
                 {/* Buttons based on step */}
                 {workflowStep === 'schedule' && (
                    <div className="flex flex-wrap gap-2 items-center">
                        {/* View Mode Toggle */}
                        <div className="flex items-center border rounded-md p-0.5 bg-muted">
                            <Button
                                variant={scheduleViewMode === 'dragdrop' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setScheduleViewMode('dragdrop')}
                                className="px-2 py-1 h-auto rounded-sm"
                                aria-label="Switch to Drag and Drop View"
                            >
                                <Grip className="h-4 w-4 mr-1.5"/> Drag & Drop
                            </Button>
                            <Button
                                variant={scheduleViewMode === 'timetable' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setScheduleViewMode('timetable')}
                                className="px-2 py-1 h-auto rounded-sm"
                                aria-label="Switch to Timetable View"
                            >
                                <Columns className="h-4 w-4 mr-1.5"/> Timetable
                            </Button>
                        </div>
                         {/* Focus Mode Button */}
                        <Button variant="outline" onClick={toggleFocusMode} size="sm">
                            <Eye className="h-4 w-4 mr-1.5"/>
                            {showFocus ? "Exit Focus Mode" : "Focus Today"}
                        </Button>
                        {/* Back Button */}
                        <Button variant="outline" size="sm" onClick={() => setWorkflowStep('allocate')}>Back to Allocation</Button>
                    </div>
                 )}
                {workflowStep === 'allocate' && (
                     <Button variant="outline" onClick={() => { setWorkflowStep('input'); setWarnings([]); setError(null); setAvailabilityMap({}); setFixedBlocksMap({}); }}>Back to Inputs</Button>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-4 p-3 bg-destructive/10 text-destructive border border-destructive rounded-md" role="alert">
                    <p className="font-medium flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Error: {error}</p>
                </div>
            )}
            {/* Warnings Display */}
            {warnings.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-600 rounded-md space-y-1" role="status">
                     <p className="font-medium flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Planning Notes:</p>
                     <ul className="list-disc list-inside text-sm space-y-0.5">
                         {warnings.map((warn, index) => <li key={index}>{warn}</li>)}
                     </ul>
                </div>
            )}

            {/* Main Content Area */}
            {isLoading && <div className="text-center py-10 text-lg font-medium" role="status" aria-live="polite">Calculating... Please wait.</div>}

            {!isLoading && workflowStep === 'input' && (
                <InputAndGoalsForm
                    subjects={subjects} addSubject={addSubject} removeSubject={removeSubject} updateSubject={updateSubject} handleFileChange={handleFileChange}
                    fixedEvents={fixedEvents} addFixedEvent={addFixedEvent} removeFixedEvent={removeFixedEvent} updateFixedEvent={updateFixedEvent} handleDayToggle={handleDayToggle}
                    totalWeeklyStudyTime={totalWeeklyStudyTime} setTotalWeeklyStudyTime={setTotalWeeklyStudyTime}
                    handleSubmit={handleProceedToAllocation} isLoading={isLoading} isSubmitDisabled={!isInputValid || isLoading} submitButtonText="Calculate Availability & Suggest Plan"
                />
            )}

            {!isLoading && workflowStep === 'allocate' && (
                 <AllocationReviewComponent
                     subjects={subjects} updateSubjectAllocation={updateSubjectAllocation}
                     totalAvailableMinutes={totalAvailableMinutes} // Pass the correctly calculated available time
                     handleConfirmAllocation={handleConfirmAllocation} isLoading={isLoading}
                 />
            )}

            {/* --- Schedule Step Views --- */}
            {/* FIX: Cannot find name 'FocusMode' error might be linter issue, but component usage is correct */}
            {!isLoading && workflowStep === 'schedule' && showFocus && dailyAgenda && (
                 <FocusMode dailyAgenda={dailyAgenda} />
            )}
            {!isLoading && workflowStep === 'schedule' && showFocus && !dailyAgenda && (
                 <div className="max-w-2xl mx-auto text-center py-20">
                    <p className="text-muted-foreground">No schedule data found for today to focus on.</p>
                    <Button variant="outline" onClick={toggleFocusMode} className="mt-4">Exit Focus Mode</Button>
                </div>
            )}

            {/* Conditional Rendering for Schedule Views */}
            {/* FIX: Resolved 'InteractiveSchedulerComponent' cannot be used as JSX by adding explicit return type */}
             {!isLoading && workflowStep === 'schedule' && !showFocus && scheduleViewMode === 'dragdrop' && (
                 <InteractiveSchedulerComponent
                     weekStart={weekStart} weeklySchedule={weeklySchedule} taskPool={taskPool} subjects={subjects}
                     onScheduleTask={handleScheduleTask} onUnscheduleTask={handleUnscheduleTask}
                 />
            )}
            {/* FIX: Resolved potential 'WeeklyTimetableView' cannot be used as JSX by adding explicit return type. Also resolves 'Cannot find name' potentially. */}
            {!isLoading && workflowStep === 'schedule' && !showFocus && scheduleViewMode === 'timetable' && (
                 <WeeklyTimetableView
                     weekStart={weekStart} weeklySchedule={weeklySchedule} taskPool={taskPool} subjects={subjects}
                     onUnscheduleTask={handleUnscheduleTask} // Pass unschedule needed for timetable view interaction
                 />
            )}
         </TooltipProvider>
    </div>
  );
} // End of StudyPlanPage component


// ----- Utility Functions for Workflow Steps -----

const minutesToHours = (minutes: number): string => (minutes / 60).toFixed(1);

interface SubjectWithPriority extends Subject {
    score: number;
    daysUntilExam: number | typeof Infinity;
}

function suggestSubjectAllocations(
    currentSubjects: Subject[],
    totalAvailableMinutes: number,
    weeklyGoalMinutes: number
): Subject[] {
    // (This function's logic remains the same as before, calculating priority and suggesting minutes)
    if (currentSubjects.length === 0) return [];
    const subjectsWithPriority: SubjectWithPriority[] = currentSubjects.map(s => {
         let score = 1;
         const knowledgeLevels = ['None', 'Basic', 'Intermediate', 'Advanced'];
         const knowledgeIndex = knowledgeLevels.indexOf(s.priorKnowledge);
         if (knowledgeIndex !== -1) score += (knowledgeLevels.length - 1 - knowledgeIndex) * 2;
         let daysUntilExam: number | typeof Infinity = Infinity;
         if (s.examDate) {
             const todayForDiff = startOfWeek(new Date(), { weekStartsOn: 1 });
             const examDateObj = s.examDate instanceof Date ? s.examDate : new Date(s.examDate);
             if (!isNaN(examDateObj.getTime())) {
                 daysUntilExam = differenceInDays(examDateObj, todayForDiff);
                 if (daysUntilExam >= 0 && daysUntilExam <= 7) score += (7 - daysUntilExam) * 4;
                 else if (daysUntilExam > 7 && daysUntilExam <= 14) score += 5;
                 else { daysUntilExam = Infinity; } // Handle cases outside range or if NaN
             } else { daysUntilExam = Infinity; }
         }
         score = Math.max(1, score);
         return { ...s, score, daysUntilExam };
     }).sort((a, b) => b.score - a.score);

     const totalScore = subjectsWithPriority.reduce((sum, s) => sum + s.score, 0);
     const targetTotalMinutes = Math.min( Math.max(0, totalAvailableMinutes), weeklyGoalMinutes > 0 ? weeklyGoalMinutes : Math.max(0, totalAvailableMinutes) );

     if (totalScore === 0 || targetTotalMinutes === 0) {
         return currentSubjects.map(s => ({ ...s, suggestedMinutes: 0, allocatedMinutes: 0 }));
     }

     const subjectsWithSuggestions = subjectsWithPriority.map(s => {
        let suggested = Math.round((s.score / totalScore) * targetTotalMinutes);
        if (suggested > 0 && suggested < MIN_STUDY_BLOCK) suggested = MIN_STUDY_BLOCK;
        suggested = Math.max(0, suggested);
        return { ...s, suggestedMinutes: suggested, allocatedMinutes: suggested };
     });

     let currentTotalSuggested = subjectsWithSuggestions.reduce((sum, s) => sum + (s.suggestedMinutes ?? 0), 0);
     let attempts = 0;
     while(currentTotalSuggested > targetTotalMinutes && attempts < currentSubjects.length * 2) {
         for(let i = subjectsWithSuggestions.length - 1; i >= 0; i--) {
             const subject = subjectsWithSuggestions[i];
             if (subject.suggestedMinutes && subject.suggestedMinutes > MIN_STUDY_BLOCK) {
                 const reduction = Math.min(subject.suggestedMinutes - MIN_STUDY_BLOCK, currentTotalSuggested - targetTotalMinutes, 15);
                 if (reduction > 0) {
                    subject.suggestedMinutes -= reduction; subject.allocatedMinutes = subject.suggestedMinutes; currentTotalSuggested -= reduction;
                    if (currentTotalSuggested <= targetTotalMinutes) break;
                 }
             } else if (subject.suggestedMinutes && subject.suggestedMinutes > 0 && subject.suggestedMinutes <= MIN_STUDY_BLOCK) {
                 const reduction = Math.min(subject.suggestedMinutes, currentTotalSuggested - targetTotalMinutes);
                  if (reduction > 0 && attempts > currentSubjects.length) { // Only reduce below min block after a full pass
                     subject.suggestedMinutes -= reduction; subject.allocatedMinutes = subject.suggestedMinutes; currentTotalSuggested -= reduction;
                     if (currentTotalSuggested <= targetTotalMinutes) break;
                  }
             }
         }
         attempts++;
     }
     // Recalculate total after adjustments
     currentTotalSuggested = subjectsWithSuggestions.reduce((sum, s) => sum + (s.suggestedMinutes ?? 0), 0);
     if (currentTotalSuggested > targetTotalMinutes) {
         let overshoot = currentTotalSuggested - targetTotalMinutes;
          // Reduce from lowest priority upwards if still over budget
          for(let i = subjectsWithSuggestions.length - 1; i >= 0 && overshoot > 0; i--) {
              const subject = subjectsWithSuggestions[i];
              const reduction = Math.min(subject.suggestedMinutes ?? 0, overshoot);
              if(subject.suggestedMinutes){
                 subject.suggestedMinutes = Math.max(0, (subject.suggestedMinutes ?? 0) - reduction);
                 subject.allocatedMinutes = subject.suggestedMinutes ?? 0;
                 overshoot -= reduction;
              }
          }
     }

     // Map suggestions back to the original subject objects
     const finalSubjects: Subject[] = currentSubjects.map(origSub => {
         const suggestionData = subjectsWithSuggestions.find(sugSub => sugSub.id === origSub.id);
         // Ensure all original subjects are returned, even if no suggestion was generated (e.g., totalScore was 0)
         return {
             ...origSub, // Keep original details
             suggestedMinutes: suggestionData?.suggestedMinutes ?? 0,
             allocatedMinutes: suggestionData?.allocatedMinutes ?? 0, // Start allocation with suggestion
         };
     });
     return finalSubjects;
 }


 /**
  * Generates a task pool based on allocated subject time.
  * NOTE: This is a simplified version. It does NOT analyze file content.
  * It breaks down time into generic 'Study', 'Practice', and 'Review' blocks.
  * True AI-based task generation from files would require backend processing.
  */
 function generateTaskPool(subjects: Subject[]): Task[] {
     const pool: Task[] = [];
     const subjectColorMap = subjects.reduce((acc: Record<string, string>, subject, index) => ({
         ...acc,
         [subject.id]: SUBJECT_COLORS[index % SUBJECT_COLORS.length]
     }), {});

     subjects.forEach(subject => {
         let minutesToAllocate = subject.allocatedMinutes;
         if (minutesToAllocate <= 0) return;

         let topicCounter = 1;
         const taskTypes: Task['taskType'][] = ['study', 'practice', 'review'];
         let typeIndex = 0;

         while (minutesToAllocate > 0) {
             const currentTaskType = taskTypes[typeIndex % taskTypes.length];
             let blockDuration: number;
             let description: string;
             let title: string;

             // --- Determine Duration ---
             // Try to make 'study' blocks longer, 'practice'/'review' shorter, within limits
             let preferredDuration = MAX_STUDY_BLOCK;
             if (currentTaskType === 'practice' || currentTaskType === 'review') {
                 preferredDuration = Math.max(MIN_STUDY_BLOCK, Math.min(60, MAX_STUDY_BLOCK)); // Aim for 30-60 mins
             } else { // 'study'
                 preferredDuration = Math.max(MIN_STUDY_BLOCK, Math.min(90, MAX_STUDY_BLOCK)); // Aim for 30-90 mins
             }

             // Allocate time, ensuring minimum block size unless it's the remainder
             if (minutesToAllocate >= preferredDuration) {
                 blockDuration = preferredDuration;
             } else if (minutesToAllocate >= MIN_STUDY_BLOCK) {
                 blockDuration = Math.max(MIN_STUDY_BLOCK, minutesToAllocate); // Take what's left, but at least MIN_STUDY_BLOCK
             } else {
                 blockDuration = minutesToAllocate; // Take the small remainder
             }
              // Ensure we don't allocate more time than available
             blockDuration = Math.min(blockDuration, minutesToAllocate);

             // Ensure we don't take zero time
             if (blockDuration <= 0) break;


             // --- Generate Title & Description (Improved Placeholders) ---
             switch (currentTaskType) {
                 case 'study':
                     title = `Study: ${subject.name} - Topic ${topicCounter}`;
                     description = `Focus on learning new material or concepts for Topic ${topicCounter} in ${subject.name}. Duration: ${blockDuration} mins.`;
                     break;
                 case 'practice':
                     title = `Practice: ${subject.name} - Topic ${topicCounter}`;
                     description = `Work through problems or exercises related to Topic ${topicCounter} in ${subject.name}. Duration: ${blockDuration} mins.`;
                     break;
                 case 'review':
                     title = `Review: ${subject.name} - Topic ${topicCounter}`;
                     description = `Consolidate understanding and revise notes for Topic ${topicCounter} in ${subject.name}. Duration: ${blockDuration} mins.`;
                     // Increment topic counter only after a review cycle is complete
                     topicCounter++;
                     break;
                 default: // 'other' or unexpected
                     title = `Task: ${subject.name} - Block ${topicCounter}`;
                     description = `General task for ${subject.name}. Duration: ${blockDuration} mins.`;
                     // Increment counter for 'other' as well to avoid infinite loops if only 'other' is generated
                     topicCounter++;
                     break;
             }

             pool.push({
                 id: crypto.randomUUID(),
                 subjectId: subject.id,
                 subjectName: subject.name,
                 subjectColor: subjectColorMap[subject.id] || SUBJECT_COLORS[0],
                 title,
                 description,
                 duration: blockDuration,
                 taskType: currentTaskType, // Store the type
                 isScheduled: false,
             });

             minutesToAllocate -= blockDuration;
             typeIndex++; // Cycle through study, practice, review
         }
     });

     // Sort pool by subject name, then by title (which implies topic order)
     return pool.sort((a, b) => {
         const nameCompare = a.subjectName.localeCompare(b.subjectName);
         if (nameCompare !== 0) return nameCompare;
         // Basic sort by title which includes topic number and type
         return a.title.localeCompare(b.title);
     });
 }


// ----- Sub-components -----

// --- Input Form (No significant changes needed structurally) ---
 interface InputAndGoalsFormProps {
    subjects: Subject[]; addSubject: () => void; removeSubject: (id: string) => void;
    updateSubject: (id: string, field: keyof Subject, value: any) => void;
    handleFileChange: (id: string, event: ChangeEvent<HTMLInputElement>) => void;
    fixedEvents: FixedEvent[]; addFixedEvent: () => void; removeFixedEvent: (id: string) => void;
    updateFixedEvent: (id: string, field: keyof FixedEvent, value: any) => void;
    handleDayToggle: (eventId: string, dayIndex: number) => void;
    totalWeeklyStudyTime: string; setTotalWeeklyStudyTime: (value: string) => void;
    handleSubmit: () => void; isLoading: boolean; isSubmitDisabled: boolean; submitButtonText: string;
}

function InputAndGoalsForm({
    subjects, addSubject, removeSubject, updateSubject, handleFileChange,
    fixedEvents, addFixedEvent, removeFixedEvent, updateFixedEvent, handleDayToggle,
    totalWeeklyStudyTime, setTotalWeeklyStudyTime, handleSubmit, isLoading, isSubmitDisabled, submitButtonText
}: InputAndGoalsFormProps): React.ReactNode { // Add return type for consistency
  const renderSubjectCard = (subject: Subject) => (
     <Card key={subject.id} className="relative p-4 border shadow-sm bg-card">
          {subjects.length > 1 && ( <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeSubject(subject.id)} aria-label={`Remove subject ${subject.name || 'unnamed'}`}><Trash2 className="h-4 w-4" /></Button> )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"> <Label htmlFor={`subject-name-${subject.id}`}>Subject Name *</Label> <Input id={`subject-name-${subject.id}`} value={subject.name} onChange={(e) => updateSubject(subject.id, 'name', e.target.value)} placeholder="e.g., Calculus I" required aria-required="true"/> </div>
              <div className="space-y-1.5"> <Label htmlFor={`prior-knowledge-${subject.id}`}>Prior Knowledge *</Label> <Select value={subject.priorKnowledge} onValueChange={(value) => updateSubject(subject.id, 'priorKnowledge', value)} required aria-required="true"> <SelectTrigger id={`prior-knowledge-${subject.id}`}><SelectValue placeholder="Select knowledge level" /></SelectTrigger> <SelectContent> <SelectItem value="None">None</SelectItem> <SelectItem value="Basic">Basic</SelectItem> <SelectItem value="Intermediate">Intermediate</SelectItem> <SelectItem value="Advanced">Advanced</SelectItem> </SelectContent> </Select> </div>
              <div className="space-y-1.5"> <Label htmlFor={`exam-date-${subject.id}`}>Exam Date (Optional)</Label> <Popover> <PopoverTrigger asChild> <Button variant="outline" id={`exam-date-${subject.id}`} className={cn("w-full justify-start text-left font-normal", !subject.examDate && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4" /> {subject.examDate ? format(subject.examDate, "PPP") : <span>Pick a date</span>} </Button> </PopoverTrigger> <PopoverContent className="w-auto p-0"> <Calendar mode="single" selected={subject.examDate} onSelect={(date) => updateSubject(subject.id, 'examDate', date ?? undefined)} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} /> </PopoverContent> </Popover> </div>
              <div className="space-y-1.5"> <Label htmlFor={`summary-upload-${subject.id}`}>Upload Summary/Notes (Optional)</Label> <Input id={`summary-upload-${subject.id}`} type="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={(e) => handleFileChange(subject.id, e)} className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" /> {subject.fileName && ( <div className="text-xs flex items-center gap-1 mt-1 text-green-600 dark:text-green-400"> <CheckCircle className="h-3 w-3" /> {subject.fileName} </div> )} </div>
          </div>
     </Card>
  );
    const renderFixedEventCard = (event: FixedEvent) => (
        <Card key={event.id} className="relative p-4 border bg-secondary/30">
             <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeFixedEvent(event.id)} aria-label={`Remove commitment ${event.name || 'unnamed'}`}><Trash2 className="h-4 w-4" /></Button>
            <div className="space-y-3">
                 <div className="space-y-1.5"> <Label htmlFor={`event-name-${event.id}`}>Event Name *</Label> <Input id={`event-name-${event.id}`} value={event.name} onChange={(e) => updateFixedEvent(event.id, 'name', e.target.value)} placeholder="e.g., Work Shift" required aria-required="true"/> </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"> <Label htmlFor={`event-start-${event.id}`}>Start Time *</Label> <Input id={`event-start-${event.id}`} type="time" value={event.startTime} onChange={(e) => updateFixedEvent(event.id, 'startTime', e.target.value)} required aria-required="true"/> </div>
                     <div className="space-y-1.5"> <Label htmlFor={`event-end-${event.id}`}>End Time *</Label> <Input id={`event-end-${event.id}`} type="time" value={event.endTime} onChange={(e) => updateFixedEvent(event.id, 'endTime', e.target.value)} required aria-required="true"/> </div>
                 </div>
                 <div className="space-y-1.5"> <Label>Days *</Label> <div className="flex flex-wrap gap-2"> {DAY_NAMES.map((dayName, dayIndex) => ( <Button key={dayIndex} variant={event.days.includes(dayIndex) ? "default" : "outline"} size="sm" onClick={() => handleDayToggle(event.id, dayIndex)} className="text-xs px-2.5 py-1 h-auto" aria-pressed={event.days.includes(dayIndex)}> {dayName} </Button> ))} </div> </div>
            </div>
        </Card>
    );
  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="space-y-6">
            <Card>
                 <CardHeader> <CardTitle className="flex items-center gap-2"> Weekly Study Goal <Tooltip> <TooltipTrigger asChild><button type="button" aria-label="Info about weekly study goal"><Info className="h-4 w-4 text-muted-foreground cursor-help"/></button></TooltipTrigger> <TooltipContent><p className='max-w-xs'>This is your target for planning. The tool will calculate your actual available time based on fixed events.</p></TooltipContent> </Tooltip> </CardTitle> <CardDescription>Set your target study hours for the week.</CardDescription> </CardHeader>
                 <CardContent> <div className="max-w-xs space-y-2"> <Label htmlFor="weekly-hours">Target Weekly Study Hours</Label> <Input id="weekly-hours" type="number" min="0" step="0.5" value={totalWeeklyStudyTime} onChange={(e) => setTotalWeeklyStudyTime(e.target.value)} placeholder="e.g., 20" /> </div> </CardContent>
            </Card>
            <Card>
                <CardHeader> <CardTitle>Fixed Commitments</CardTitle> <CardDescription>Block out recurring events (work, classes, appointments). Sleep (approx. {SLEEP_START_TIME} - {SLEEP_END_TIME}) and buffers are added automatically.</CardDescription> </CardHeader>
                <CardContent className="space-y-4"> {fixedEvents.length === 0 && <p className="text-sm text-muted-foreground italic text-center py-4">No fixed commitments added yet (besides sleep).</p>} {fixedEvents.map(renderFixedEventCard)} <Button type="button" variant="outline" onClick={addFixedEvent} className="w-full mt-4"> <PlusCircle className="mr-2 h-4 w-4" /> Add Fixed Commitment </Button> </CardContent>
            </Card>
        </div>
         <div className="space-y-6">
            <Card>
                 <CardHeader> <CardTitle>Your Subjects</CardTitle> <CardDescription>Add subjects, knowledge level, and optional exam dates or notes.</CardDescription> </CardHeader>
                 <CardContent className="space-y-4"> {subjects.map(renderSubjectCard)} <Button type="button" variant="outline" onClick={addSubject} className="mt-4"> <PlusCircle className="mr-2 h-4 w-4" /> Add Another Subject </Button> </CardContent>
            </Card>
            <Button type="submit" className="w-full mt-6" size="lg" disabled={isSubmitDisabled} aria-disabled={isSubmitDisabled} > {isLoading ? "Calculating..." : submitButtonText} {!isLoading && !isSubmitDisabled && <ArrowRight className="ml-2 h-4 w-4" />} </Button>
        </div>
    </form>
  );
} // End of InputAndGoalsForm


// --- Allocation Review Component (Updated Text) ---
interface AllocationReviewProps {
    subjects: Subject[];
    updateSubjectAllocation: (id: string, minutes: number) => void;
    totalAvailableMinutes: number; // This IS the time after fixed events/sleep
    handleConfirmAllocation: () => void;
    isLoading: boolean;
}

function AllocationReviewComponent({ subjects, updateSubjectAllocation, totalAvailableMinutes, handleConfirmAllocation, isLoading }: AllocationReviewProps): React.ReactNode { // Add return type
    const totalSuggestedMinutes = useMemo(() => subjects.reduce((sum, s) => sum + (s.suggestedMinutes ?? 0), 0), [subjects]);
    const totalAllocatedMinutes = useMemo(() => subjects.reduce((sum, s) => sum + s.allocatedMinutes, 0), [subjects]);

    // Make slider max dynamic and reasonable
    const sliderMax = useMemo(() => {
        const maxNeeded = Math.max(totalAllocatedMinutes, totalSuggestedMinutes, totalAvailableMinutes);
        // Give some headroom, ensure it's at least enough for a couple of hours, round up to nearest 30 min
        return Math.ceil(Math.max(maxNeeded + 120, 120) / 30) * 30;
    }, [subjects, totalAvailableMinutes, totalAllocatedMinutes, totalSuggestedMinutes]);


    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Review & Adjust Time Allocation</CardTitle>
                <CardDescription>
                    We've suggested study time based on priorities and calculated availability. Adjust sliders to your preference.
                    {/* UPDATED TEXT: Uses the calculated available minutes */}
                    Estimated study time available this week (after fixed commitments & sleep): <span className='font-semibold'>{minutesToHours(totalAvailableMinutes)} hours</span>.
                </CardDescription>
                 {totalSuggestedMinutes > 0 && (
                    <p className="text-sm text-muted-foreground pt-1">
                        Initial suggestion totals ~<span className='font-semibold'>{minutesToHours(totalSuggestedMinutes)} hours</span>.
                    </p>
                 )}
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    {subjects.map(subject => (
                        <div key={subject.id} className="p-4 border rounded-md bg-card grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            <div className='md:col-span-1'>
                                <p className="font-medium">{subject.name}</p>
                                <p className="text-xs text-muted-foreground"> Suggested: {minutesToHours(subject.suggestedMinutes ?? 0)} hrs </p>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor={`slider-${subject.id}`} className='text-sm font-medium sr-only'>Allocate time for {subject.name} ({minutesToHours(subject.allocatedMinutes)} hrs)</Label>
                                 <div className="flex items-center gap-4">
                                     <Slider id={`slider-${subject.id}`} min={0} max={sliderMax} step={15} value={[subject.allocatedMinutes]} onValueChange={(value) => updateSubjectAllocation(subject.id, value[0])} className="flex-grow" aria-label={`Allocate time for ${subject.name}`} aria-valuemin={0} aria-valuemax={sliderMax} aria-valuenow={subject.allocatedMinutes} aria-valuetext={`${minutesToHours(subject.allocatedMinutes)} hours`} />
                                     <span className="text-sm font-medium w-20 text-right tabular-nums"> {minutesToHours(subject.allocatedMinutes)} hrs </span>
                                 </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t mt-6 text-center">
                    <p className="text-lg font-semibold">
                        Total Allocated: {minutesToHours(totalAllocatedMinutes)} hours
                    </p>
                    {/* UPDATED TEXT: Clearer remaining time */}
                    {totalAllocatedMinutes <= totalAvailableMinutes ? (
                         <p className="text-sm text-green-600 dark:text-green-400 mt-1" role="status">
                           You have ~{minutesToHours(totalAvailableMinutes - totalAllocatedMinutes)} hours of remaining available time.
                         </p>
                     ) : (
                         <p className="text-sm text-destructive mt-1" role="alert">
                           Warning: Allocated time exceeds estimated available time by ~{minutesToHours(totalAllocatedMinutes - totalAvailableMinutes)} hrs.
                         </p>
                     )}
                     {totalAllocatedMinutes === 0 && totalAvailableMinutes > 0 && (
                         <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1" role="status">Note: You haven't allocated any study time yet.</p>
                     )}
                </div>

                <Button onClick={handleConfirmAllocation} disabled={isLoading} size="lg" className="w-full">
                    {isLoading ? "Generating Tasks..." : "Confirm Allocation & Generate Task Pool"}
                     {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
            </CardContent>
        </Card>
    );
} // End of AllocationReviewComponent


// ----- Interactive Scheduler Component (Drag & Drop View) -----
interface InteractiveSchedulerProps {
    weekStart: Date; weeklySchedule: DaySchedule[]; taskPool: Task[]; subjects: Subject[];
    onScheduleTask: (taskId: string, dayDateISO: string, startTime: Date) => void;
    onUnscheduleTask: (taskId: string, sourceDayDateISO: string) => void;
}

// FIX: Added explicit React.ReactNode return type to resolve TS error
function InteractiveSchedulerComponent({ weekStart, weeklySchedule, taskPool, subjects, onScheduleTask, onUnscheduleTask }: InteractiveSchedulerProps): React.ReactNode {
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);

    // --- Drag Handlers START ---
     const handlePoolDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => { try { const data = JSON.stringify({ taskId: task.id, duration: task.duration, origin: 'pool' }); e.dataTransfer.setData("application/json", data); e.dataTransfer.effectAllowed = "move"; e.currentTarget.classList.add('opacity-50', 'ring-2', 'ring-primary'); setDraggedTask(task); } catch (error) { console.error("Error setting drag data from pool:", error); } };
     const handleScheduleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => { if (!task.scheduledDay) { console.warn("Cannot drag task without scheduledDay:", task); e.preventDefault(); return; } try { const data = JSON.stringify({ taskId: task.id, duration: task.duration, origin: 'schedule', sourceDay: task.scheduledDay }); e.dataTransfer.setData("application/json", data); e.dataTransfer.effectAllowed = "move"; e.currentTarget.classList.add('opacity-50', 'ring-2', 'ring-destructive'); setDraggedTask(task); } catch (error) { console.error("Error setting drag data from schedule:", error); } };
     const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => { e.currentTarget.classList.remove('opacity-50', 'ring-2', 'ring-primary', 'ring-destructive'); setDraggedTask(null); };
     const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (e.currentTarget.hasAttribute('data-droppable-slot')) { e.currentTarget.classList.add('bg-primary/10', 'outline-dashed', 'outline-1', 'outline-primary'); } else if (e.currentTarget.hasAttribute('data-droppable-pool')) { if (draggedTask?.isScheduled) { e.currentTarget.classList.add('bg-destructive/10'); } } };
     const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.currentTarget.classList.remove('bg-primary/10', 'outline-dashed', 'outline-1', 'outline-primary', 'bg-destructive/10'); };
     const handleDropOnSlot = (e: React.DragEvent<HTMLDivElement>, day: DaySchedule, slot: TimeSlot) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('bg-primary/10', 'outline-dashed', 'outline-1', 'outline-primary'); try { const dataString = e.dataTransfer.getData("application/json"); if (!dataString) { console.error("No data transferred on drop"); return; } const data = JSON.parse(dataString); const { taskId, duration, origin, sourceDay } = data; if (!taskId || typeof duration !== 'number') { console.error("Invalid data transferred:", data); return; } const slotDuration = differenceInMinutes(slot.end, slot.start); if (slotDuration < duration) { console.warn(`Task duration (${duration} min) exceeds available slot time (${slotDuration} min). Cannot schedule.`); setDraggedTask(null); return; } const dropStartTime = slot.start; if (origin === 'pool') { onScheduleTask(taskId, day.date, dropStartTime); } else if (origin === 'schedule' && sourceDay) { // Need to unschedule first, then schedule in the new slot onUnscheduleTask(taskId, sourceDay); // Schedule might need a slight delay if state updates aren't immediate // Using timeout 0 allows the state update from unschedule to process first setTimeout(() => { onScheduleTask(taskId, day.date, dropStartTime); }, 0); } else { console.warn("Drop origin or sourceDay missing/invalid:", data); } } catch (error) { console.error("Error handling drop on slot:", error); } finally { setDraggedTask(null); } };
     const handleDropOnPool = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('bg-destructive/10'); try { const dataString = e.dataTransfer.getData("application/json"); if (!dataString) return; const data = JSON.parse(dataString); const { taskId, origin, sourceDay } = data; if (origin === 'schedule' && taskId && sourceDay) { onUnscheduleTask(taskId, sourceDay); } } catch (error) { console.error("Error handling drop on pool:", error); } finally { setDraggedTask(null); } };
     // --- Drag Handlers END ---

    // Combined item type for sorting daily schedule items
    type ScheduleItem = (Task & { type: 'task', sortKey: string }) | (FixedEventBlock & { type: 'fixed', sortKey: string }) | (TimeSlot & { type: 'slot', sortKey: string, id: string });

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Task Pool Sidebar */}
            <Card
                className="lg:w-1/4 shrink-0 border-2 border-dashed border-muted hover:border-primary transition-colors lg:max-h-[80vh]" // Limit height on large screens
                onDrop={handleDropOnPool}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                data-droppable-pool="true"
            >
                <CardHeader>
                    <CardTitle>Task Pool ({taskPool.length})</CardTitle>
                    <CardDescription>Drag tasks onto available slots. Drag scheduled tasks back here to unschedule.</CardDescription>
                 </CardHeader>
                <CardContent className='p-0'>
                    <ScrollArea className="h-[60vh] lg:h-full p-3"> {/* Adjust padding */}
                        {taskPool.length === 0 && <p className='text-sm text-muted-foreground italic text-center py-10'>No tasks left to schedule!</p>}
                        <div className="space-y-2">
                            {taskPool.map(task => (
                                <div key={task.id} draggable onDragStart={(e) => handlePoolDragStart(e, task)} onDragEnd={handleDragEnd}
                                    className={cn("p-2 rounded border cursor-grab flex items-start gap-2 transition-opacity duration-150 ease-in-out group", task.subjectColor)}>
                                    <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0 flex-none group-hover:text-foreground" />
                                    <div className="flex-grow min-w-0">
                                        {/* Improved Task Display in Pool */}
                                        <div className="font-medium text-sm truncate leading-tight flex justify-between items-center" title={task.title}>
                                            <span>{task.title}</span>
                                             <Badge variant="secondary" className='ml-2 text-[10px] px-1 py-0 h-4 capitalize'>{task.taskType}</Badge>
                                        </div>
                                        {/* <div className="text-xs opacity-80 break-words mt-0.5">{task.description}</div> */}
                                        <div className="text-xs font-semibold mt-1 flex items-center justify-between text-muted-foreground group-hover:text-foreground">
                                            <span className='truncate' title={task.subjectName}>{task.subjectName}</span>
                                            <span className="flex items-center flex-none"><Clock className="h-3 w-3 mr-1" />{task.duration} min</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Weekly Schedule Grid (Card Columns) */}
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {weeklySchedule.map((day) => {
                    const dayDateObj = parseISO(day.date);
                    const isToday = formatISO(new Date(), { representation: 'date' }) === day.date;
                    const scheduledDuration = day.tasks.reduce((sum, t) => sum + t.duration, 0);

                    // Combine and sort items within the day
                    const combinedItems: ScheduleItem[] = [
                        ...(day.fixedEvents || []).map((fe): ScheduleItem => ({ ...fe, type: 'fixed', sortKey: fe.startTime })),
                        ...(day.availableSlots || []).map((slot, i): ScheduleItem => ({ ...slot, type: 'slot', sortKey: format(slot.start, 'HH:mm'), id: `slot-${day.date}-${i}` })),
                        ...(day.tasks || []).map((t): ScheduleItem => ({ ...t, type: 'task', sortKey: t.scheduledTime ?? '00:00' }))
                    ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

                    return (
                        <Card key={day.date} className={cn("flex flex-col", isToday && "border-primary border-2 shadow-md")}>
                            <CardHeader className="pb-2 pt-3 px-3 bg-muted/30 dark:bg-muted/10">
                                <CardTitle className="text-base flex justify-between items-center"><span>{format(dayDateObj, "EEE, MMM d")}</span> {isToday && <Badge variant="outline" className='border-primary text-primary'>Today</Badge>}</CardTitle>
                                <CardDescription className='text-xs'> {scheduledDuration > 0 ? `${minutesToHours(scheduledDuration)} hrs studied` : 'No study'} / {(day.fixedEvents || []).length} fixed</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow p-2 pt-1">
                                <ScrollArea className="h-[55vh] lg:h-[calc(80vh-100px)] pr-2 -mr-2"> {/* Adjust height */}
                                    <div className="space-y-1 relative">
                                         {combinedItems.map((item) => {
                                             if (item.type === 'fixed') {
                                                 return ( <div key={`fixed-${item.id}-${day.date}`} className="p-1.5 rounded border bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs flex items-center gap-1.5 opacity-90 my-0.5"> <Lock className="h-3 w-3 shrink-0 flex-none" /> <div className='flex-grow min-w-0'> <span className="font-medium truncate block text-[11px] leading-tight" title={item.name}>{item.name}</span> <span className="text-[10px] leading-tight">{item.startTime} - {item.endTime}</span> </div> </div> );
                                             } else if (item.type === 'slot') {
                                                 const slotDuration = differenceInMinutes(item.end, item.start);
                                                 const canFitDraggedTask = draggedTask ? slotDuration >= draggedTask.duration : true;
                                                 return ( <div key={item.id} className={cn("p-2 border border-dashed rounded my-1 min-h-[40px] bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-center", !canFitDraggedTask && "border-destructive/50 bg-destructive/5 cursor-not-allowed")} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={(e) => handleDropOnSlot(e, day, {start: item.start, end: item.end})} data-droppable-slot="true" title={canFitDraggedTask ? `Available: ${format(item.start, 'HH:mm')} - ${format(item.end, 'HH:mm')} (${slotDuration} min)` : `Slot too short (${slotDuration} min) for dragged task (${draggedTask?.duration} min)`} > <p className={cn("text-xs text-muted-foreground text-center italic pointer-events-none", !canFitDraggedTask && "text-destructive/80")}> Available Slot ({slotDuration} min) </p> </div> );
                                             } else if (item.type === 'task') {
                                                 return (
                                                     <div key={item.id} draggable onDragStart={(e) => handleScheduleDragStart(e, item)} onDragEnd={handleDragEnd} className={cn("p-1.5 rounded border cursor-grab my-0.5 relative flex items-start gap-1 transition-opacity duration-150 group", item.subjectColor)}>
                                                        <div className="flex-grow min-w-0">
                                                             <div className="font-medium text-xs leading-tight truncate" title={item.title}>{item.title}</div>
                                                             <div className="text-[10px] font-semibold mt-0.5 flex items-center justify-between opacity-80 group-hover:opacity-100">
                                                                 <span className='truncate' title={item.subjectName}>@{item.scheduledTime || '?'}</span>
                                                                 <span className="flex items-center flex-none"><Clock className="h-2.5 w-2.5 mr-0.5" />{item.duration}m</span>
                                                             </div>
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-5 w-5 text-muted-foreground hover:text-destructive p-0.5 flex-none opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => item.scheduledDay && onUnscheduleTask(item.id, item.scheduledDay)} aria-label={`Unschedule ${item.title}`}> <Trash2 className="h-3 w-3" /> </Button>
                                                    </div> );
                                             }
                                             return null;
                                         })}
                                         {combinedItems.length === 0 && ( <p className="text-xs text-muted-foreground italic text-center py-10">Nothing scheduled.</p> )}
                                         {/* Removed the "Day fully scheduled" message as it might be inaccurate with drag/drop */}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
} // End of InteractiveSchedulerComponent


// --- Weekly Timetable View Component (NEW) ---
interface WeeklyTimetableViewProps {
    weekStart: Date;
    weeklySchedule: DaySchedule[];
    taskPool: Task[]; // Keep for potential future interactions? Or remove if not needed
    subjects: Subject[]; // Needed for colors maybe
    onUnscheduleTask: (taskId: string, sourceDayDateISO: string) => void;
}

// FIX: Added explicit React.ReactNode return type to resolve potential TS error
function WeeklyTimetableView({ weekStart, weeklySchedule, taskPool, subjects, onUnscheduleTask }: WeeklyTimetableViewProps): React.ReactNode {

    const timeLabels = useMemo(() => {
        const labels = [];
        for (let hour = TIMETABLE_START_HOUR; hour < TIMETABLE_END_HOUR; hour++) {
            labels.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        return labels;
    }, []);

    // Helper to calculate top and height for timetable items
    const calculatePosition = (startTimeStr: string | undefined, endTimeStr: string | undefined, durationMinutes: number | undefined): { top: number, height: number } => {
        if (!startTimeStr) return { top: 0, height: 0 }; // Cannot position without start time

        const startMinutesTotal = timeToMinutes(startTimeStr);
        let endMinutesTotal: number;

        if (endTimeStr) {
            endMinutesTotal = timeToMinutes(endTimeStr);
        } else if (durationMinutes !== undefined) {
            endMinutesTotal = startMinutesTotal + durationMinutes;
        } else {
            // Fallback: should not happen for tasks/events with valid data
            console.warn("Cannot determine end time for timetable item starting at:", startTimeStr);
            endMinutesTotal = startMinutesTotal + 60; // Default to 1 hour if unknown
        }

        // Handle invalid times resulting in 0
        if (startMinutesTotal === 0 && startTimeStr !== '00:00') endMinutesTotal = 0; // Mark as invalid if start time failed parsing
        if (endMinutesTotal <= startMinutesTotal) endMinutesTotal = startMinutesTotal + 15; // Ensure minimum height if end time is invalid or same as start

        const timetableStartMinutes = TIMETABLE_START_HOUR * 60;
        const top = ((startMinutesTotal - timetableStartMinutes) / 60) * TIMETABLE_HOUR_HEIGHT;
        const height = ((endMinutesTotal - startMinutesTotal) / 60) * TIMETABLE_HOUR_HEIGHT;

        // Clamp values to be within the visible timetable bounds
        const timetableEndMinutes = TIMETABLE_END_HOUR * 60;
        const maxTop = ((timetableEndMinutes - timetableStartMinutes) / 60) * TIMETABLE_HOUR_HEIGHT;

        const clampedTop = Math.max(0, top);
        // Calculate height considering the clamped top position to prevent overflow
        const clampedHeight = Math.max(5, Math.min(height, maxTop - clampedTop)); // Ensure min height, prevent overflow below maxTop

        // If the original top was already beyond the end, height should be 0
        if (top >= maxTop) return { top: maxTop, height: 0 };

        return { top: clampedTop, height: clampedHeight };
    };

    return (
        <div className="bg-background rounded-lg border shadow-sm overflow-hidden">
            <div className="flex border-b">
                {/* Time Column Header */}
                <div className="w-16 flex-shrink-0 px-2 py-2 text-xs font-semibold text-muted-foreground sticky left-0 bg-background z-20 border-r">Time</div>
                {/* Day Headers */}
                {weeklySchedule.map((day, index) => {
                     const dayDateObj = parseISO(day.date);
                     const isToday = formatISO(new Date(), { representation: 'date' }) === day.date;
                    return (
                        <div key={day.date} className={cn("flex-1 min-w-[120px] px-2 py-2 text-center text-sm font-medium border-r last:border-r-0 sticky top-0 bg-background z-10", isToday && "bg-primary/5 text-primary")}>
                           <div>{format(dayDateObj, "EEE")}</div>
                           <div className='text-xs text-muted-foreground'>{format(dayDateObj, "MMM d")}</div>
                        </div>
                    );
                 })}
            </div>
             <div className="flex relative h-[75vh] overflow-y-auto"> {/* Scrollable timetable area */}
                {/* Time Column Labels */}
                <div className="w-16 flex-shrink-0 sticky left-0 bg-background z-10 border-r">
                    {timeLabels.map((label, index) => (
                        <div key={label} className="h-[60px] relative border-b last:border-b-0">
                            <span className="absolute -top-2 left-1 text-[10px] text-muted-foreground bg-background px-1">{label}</span>
                        </div>
                    ))}
                     {/* Add a final line for the end hour */}
                     <div className="h-0 relative">
                         <span className="absolute -top-2 left-1 text-[10px] text-muted-foreground bg-background px-1">{`${TIMETABLE_END_HOUR.toString().padStart(2, '0')}:00`}</span>
                     </div>
                </div>
                 {/* Day Columns Content */}
                 {weeklySchedule.map((day) => {
                     // Combine fixed events and tasks for rendering
                     const itemsToRender = [
                         ...day.fixedEvents.map(fe => ({ ...fe, itemType: 'fixed' as const })),
                         ...day.tasks.map(t => ({ ...t, itemType: 'task' as const }))
                     ];

                     return (
                        <div key={`col-${day.date}`} className="flex-1 min-w-[120px] border-r last:border-r-0 relative">
                             {/* Background Hour Lines */}
                             {timeLabels.map((label, index) => (
                                 <div key={`line-${day.date}-${label}`} className="h-[60px] border-b border-dashed border-border/40"></div>
                             ))}
                             {/* Render Items */}
                            {itemsToRender.map((item, index) => {
                                const { top, height } = calculatePosition(
                                    item.itemType === 'fixed' ? item.startTime : item.scheduledTime, // Use scheduledTime for tasks
                                    item.itemType === 'fixed' ? item.endTime : undefined, // Use endTime for fixed
                                    item.itemType === 'task' ? item.duration : undefined // Use duration for tasks
                                );

                                // Skip rendering if height is non-positive (outside view or invalid duration)
                                if (height <= 0) {
                                    return null;
                                }

                                if (item.itemType === 'fixed') {
                                    return (
                                        <Tooltip key={`tt-fixed-${item.id}-${index}`}>
                                            <TooltipTrigger asChild>
                                                 <div
                                                     className="absolute left-0.5 right-0.5 p-1 rounded border bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] leading-tight overflow-hidden shadow-sm"
                                                     style={{ top: `${top}px`, height: `${height}px` }}
                                                 >
                                                     <p className="font-semibold truncate flex items-center gap-1"><Lock className="h-2.5 w-2.5 shrink-0" /> {item.name}</p>
                                                     <p>{item.startTime} - {item.endTime}</p>
                                                 </div>
                                            </TooltipTrigger>
                                            <TooltipContent side='right' align='start'>
                                                <p className='font-medium'>{item.name} (Fixed)</p>
                                                <p className='text-xs'>{item.startTime} - {item.endTime}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                } else { // itemType === 'task'
                                     const task = item; // Rename for clarity
                                     return (
                                         <Tooltip key={`tt-task-${task.id}-${index}`}>
                                             <TooltipTrigger asChild>
                                                 <div
                                                     className={cn(
                                                         "absolute left-0.5 right-0.5 p-1 rounded border text-[10px] leading-tight overflow-hidden shadow-sm group cursor-pointer hover:brightness-110",
                                                         task.subjectColor // Apply subject color
                                                     )}
                                                     style={{ top: `${top}px`, height: `${height}px` }}
                                                 >
                                                      <p className="font-semibold truncate" title={task.title}>{task.title}</p>
                                                      <p className="text-[9px] opacity-80 truncate">{task.scheduledTime} ({task.duration}m)</p>
                                                      {/* Optional: Add unschedule button on hover */}
                                                      <Button variant="ghost" size="icon"
                                                          className="absolute top-0 right-0 h-4 w-4 text-inherit hover:bg-destructive/50 p-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100 z-20"
                                                          onClick={(e) => { e.stopPropagation(); task.scheduledDay && onUnscheduleTask(task.id, task.scheduledDay); }}
                                                          aria-label={`Unschedule ${task.title}`}
                                                      >
                                                          <Trash2 className="h-2.5 w-2.5" />
                                                      </Button>
                                                 </div>
                                             </TooltipTrigger>
                                             <TooltipContent side='right' align='start'>
                                                 <p className='font-medium'>{task.title}</p>
                                                 <p className='text-xs'>{task.subjectName}</p>
                                                 <p className='text-xs'>{task.scheduledTime} ({task.duration} min)</p>
                                                 <p className='text-xs mt-1 opacity-70'>{task.description}</p>
                                             </TooltipContent>
                                         </Tooltip>
                                     );
                                }
                            })}
                        </div>
                    );
                 })}
             </div>
        </div>
    );
} // End of WeeklyTimetableView


// --- Focus Mode Component (No major changes needed, uses improved task data) ---
interface FocusModeProps {
  dailyAgenda: DaySchedule | null;
}

// FIX: Added explicit React.ReactNode return type for consistency and potential TS help
function FocusMode({ dailyAgenda }: FocusModeProps): React.ReactNode {
    const [completedTasks, setCompletedTasks] = useState<string[]>([]);
    const [timer, setTimer] = useState<number | null>(null);
    const [currentTask, setCurrentTask] = useState<Task | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimer = (task: Task) => { if (intervalRef.current) clearInterval(intervalRef.current); setCurrentTask(task); setTimer(task.duration * 60); intervalRef.current = setInterval(() => { setTimer(prev => { if (prev === null || prev <= 1) { if (intervalRef.current) clearInterval(intervalRef.current); handleComplete(task.id); stopTimer(); return null; } return prev - 1; }); }, 1000); };
    const stopTimer = () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } setTimer(null); setCurrentTask(null); };
    const formatTime = (seconds: number): string => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; };
    const handleComplete = (taskId: string) => { if (!completedTasks.includes(taskId)) { if (currentTask?.id === taskId && timer !== null) { stopTimer(); } setCompletedTasks(prev => [...prev, taskId]); } };
    useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);
    useEffect(() => { setCompletedTasks([]); stopTimer(); }, [dailyAgenda]); // Reset on agenda change

    if (!dailyAgenda || (!dailyAgenda.tasks?.length && !dailyAgenda.fixedEvents?.length)) { return ( <div className="max-w-2xl mx-auto text-center py-20"><p className="text-muted-foreground">Nothing scheduled for today.</p></div> ); }
    const tasks = dailyAgenda.tasks ?? []; const fixedEvents = dailyAgenda.fixedEvents ?? []; const date = parseISO(dailyAgenda.date);
    const sortedItems = [ ...fixedEvents.map(fe => ({ ...fe, type: 'fixed' as const, sortKey: fe.startTime })), ...tasks.map(t => ({ ...t, type: 'task' as const, sortKey: t.scheduledTime ?? '00:00' })) ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    return (
        <div className="max-w-2xl mx-auto">
            <Card className="border-4 border-primary shadow-lg">
                <CardHeader className="text-center bg-primary/10"> <CardTitle className="text-2xl">Focus Mode</CardTitle> <CardDescription className="text-base">Today's Plan: {format(date, "EEEE, MMMM d")}</CardDescription> </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    {sortedItems.length === 0 ? ( <p className="text-center text-muted-foreground py-10">Nothing scheduled for today!</p> ) : (
                        <ScrollArea className="h-[calc(100vh-300px)] max-h-[500px] p-1 pr-3 -mr-2">
                             <div className="space-y-4">
                                 {sortedItems.map((item, index) => {
                                    if (item.type === 'fixed') { return ( <div key={`focus-fixed-${item.id}-${index}`} className="p-4 rounded-lg border bg-muted/60 text-muted-foreground flex items-center gap-3"> <Lock className="h-5 w-5 shrink-0 flex-none" /> <div className='min-w-0'> <p className="font-medium truncate" title={item.name}>{item.name}</p> <p className="text-sm">{item.startTime} - {item.endTime}</p> </div> </div> ); }
                                    else if (item.type === 'task') { const task = item; const isCompleted = completedTasks.includes(task.id); const isCurrentTask = currentTask?.id === task.id;
                                        return (
                                             <div key={task.id} className={cn("p-4 rounded-lg border relative transition-all duration-200", task.subjectColor, isCompleted && "opacity-60 brightness-90", isCurrentTask && "ring-2 ring-offset-2 ring-primary shadow-lg")}>
                                                <div className="flex justify-between items-start mb-2 flex-wrap gap-2"> <h3 className={cn("font-bold text-lg", isCompleted && "line-through")}>{task.title}</h3> <div className="flex items-center gap-2 flex-shrink-0"> {task.scheduledTime && <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{task.scheduledTime}</Badge>} <Badge variant="outline" className="text-xs px-1.5 py-0.5 truncate max-w-[100px]" title={task.subjectName}>{task.subjectName}</Badge> </div> </div>
                                                <p className={cn("text-sm opacity-90 mb-3", isCompleted && "line-through")}>{task.description}</p>
                                                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t pt-3 mt-3">
                                                    <div className="flex items-center text-sm font-medium"> <Clock className="h-4 w-4 mr-1.5 flex-none" /> {task.duration} min session {isCurrentTask && timer !== null && ( <Badge variant="outline" className="ml-2 font-mono py-0.5 px-1.5 text-base tabular-nums">{formatTime(timer)}</Badge> )} {isCurrentTask && timer !== null ? <span className="ml-1.5 text-xs text-muted-foreground">remaining</span> : ''} </div>
                                                    <div className="flex gap-2"> {isCurrentTask && timer !== null ? ( <Button size="sm" variant="destructive" onClick={stopTimer}>Stop Timer</Button> ) : ( <Button size="sm" variant="secondary" onClick={() => startTimer(task)} disabled={isCompleted || (timer !== null && !isCurrentTask)}>Start Timer</Button> )} <Button size="sm" variant={isCompleted ? "ghost" : "default"} onClick={() => handleComplete(task.id)} disabled={isCompleted} className={isCompleted ? "cursor-not-allowed text-green-600 dark:text-green-400" : ""}> {isCompleted ? <><CheckCircle className='w-4 h-4 mr-1'/> Completed</> : "Mark Complete"} </Button> </div>
                                                </div>
                                            </div> );
                                    } return null;
                                })}
                             </div>
                         </ScrollArea>
                    )}
                    <div className="p-4 bg-secondary/50 rounded-lg text-center mt-6"> <p className="font-medium">You got this! Stay focused.</p> <p className="text-sm mt-1 text-muted-foreground">Remember to take short breaks between sessions.</p> </div>
                </CardContent>
            </Card>
        </div>
    );
}}