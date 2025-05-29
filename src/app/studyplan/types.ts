import { Interval } from "date-fns"; // Keep necessary external types

// ----- Data Structures -----

export interface Task {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  title: string;
  description: string;
  duration: number; // in minutes
  taskType: 'study' | 'practice' | 'review' | 'other';
  isScheduled: boolean;
  scheduledDay?: string; // ISO Date string if scheduled
  scheduledTime?: string; // "HH:MM" if scheduled
}

export interface DaySchedule {
  date: string; // ISO String
  tasks: Task[];
  fixedEvents: FixedEventBlock[];
  availableSlots: TimeSlot[];
}

export interface Subject {
  id: string;
  name: string;
  examDate?: Date;
  priorKnowledge: string;
  file?: File;
  fileName?: string;
  fileType?: string;
  suggestedMinutes?: number;
  allocatedMinutes: number;
}

export interface FixedEvent {
  id: string;
  name: string;
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export interface FixedEventBlock {
    id: string;
    name: string;
    startTime: string; // "HH:MM"
    endTime: string; // "HH:MM"
}

export interface TimeSlot {
    start: Date;
    end: Date;
}

export interface SubjectWithPriority extends Subject {
    score: number;
    daysUntilExam: number | typeof Infinity;
}

// Type for the overall planning state
export type WorkflowStep = 'input' | 'allocate' | 'schedule';
export type ScheduleViewMode = 'dragdrop' | 'timetable';

// Type for combined schedule items used in rendering
export type ScheduleItem = (Task & { type: 'task', sortKey: string }) | (FixedEventBlock & { type: 'fixed', sortKey: string }) | (TimeSlot & { type: 'slot', sortKey: string, id: string });

// Type for availability calculation result
export interface AvailabilityCalculation {
    availabilityMap: { [dayIndex: number]: TimeSlot[] };
    fixedBlocksMap: { [dayIndex: number]: FixedEventBlock[] };
}