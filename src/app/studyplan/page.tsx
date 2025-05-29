'use client';

import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip"; // Only provider needed here
import { format, addDays, startOfWeek, formatISO, parseISO, differenceInMinutes } from "date-fns";
import { AlertCircle, BookCopy, Columns, Eye, Grip } from "lucide-react";

// Import Types
import { Subject, FixedEvent, Task, DaySchedule, WorkflowStep, ScheduleViewMode, TimeSlot, FixedEventBlock } from './types';

// Import Constants
// import { SUBJECT_COLORS } from './constants'; // No longer needed directly in page.tsx

// Import Utils & Logic Functions
import { calculateAvailability, suggestSubjectAllocations, generateTaskPool, timeToMinutes } from './utils';

// Import Sub-components
import InputAndGoalsForm from './components/InputAndGoalsForm';
import AllocationReviewComponent from './components/AllocationReviewComponent';
import InteractiveSchedulerComponent from './components/InteractiveSchedulerComponent';
import WeeklyTimetableView from './components/WeeklyTimetableView';
import FocusMode from './components/FocusMode';

// ----- Main Component -----
export default function StudyPlanPage() {
  // --- Core State ---
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('input');
  const [scheduleViewMode, setScheduleViewMode] = useState<ScheduleViewMode>('dragdrop');
  const [subjects, setSubjects] = useState<Subject[]>([
     { id: crypto.randomUUID(), name: '', priorKnowledge: 'Basic', allocatedMinutes: 0 }
  ]);
  const [fixedEvents, setFixedEvents] = useState<FixedEvent[]>([]);
  const [totalWeeklyStudyTime, setTotalWeeklyStudyTime] = useState<string>('20');

  // --- Derived/Calculated State ---
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
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
    return Object.values(availabilityMap).flat().reduce((sum, slot) => sum + differenceInMinutes(slot.end, slot.start), 0);
  }, [availabilityMap]);

  // --- Effects ---
  useEffect(() => {
    // Update daily agenda for focus mode when schedule changes
    if (workflowStep === 'schedule') {
      const todayStr = formatISO(new Date(), { representation: 'date' });
      const todayAgenda = weeklySchedule.find(day => day.date === todayStr);
      setDailyAgenda(todayAgenda || null);
    } else {
      setDailyAgenda(null); // Clear agenda if not in schedule step
    }
  }, [workflowStep, weeklySchedule]);


  // --- Subject Management Handlers ---
  const addSubject = () => setSubjects([...subjects, { id: crypto.randomUUID(), name: '', priorKnowledge: 'Basic', allocatedMinutes: 0 }]);

  const removeSubject = (id: string) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter(subject => subject.id !== id));
      // Reset if removing subject affects later stages
      if (workflowStep !== 'input') {
          setWorkflowStep('input'); setTaskPool([]); setWeeklySchedule([]); setAvailabilityMap({}); setFixedBlocksMap({}); setWarnings([]); setError(null);
      }
    }
  };

  const updateSubject = (id: string, field: keyof Subject, value: any) => {
     // Reset if changing core details affects later stages (except allocation)
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
     // Reset if file changes require re-evaluation
     if (workflowStep !== 'input') {
         console.warn("Changing files requires restarting planning.");
         setWorkflowStep('input'); setTaskPool([]); setWeeklySchedule([]); setAvailabilityMap({}); setFixedBlocksMap({}); setWarnings([]); setError(null);
     }
    const file = event.target.files?.[0];
    if (!file) return;
    updateSubject(id, 'file', file);
    updateSubject(id, 'fileName', file.name);
    updateSubject(id, 'fileType', file.type);
    // Add warning about file content usage
    setWarnings(prev => [...prev, `Note: File '${file.name}' uploaded. Task generation based on file content is not yet supported; using standard task breakdown.`])
  };


  // --- Fixed Event Management Handlers ---
   const addFixedEvent = () => {
       if (workflowStep !== 'input') { setWorkflowStep('input'); setWarnings([]); setError(null); } // Reset if adding affects later stages
       setFixedEvents([
           ...fixedEvents, { id: crypto.randomUUID(), name: '', days: [], startTime: '09:00', endTime: '10:00' }
       ]);
   };

   const removeFixedEvent = (id: string) => {
       if (workflowStep !== 'input') { setWorkflowStep('input'); setWarnings([]); setError(null); } // Reset if removing affects later stages
       setFixedEvents(fixedEvents.filter(event => event.id !== id));
   };

   const updateFixedEvent = (id: string, field: keyof FixedEvent, value: any) => {
        if (workflowStep !== 'input') { setWorkflowStep('input'); setWarnings([]); setError(null); } // Reset if updating affects later stages
       // Basic time validation (more robust check in `isInputValid`)
       if ((field === 'startTime' || field === 'endTime') && typeof value === 'string') {
            const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
            if (!timePattern.test(value)) {
                 console.warn(`Invalid time format for ${field}: ${value}. Use HH:MM.`);
                // Allow setting invalid time temporarily, validation happens on submit
            }
        }
       setFixedEvents(fixedEvents.map(event =>
           event.id === id ? { ...event, [field]: value } : event
        ));
    };

    const handleDayToggle = (eventId: string, dayIndex: number) => {
        if (workflowStep !== 'input') { setWorkflowStep('input'); setWarnings([]); setError(null); } // Reset if updating affects later stages
        setFixedEvents(prevEvents => prevEvents.map(event => {
            if (event.id !== eventId) return event;
            const currentDays = event.days;
            const newDays = currentDays.includes(dayIndex)
                ? currentDays.filter(d => d !== dayIndex)
                : [...currentDays, dayIndex].sort((a,b) => a-b);
            return { ...event, days: newDays };
        }));
    };


  // --- Workflow Step Handlers ---
  const handleProceedToAllocation = () => {
    setError(null); setWarnings([]);
    if (!isInputValid) { // Use memoized validation state
        // Error setting logic is now within isInputValid's calculation effect or can be added here explicitly if needed
        setError("Please fix the errors in the input form before proceeding."); // Generic message
        return;
    }

    setIsLoading(true);
    setTimeout(() => { // Simulate async
      try {
         const { availabilityMap: calculatedAvMap, fixedBlocksMap: calculatedFxMap } = calculateAvailability(fixedEvents, weekStart);
         const totalMins = Object.values(calculatedAvMap).flat().reduce((sum, slot) => sum + differenceInMinutes(slot.end, slot.start), 0);
         const tempWarnings: string[] = [];
         if (totalMins <= 0) {
             tempWarnings.push("Warning: No available study time found based on your fixed commitments and sleep schedule.");
         }

         const weeklyGoalMinutesInput = parseFloat(totalWeeklyStudyTime) * 60;
         const effectiveWeeklyGoal = !isNaN(weeklyGoalMinutesInput) && weeklyGoalMinutesInput > 0 ? weeklyGoalMinutesInput : totalMins;
         const subjectsWithSuggestions = suggestSubjectAllocations(subjects, totalMins, effectiveWeeklyGoal);

         setAvailabilityMap(calculatedAvMap);
         setFixedBlocksMap(calculatedFxMap);
         setSubjects(subjectsWithSuggestions); // Update subjects with suggestions
         setWarnings(tempWarnings);
         setWorkflowStep('allocate');
      } catch (err: any) {
         console.error("Error during allocation calculation:", err);
         setError(`Failed to calculate availability: ${err.message || 'Unknown error'}`);
         setAvailabilityMap({}); setFixedBlocksMap({});
      } finally {
         setIsLoading(false);
      }
    }, 50);
  };

  const handleConfirmAllocation = () => {
      setError(null); setIsLoading(true);
      const currentWarnings: string[] = [...warnings];
      const totalAllocated = subjects.reduce((sum, s) => sum + s.allocatedMinutes, 0);

      if (totalAllocated > totalAvailableMinutes) currentWarnings.push(`Warning: Allocated time exceeds available time.`);
      if (totalAllocated === 0 && totalAvailableMinutes > 0) currentWarnings.push(`Note: No study time allocated.`);
      else if (totalAllocated > 0 && totalAllocated < totalAvailableMinutes * 0.5) currentWarnings.push(`Note: Allocated time is significantly less than available time.`);
      setWarnings(currentWarnings);

      setTimeout(() => { // Simulate async
          try {
              const pool = generateTaskPool(subjects); // Generate pool from subjects with final allocations
              setTaskPool(pool);

              // Initialize weekly schedule structure
              const initialSchedule: DaySchedule[] = Array(7).fill(null).map((_, i) => {
                  const dayDate = addDays(weekStart, i);
                  return {
                      date: formatISO(dayDate, { representation: 'date' }),
                      tasks: [], // Start with empty tasks for the day
                      fixedEvents: fixedBlocksMap[i] || [], // Use calculated fixed blocks
                      availableSlots: availabilityMap[i] || [] // Use calculated availability
                  };
              });
              setWeeklySchedule(initialSchedule);
              setWorkflowStep('schedule');
          } catch (err: any) {
              console.error("Error generating task pool/schedule:", err);
              setError(`Failed to generate tasks: ${err.message || 'Unknown error'}`);
          } finally {
              setIsLoading(false);
          }
      }, 50);
  };

 // --- Scheduling Handlers (Passed to Components) ---
   const handleScheduleTask = (taskId: string, dayDateISO: string, startTime: Date) => {
       setTaskPool(currentPool => {
           const taskIndexInPool = currentPool.findIndex(t => t.id === taskId);
           if (taskIndexInPool === -1) {
               console.error("Task not found in pool:", taskId);
               return currentPool; // Task already removed or doesn't exist
           }
           const taskToSchedule = { ...currentPool[taskIndexInPool] };

           setWeeklySchedule(currentSchedule => {
               const dayIndex = currentSchedule.findIndex(d => d.date === dayDateISO);
               if (dayIndex === -1) {
                   console.error("Target day not found:", dayDateISO);
                   return currentSchedule;
               }

               const newSchedule = [...currentSchedule];
               const targetDay = { ...newSchedule[dayIndex] }; // Clone day
               targetDay.tasks = [...targetDay.tasks]; // Clone tasks array

               taskToSchedule.isScheduled = true;
               taskToSchedule.scheduledDay = dayDateISO;
               taskToSchedule.scheduledTime = format(startTime, 'HH:mm');

               // Insert task sorted by time
               let inserted = false;
               for (let i = 0; i < targetDay.tasks.length; i++) {
                   if ((targetDay.tasks[i].scheduledTime ?? "24:00") > taskToSchedule.scheduledTime) {
                       targetDay.tasks.splice(i, 0, taskToSchedule);
                       inserted = true;
                       break;
                   }
               }
               if (!inserted) { targetDay.tasks.push(taskToSchedule); }

               newSchedule[dayIndex] = targetDay; // Update the day in the schedule
               return newSchedule;
           });

           // Return updated pool (task removed)
           return currentPool.filter(t => t.id !== taskId);
       });
   };

   const handleUnscheduleTask = (taskId: string, sourceDayDateISO: string) => {
       let taskToMoveToPool: Task | undefined = undefined;

       setWeeklySchedule(currentSchedule => {
           const dayIndex = currentSchedule.findIndex(d => d.date === sourceDayDateISO);
           if (dayIndex === -1) return currentSchedule;

           const targetDay = currentSchedule[dayIndex];
           const taskIndexOnDay = targetDay.tasks.findIndex(t => t.id === taskId);
           if (taskIndexOnDay === -1) return currentSchedule;

           taskToMoveToPool = targetDay.tasks[taskIndexOnDay]; // Get the task to move

           // Create new schedule with task removed
           const newSchedule = [...currentSchedule];
           const updatedDayTasks = targetDay.tasks.filter(t => t.id !== taskId);
           newSchedule[dayIndex] = { ...targetDay, tasks: updatedDayTasks };
           return newSchedule;
       });

       // Add task back to pool if it was found
       if (taskToMoveToPool) {
           const updatedTask = { ...taskToMoveToPool, isScheduled: false, scheduledDay: undefined, scheduledTime: undefined };
           setTaskPool(currentPool =>
               [...currentPool, updatedTask].sort((a, b) => { // Re-sort pool
                   const nameCompare = a.subjectName.localeCompare(b.subjectName);
                   return nameCompare !== 0 ? nameCompare : a.title.localeCompare(b.title);
               })
           );
       }
   };

  // --- Other Handlers ---
  const toggleFocusMode = () => setShowFocus(prev => !prev);

  // Input validation logic
  const isInputValid = useMemo(() => {
      if (subjects.length === 0 || subjects.some(s => !s.name.trim())) return false;
      const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
      if (fixedEvents.some(e => !e.name.trim() || e.days.length === 0)) return false;
      if (fixedEvents.some(e => {
           if (!timePattern.test(e.startTime) || !timePattern.test(e.endTime)) return true; // Invalid format
           const startMins = timeToMinutes(e.startTime);
           const endMins = timeToMinutes(e.endTime);
           return startMins >= endMins; // Start time must be before end time
      })) return false;
      // Can add validation for weekly study time goal format if needed
      // const weeklyGoalNum = parseFloat(totalWeeklyStudyTime);
      // if (isNaN(weeklyGoalNum) || weeklyGoalNum < 0) return false;
      return true;
  }, [subjects, fixedEvents, totalWeeklyStudyTime]);


  // --- Render Logic ---
  const renderContent = () => {
      if (isLoading) {
          return <div className="text-center py-10 text-lg font-medium" role="status" aria-live="polite">Calculating... Please wait.</div>;
      }

      if (workflowStep === 'schedule') {
          if (showFocus) {
              return dailyAgenda ? <FocusMode dailyAgenda={dailyAgenda} /> : (
                 <div className="max-w-2xl mx-auto text-center py-20">
                    <p className="text-muted-foreground">No schedule data found for today to focus on.</p>
                    <Button variant="outline" onClick={toggleFocusMode} className="mt-4">Exit Focus Mode</Button>
                </div>
              );
          } else if (scheduleViewMode === 'dragdrop') {
              return <InteractiveSchedulerComponent
                         weekStart={weekStart} weeklySchedule={weeklySchedule} taskPool={taskPool} subjects={subjects}
                         onScheduleTask={handleScheduleTask} onUnscheduleTask={handleUnscheduleTask}
                     />;
          } else { // timetable view
              return <WeeklyTimetableView
                         weekStart={weekStart} weeklySchedule={weeklySchedule} taskPool={taskPool} subjects={subjects}
                         onUnscheduleTask={handleUnscheduleTask}
                     />;
          }
      }

      if (workflowStep === 'allocate') {
          return <AllocationReviewComponent
                     subjects={subjects} updateSubjectAllocation={updateSubjectAllocation}
                     totalAvailableMinutes={totalAvailableMinutes}
                     handleConfirmAllocation={handleConfirmAllocation} isLoading={isLoading}
                 />;
      }

      // Default to 'input' step
      return <InputAndGoalsForm
                subjects={subjects} addSubject={addSubject} removeSubject={removeSubject} updateSubject={updateSubject} handleFileChange={handleFileChange}
                fixedEvents={fixedEvents} addFixedEvent={addFixedEvent} removeFixedEvent={removeFixedEvent} updateFixedEvent={updateFixedEvent} handleDayToggle={handleDayToggle}
                totalWeeklyStudyTime={totalWeeklyStudyTime} setTotalWeeklyStudyTime={setTotalWeeklyStudyTime}
                handleSubmit={handleProceedToAllocation} isLoading={isLoading} isSubmitDisabled={!isInputValid || isLoading} submitButtonText="Calculate Availability & Suggest Plan"
            />;
  };

  return (
    <div className="container mx-auto py-6 max-w-full px-4 md:px-6">
        <TooltipProvider delayDuration={200}>
            {/* Header */}
            <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
                 <h1 className="text-3xl font-bold flex items-center gap-2">
                    <BookCopy className="h-8 w-8"/> Interactive Study Planner
                </h1>
                 {/* Action Buttons */}
                 <div className="flex flex-wrap gap-2 items-center">
                     {workflowStep === 'schedule' && (
                        <>
                            <div className="flex items-center border rounded-md p-0.5 bg-muted">
                                <Button variant={scheduleViewMode === 'dragdrop' ? 'secondary' : 'ghost'} size="sm" onClick={() => setScheduleViewMode('dragdrop')} className="px-2 py-1 h-auto rounded-sm" aria-label="Drag and Drop View"> <Grip className="h-4 w-4 mr-1.5"/> Drag & Drop </Button>
                                <Button variant={scheduleViewMode === 'timetable' ? 'secondary' : 'ghost'} size="sm" onClick={() => setScheduleViewMode('timetable')} className="px-2 py-1 h-auto rounded-sm" aria-label="Timetable View"> <Columns className="h-4 w-4 mr-1.5"/> Timetable </Button>
                            </div>
                            <Button variant="outline" onClick={toggleFocusMode} size="sm"> <Eye className="h-4 w-4 mr-1.5"/> {showFocus ? "Exit Focus" : "Focus Today"} </Button>
                            <Button variant="outline" size="sm" onClick={() => setWorkflowStep('allocate')}>Back to Allocation</Button>
                        </>
                     )}
                    {workflowStep === 'allocate' && (
                         <Button variant="outline" onClick={() => { setWorkflowStep('input'); setWarnings([]); setError(null); setAvailabilityMap({}); setFixedBlocksMap({}); }}>Back to Inputs</Button>
                    )}
                 </div>
            </div>

            {/* Error & Warning Display */}
            {error && ( <div className="mb-4 p-3 bg-destructive/10 text-destructive border border-destructive rounded-md" role="alert"> <p className="font-medium flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Error: {error}</p> </div> )}
            {warnings.length > 0 && !error && ( // Show warnings only if no error
                <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-600 rounded-md space-y-1" role="status">
                     <p className="font-medium flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Planning Notes:</p>
                     <ul className="list-disc list-inside text-sm space-y-0.5"> {warnings.map((warn, index) => <li key={index}>{warn}</li>)} </ul>
                </div>
            )}

            {/* Main Content Rendered Based on State */}
            {renderContent()}

         </TooltipProvider>
    </div>
  );
}