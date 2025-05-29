import {
    format, addDays, differenceInDays, startOfWeek, endOfWeek, getDay, parse, set,
    isWithinInterval, addMinutes, subMinutes, formatISO, parseISO,
    differenceInMinutes, startOfDay, endOfDay, Interval
} from "date-fns";
import {
    Task, DaySchedule, Subject, FixedEvent, FixedEventBlock, TimeSlot,
    AvailabilityCalculation, SubjectWithPriority
} from './types'; // Import types from the new file
import { // Import needed constants
    MIN_STUDY_BLOCK, SLEEP_START_TIME, SLEEP_END_TIME, EVENT_BUFFER,
    SUBJECT_COLORS, MAX_STUDY_BLOCK
} from './constants';

// Utility function for merging class names (keep local or move to a global lib/utils if used elsewhere)
export const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// ----- Helper Functions -----

export const minutesToHours = (minutes: number): string => (minutes / 60).toFixed(1);

export const timeToMinutes = (time: string): number => {
    const parts = time.split(':');
    if (parts.length !== 2) return 0;
    const [hours, minutes] = parts.map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// ----- Core Logic Functions -----

export const calculateAvailability = (fixedEvents: FixedEvent[], weekStart: Date): AvailabilityCalculation => {
    const availabilityMap: { [dayIndex: number]: TimeSlot[] } = {};
    const fixedBlocksMap: { [dayIndex: number]: FixedEventBlock[] } = {};

    for (let i = 0; i < 7; i++) {
        const dayDate = addDays(weekStart, i);
        const dayStart = startOfDay(dayDate); // Returns Date
        const dayEnd = endOfDay(dayDate);     // Returns Date

        const sleepStartHour = parseInt(SLEEP_START_TIME.split(':')[0]);
        const sleepStartMin = parseInt(SLEEP_START_TIME.split(':')[1]);
        const sleepEndHour = parseInt(SLEEP_END_TIME.split(':')[0]);
        const sleepEndMin = parseInt(SLEEP_END_TIME.split(':')[1]);

        let sleepStartDateTime = set(dayDate, { hours: sleepStartHour, minutes: sleepStartMin, seconds: 0, milliseconds: 0 }); // Returns Date
        let sleepEndDateTime = set(dayDate, { hours: sleepEndHour, minutes: sleepEndMin, seconds: 0, milliseconds: 0 });     // Returns Date

        const sleepBlocks: Interval[] = [];
        if (timeToMinutes(SLEEP_START_TIME) > timeToMinutes(SLEEP_END_TIME)) {
             sleepBlocks.push({ start: sleepStartDateTime, end: dayEnd });
             sleepBlocks.push({ start: dayStart, end: sleepEndDateTime });
        } else {
             sleepBlocks.push({ start: sleepStartDateTime, end: sleepEndDateTime });
        }

        let currentDaySlots: TimeSlot[] = [{ start: dayStart, end: dayEnd }]; // Correctly uses Date objects

        sleepBlocks.forEach(sleepBlock => {
            const updatedSlots: TimeSlot[] = [];
            currentDaySlots.forEach(slot => {
                 const slotInterval: Interval = { start: slot.start, end: slot.end };
                 const overlaps = isWithinInterval(sleepBlock.start, slotInterval) ||
                                isWithinInterval(subMinutes(sleepBlock.end, 1), slotInterval) ||
                                isWithinInterval(slot.start, sleepBlock);

                 if (overlaps) {
                     // These push Date objects
                     if (slot.start < sleepBlock.start) updatedSlots.push({ start: slot.start, end: sleepBlock.start });
                      if (slot.end > sleepBlock.end) updatedSlots.push({ start: sleepBlock.end, end: slot.end });
                 } else {
                     updatedSlots.push(slot); // Pushes original slot (with Date objects)
                 }
            });
             currentDaySlots = updatedSlots;
        });
         availabilityMap[i] = currentDaySlots.filter(slot => differenceInMinutes(slot.end, slot.start) >= MIN_STUDY_BLOCK);
         fixedBlocksMap[i] = [];
    }

    fixedEvents.forEach(event => {
        try {
            const eventStartBase = parse(event.startTime, 'HH:mm', new Date());
            const eventEndBase = parse(event.endTime, 'HH:mm', new Date());

            if (isNaN(eventStartBase.getTime()) || isNaN(eventEndBase.getTime())) {
                console.warn(`Skipping fixed event "${event.name}" due to invalid time format.`);
                return;
            }

            event.days.forEach(dayIndex => {
                if (availabilityMap[dayIndex] === undefined) return;

                const dayDate = addDays(weekStart, dayIndex);
                const eventStartDateTime = set(dayDate, { hours: eventStartBase.getHours(), minutes: eventStartBase.getMinutes(), seconds: 0, milliseconds: 0 }); // Returns Date
                const eventEndDateTime = set(dayDate, { hours: eventEndBase.getHours(), minutes: eventEndBase.getMinutes(), seconds: 0, milliseconds: 0 });     // Returns Date

                // These use date-fns functions returning Date objects
                const blockStart = subMinutes(eventStartDateTime, EVENT_BUFFER);
                const blockEnd = addMinutes(eventEndDateTime, EVENT_BUFFER);
                const blockInterval: Interval = { start: blockStart, end: blockEnd }; // Uses Date objects

                 fixedBlocksMap[dayIndex].push({
                     id: event.id,
                     name: event.name,
                     startTime: format(eventStartDateTime, 'HH:mm'),
                     endTime: format(eventEndDateTime, 'HH:mm')
                 });

                let currentSlots = availabilityMap[dayIndex];
                const updatedSlots: TimeSlot[] = [];
                currentSlots.forEach(slot => {
                    const slotInterval: Interval = { start: slot.start, end: slot.end };
                    const overlaps = isWithinInterval(blockInterval.start, slotInterval) ||
                                   isWithinInterval(subMinutes(blockInterval.end, 1), slotInterval) ||
                                   isWithinInterval(slotInterval.start, blockInterval);

                    if (overlaps) {
                        // These push Date objects derived from the block interval
                        if (slot.start < blockInterval.start) updatedSlots.push({ start: slot.start, end: blockInterval.start });
                         if (slot.end > blockInterval.end) updatedSlots.push({ start: blockInterval.end, end: slot.end });
                    } else {
                        updatedSlots.push(slot); // Pushes original slot (with Date objects)
                    }
                });
                 availabilityMap[dayIndex] = updatedSlots.filter(slot => differenceInMinutes(slot.end, slot.start) >= MIN_STUDY_BLOCK);
            });
        } catch (parseError) {
             console.error(`Error parsing time for fixed event "${event.name}":`, parseError);
        }
    });

     Object.values(fixedBlocksMap).forEach(dayBlocks => dayBlocks.sort((a,b) => a.startTime.localeCompare(b.startTime)));

    return { availabilityMap, fixedBlocksMap };
};

export function suggestSubjectAllocations(
    currentSubjects: Subject[],
    totalAvailableMinutes: number,
    weeklyGoalMinutes: number
): Subject[] {
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
                  if (daysUntilExam < 0) {
                      score -= 2;
                      daysUntilExam = Infinity;
                  } else if (daysUntilExam <= 7) { score += (7 - daysUntilExam) * 4; }
                  else if (daysUntilExam <= 14) { score += 5; }
                  else { daysUntilExam = Infinity; }
             } else {
                 daysUntilExam = Infinity;
             }
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
         if (suggested > 0) {
             suggested = Math.max(MIN_STUDY_BLOCK, Math.round(suggested / 15) * 15);
         }
        suggested = Math.max(0, suggested);
        return { ...s, suggestedMinutes: suggested, allocatedMinutes: suggested };
     });

     let currentTotalSuggested = subjectsWithSuggestions.reduce((sum, s) => sum + (s.suggestedMinutes ?? 0), 0);
     let attempts = 0;
     while(currentTotalSuggested > targetTotalMinutes && attempts < subjectsWithSuggestions.length * 2) {
         for(let i = subjectsWithSuggestions.length - 1; i >= 0; i--) {
             const subject = subjectsWithSuggestions[i];
             const overshoot = currentTotalSuggested - targetTotalMinutes;
             if (subject.suggestedMinutes && subject.suggestedMinutes > 0) {
                 let reduction = 15;
                 if (subject.suggestedMinutes - reduction < MIN_STUDY_BLOCK) {
                    reduction = subject.suggestedMinutes - MIN_STUDY_BLOCK;
                 }
                 if (reduction <= 0 && subject.suggestedMinutes > 0) {
                     reduction = subject.suggestedMinutes;
                 }
                 reduction = Math.max(0, Math.min(reduction, subject.suggestedMinutes, overshoot));

                 if (reduction > 0) {
                    subject.suggestedMinutes -= reduction;
                    subject.allocatedMinutes = subject.suggestedMinutes;
                    currentTotalSuggested -= reduction;
                    if (currentTotalSuggested <= targetTotalMinutes) break;
                 }
             }
         }
         attempts++;
         if (currentTotalSuggested <= targetTotalMinutes) break;
     }

    currentTotalSuggested = subjectsWithSuggestions.reduce((sum, s) => sum + (s.suggestedMinutes ?? 0), 0);
    if (currentTotalSuggested > targetTotalMinutes) {
        let finalOvershoot = currentTotalSuggested - targetTotalMinutes;
        for (let i = subjectsWithSuggestions.length - 1; i >= 0 && finalOvershoot > 0; i--) {
            const subject = subjectsWithSuggestions[i];
            if (subject.suggestedMinutes && subject.suggestedMinutes > 0) {
                const reduction = Math.min(subject.suggestedMinutes, finalOvershoot);
                subject.suggestedMinutes -= reduction;
                subject.allocatedMinutes = subject.suggestedMinutes;
                finalOvershoot -= reduction;
            }
        }
    }

     const finalSubjects: Subject[] = currentSubjects.map(origSub => {
         const suggestionData = subjectsWithSuggestions.find(sugSub => sugSub.id === origSub.id);
         return {
             ...origSub,
             suggestedMinutes: suggestionData?.suggestedMinutes ?? 0,
             allocatedMinutes: suggestionData?.allocatedMinutes ?? 0,
         };
     });
     return finalSubjects;
 }

 export function generateTaskPool(subjects: Subject[]): Task[] {
     const pool: Task[] = [];
     const subjectColorMap = subjects.reduce((acc: Record<string, string>, subject, index) => {
        acc[subject.id] = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
        return acc;
    }, {});

     subjects.forEach(subject => {
         let minutesToAllocate = subject.allocatedMinutes;
         if (minutesToAllocate <= 0) return;

         let topicCounter = 1;
         const taskTypes: Task['taskType'][] = ['study', 'practice', 'review'];
         let typeIndex = 0;

         while (minutesToAllocate > 0) {
             const currentTaskType = taskTypes[typeIndex % taskTypes.length];
             let blockDuration: number;

             let preferredDuration = 60;
             switch(currentTaskType) {
                 case 'study':    preferredDuration = 90; break;
                 case 'practice': preferredDuration = 60; break;
                 case 'review':   preferredDuration = 45; break;
             }
             preferredDuration = Math.max(MIN_STUDY_BLOCK, Math.min(preferredDuration, MAX_STUDY_BLOCK));

             if (minutesToAllocate >= preferredDuration + MIN_STUDY_BLOCK / 2) {
                 blockDuration = preferredDuration;
             } else if (minutesToAllocate >= MIN_STUDY_BLOCK) {
                 blockDuration = Math.max(MIN_STUDY_BLOCK, Math.round(minutesToAllocate / 15) * 15);
             } else {
                 blockDuration = minutesToAllocate;
             }
             blockDuration = Math.min(blockDuration, minutesToAllocate);
             if (blockDuration <= 0) break;

             if (blockDuration >= MIN_STUDY_BLOCK) {
                blockDuration = Math.round(blockDuration / 15) * 15;
                 blockDuration = Math.min(blockDuration, minutesToAllocate);
                 if (blockDuration <= 0) break;
             }

             let title: string;
             let description: string;
             const topicStr = `Topic ${topicCounter}`;

             switch (currentTaskType) {
                 case 'study':
                     title = `Study: ${subject.name} - ${topicStr}`;
                     description = `Focus on learning new material/concepts for ${topicStr} in ${subject.name}. Session: ${blockDuration} min.`;
                     break;
                 case 'practice':
                     title = `Practice: ${subject.name} - ${topicStr}`;
                     description = `Work through problems/exercises for ${topicStr} in ${subject.name}. Session: ${blockDuration} min.`;
                     break;
                 case 'review':
                     title = `Review: ${subject.name} - ${topicStr}`;
                     description = `Revise notes and consolidate understanding for ${topicStr} in ${subject.name}. Session: ${blockDuration} min.`;
                     topicCounter++;
                     break;
                 default:
                     title = `Task: ${subject.name} - Block ${topicCounter}`;
                     description = `General task for ${subject.name}. Session: ${blockDuration} min.`;
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
                 taskType: currentTaskType,
                 isScheduled: false,
             });

             minutesToAllocate -= blockDuration;
             typeIndex++;
         }
     });

     return pool.sort((a, b) => {
         const nameCompare = a.subjectName.localeCompare(b.subjectName);
         if (nameCompare !== 0) return nameCompare;
         return a.title.localeCompare(b.title);
     });
 }