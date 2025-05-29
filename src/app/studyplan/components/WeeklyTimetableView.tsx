import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO, formatISO } from "date-fns"; // <-- Added formatISO
import { Lock, Trash2 } from "lucide-react";
import { Task, DaySchedule, Subject } from '../types'; // Import types
import { TIMETABLE_START_HOUR, TIMETABLE_END_HOUR, TIMETABLE_HOUR_HEIGHT } from '../constants'; // Import constants
import { timeToMinutes, cn } from '../utils'; // Import helpers

interface WeeklyTimetableViewProps {
    weekStart: Date;
    weeklySchedule: DaySchedule[];
    taskPool: Task[]; // Keep for potential future interactions?
    subjects: Subject[]; // Needed for colors
    onUnscheduleTask: (taskId: string, sourceDayDateISO: string) => void;
}

export default function WeeklyTimetableView({
    weekStart, weeklySchedule, taskPool, subjects, onUnscheduleTask
}: WeeklyTimetableViewProps): React.ReactNode {

    const timeLabels = useMemo(() => {
        const labels = [];
        for (let hour = TIMETABLE_START_HOUR; hour < TIMETABLE_END_HOUR; hour++) {
            labels.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        return labels;
    }, []);

    const calculatePosition = (startTimeStr: string | undefined, endTimeStr: string | undefined, durationMinutes: number | undefined): { top: number, height: number } => {
        if (!startTimeStr) return { top: 0, height: 0 };
        const startMinutesTotal = timeToMinutes(startTimeStr);
        let endMinutesTotal: number;
        if (endTimeStr) { endMinutesTotal = timeToMinutes(endTimeStr); }
        else if (durationMinutes !== undefined) { endMinutesTotal = startMinutesTotal + durationMinutes; }
        else { endMinutesTotal = startMinutesTotal + 60; } // Default to 1 hour

        if (startMinutesTotal === 0 && startTimeStr !== '00:00') endMinutesTotal = 0;
        if (endMinutesTotal <= startMinutesTotal) endMinutesTotal = startMinutesTotal + 15;

        const timetableStartMinutes = TIMETABLE_START_HOUR * 60;
        const top = ((startMinutesTotal - timetableStartMinutes) / 60) * TIMETABLE_HOUR_HEIGHT;
        const height = ((endMinutesTotal - startMinutesTotal) / 60) * TIMETABLE_HOUR_HEIGHT;

        const timetableEndMinutes = TIMETABLE_END_HOUR * 60;
        const maxTop = ((timetableEndMinutes - timetableStartMinutes) / 60) * TIMETABLE_HOUR_HEIGHT;

        const clampedTop = Math.max(0, top);
        const clampedHeight = Math.max(5, Math.min(height, maxTop - clampedTop));

        if (top >= maxTop) return { top: maxTop, height: 0 };
        return { top: clampedTop, height: clampedHeight };
    };

    return (
        <div className="bg-background rounded-lg border shadow-sm overflow-hidden">
            <div className="flex border-b">
                <div className="w-16 flex-shrink-0 px-2 py-2 text-xs font-semibold text-muted-foreground sticky left-0 bg-background z-20 border-r">Time</div>
                {weeklySchedule.map((day) => {
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
             <div className="flex relative h-[75vh] overflow-y-auto">
                <div className="w-16 flex-shrink-0 sticky left-0 bg-background z-10 border-r">
                    {timeLabels.map((label) => (
                        <div key={label} className="h-[60px] relative border-b last:border-b-0">
                            <span className="absolute -top-2 left-1 text-[10px] text-muted-foreground bg-background px-1">{label}</span>
                        </div>
                    ))}
                     <div className="h-0 relative">
                         <span className="absolute -top-2 left-1 text-[10px] text-muted-foreground bg-background px-1">{`${TIMETABLE_END_HOUR.toString().padStart(2, '0')}:00`}</span>
                     </div>
                </div>
                 {weeklySchedule.map((day) => {
                     const itemsToRender = [
                         ...day.fixedEvents.map(fe => ({ ...fe, itemType: 'fixed' as const })),
                         ...day.tasks.map(t => ({ ...t, itemType: 'task' as const }))
                     ];
                     return (
                        <div key={`col-${day.date}`} className="flex-1 min-w-[120px] border-r last:border-r-0 relative">
                             {timeLabels.map((label) => (
                                 <div key={`line-${day.date}-${label}`} className="h-[60px] border-b border-dashed border-border/40"></div>
                             ))}
                            {itemsToRender.map((item, index) => {
                                const { top, height } = calculatePosition(
                                    item.itemType === 'fixed' ? item.startTime : item.scheduledTime,
                                    item.itemType === 'fixed' ? item.endTime : undefined,
                                    item.itemType === 'task' ? item.duration : undefined
                                );
                                if (height <= 0) return null;

                                if (item.itemType === 'fixed') {
                                    return (
                                        <TooltipProvider key={`tt-fixed-${item.id}-${index}`}><Tooltip>
                                            <TooltipTrigger asChild>
                                                 <div className="absolute left-0.5 right-0.5 p-1 rounded border bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] leading-tight overflow-hidden shadow-sm"
                                                     style={{ top: `${top}px`, height: `${height}px` }} >
                                                     <p className="font-semibold truncate flex items-center gap-1"><Lock className="h-2.5 w-2.5 shrink-0" /> {item.name}</p>
                                                     <p>{item.startTime} - {item.endTime}</p>
                                                 </div>
                                            </TooltipTrigger>
                                            <TooltipContent side='right' align='start'>
                                                <p className='font-medium'>{item.name} (Fixed)</p> <p className='text-xs'>{item.startTime} - {item.endTime}</p>
                                            </TooltipContent>
                                        </Tooltip></TooltipProvider>
                                    );
                                } else { // task
                                     const task = item;
                                     return (
                                         <TooltipProvider key={`tt-task-${task.id}-${index}`}><Tooltip>
                                             <TooltipTrigger asChild>
                                                 <div className={cn("absolute left-0.5 right-0.5 p-1 rounded border text-[10px] leading-tight overflow-hidden shadow-sm group cursor-pointer hover:brightness-110", task.subjectColor)}
                                                      style={{ top: `${top}px`, height: `${height}px` }} >
                                                      <p className="font-semibold truncate" title={task.title}>{task.title}</p>
                                                      <p className="text-[9px] opacity-80 truncate">{task.scheduledTime} ({task.duration}m)</p>
                                                      <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-4 w-4 text-inherit hover:bg-destructive/50 p-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100 z-20"
                                                          onClick={(e) => { e.stopPropagation(); task.scheduledDay && onUnscheduleTask(task.id, task.scheduledDay); }}
                                                          aria-label={`Unschedule ${task.title}`} >
                                                          <Trash2 className="h-2.5 w-2.5" />
                                                      </Button>
                                                 </div>
                                             </TooltipTrigger>
                                             <TooltipContent side='right' align='start'>
                                                 <p className='font-medium'>{task.title}</p> <p className='text-xs'>{task.subjectName}</p>
                                                 <p className='text-xs'>{task.scheduledTime} ({task.duration} min)</p> <p className='text-xs mt-1 opacity-70'>{task.description}</p>
                                             </TooltipContent>
                                         </Tooltip></TooltipProvider>
                                     );
                                }
                            })}
                        </div>
                    );
                 })}
             </div>
        </div>
    );
}