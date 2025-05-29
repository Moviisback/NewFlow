import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { format, parseISO, differenceInMinutes, formatISO } from "date-fns"; // <-- Added formatISO
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Trash2, Lock, GripVertical } from "lucide-react";
import { Task, DaySchedule, Subject, TimeSlot, FixedEventBlock, ScheduleItem } from '../types'; // Import types
import { minutesToHours, cn } from '../utils'; // Import helpers

interface InteractiveSchedulerProps {
    weekStart: Date;
    weeklySchedule: DaySchedule[];
    taskPool: Task[];
    subjects: Subject[];
    onScheduleTask: (taskId: string, dayDateISO: string, startTime: Date) => void;
    onUnscheduleTask: (taskId: string, sourceDayDateISO: string) => void;
}

export default function InteractiveSchedulerComponent({
    weekStart, weeklySchedule, taskPool, subjects, onScheduleTask, onUnscheduleTask
}: InteractiveSchedulerProps): React.ReactNode {
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);

    // --- Drag Handlers START ---
    const handlePoolDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
        try {
            const data = JSON.stringify({ taskId: task.id, duration: task.duration, origin: 'pool' });
            e.dataTransfer.setData("application/json", data);
            e.dataTransfer.effectAllowed = "move";
            e.currentTarget.classList.add('opacity-50', 'ring-2', 'ring-primary');
            setDraggedTask(task);
        } catch (error) { console.error("Error setting drag data from pool:", error); }
    };
    const handleScheduleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
        if (!task.scheduledDay) {
            console.warn("Cannot drag task without scheduledDay:", task); e.preventDefault(); return;
        }
        try {
            const data = JSON.stringify({ taskId: task.id, duration: task.duration, origin: 'schedule', sourceDay: task.scheduledDay });
            e.dataTransfer.setData("application/json", data);
            e.dataTransfer.effectAllowed = "move";
            e.currentTarget.classList.add('opacity-50', 'ring-2', 'ring-destructive');
            setDraggedTask(task);
        } catch (error) { console.error("Error setting drag data from schedule:", error); }
    };
    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('opacity-50', 'ring-2', 'ring-primary', 'ring-destructive');
        setDraggedTask(null);
    };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.dataTransfer.dropEffect = "move";
        if (e.currentTarget.hasAttribute('data-droppable-slot')) {
            e.currentTarget.classList.add('bg-primary/10', 'outline-dashed', 'outline-1', 'outline-primary');
        } else if (e.currentTarget.hasAttribute('data-droppable-pool')) {
            if (draggedTask?.isScheduled) { e.currentTarget.classList.add('bg-destructive/10'); }
        }
    };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('bg-primary/10', 'outline-dashed', 'outline-1', 'outline-primary', 'bg-destructive/10');
    };
    const handleDropOnSlot = (e: React.DragEvent<HTMLDivElement>, day: DaySchedule, slot: TimeSlot) => {
        e.preventDefault(); e.stopPropagation();
        e.currentTarget.classList.remove('bg-primary/10', 'outline-dashed', 'outline-1', 'outline-primary');
        try {
            const dataString = e.dataTransfer.getData("application/json"); if (!dataString) return;
            const data = JSON.parse(dataString); const { taskId, duration, origin, sourceDay } = data;
            if (!taskId || typeof duration !== 'number') return;
            const slotDuration = differenceInMinutes(slot.end, slot.start);
            if (slotDuration < duration) { console.warn(`Task duration (${duration} min) exceeds slot time (${slotDuration} min).`); setDraggedTask(null); return; }
            const dropStartTime = slot.start;
            if (origin === 'pool') { onScheduleTask(taskId, day.date, dropStartTime); }
            else if (origin === 'schedule' && sourceDay) {
                onUnscheduleTask(taskId, sourceDay);
                setTimeout(() => { onScheduleTask(taskId, day.date, dropStartTime); }, 0);
            }
        } catch (error) { console.error("Error handling drop on slot:", error); }
        finally { setDraggedTask(null); }
    };
    const handleDropOnPool = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
        e.currentTarget.classList.remove('bg-destructive/10');
        try {
            const dataString = e.dataTransfer.getData("application/json"); if (!dataString) return;
            const data = JSON.parse(dataString); const { taskId, origin, sourceDay } = data;
            if (origin === 'schedule' && taskId && sourceDay) { onUnscheduleTask(taskId, sourceDay); }
        } catch (error) { console.error("Error handling drop on pool:", error); }
        finally { setDraggedTask(null); }
    };
    // --- Drag Handlers END ---

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Task Pool Sidebar */}
            <Card
                className="lg:w-1/4 shrink-0 border-2 border-dashed border-muted hover:border-primary transition-colors lg:max-h-[80vh]"
                onDrop={handleDropOnPool} onDragOver={handleDragOver} onDragLeave={handleDragLeave} data-droppable-pool="true" >
                <CardHeader>
                    <CardTitle>Task Pool ({taskPool.length})</CardTitle>
                    <CardDescription>Drag tasks onto available slots. Drag scheduled tasks back here to unschedule.</CardDescription>
                 </CardHeader>
                <CardContent className='p-0'>
                    <ScrollArea className="h-[60vh] lg:h-full p-3">
                        {taskPool.length === 0 && <p className='text-sm text-muted-foreground italic text-center py-10'>No tasks left to schedule!</p>}
                        <div className="space-y-2">
                            {taskPool.map(task => (
                                <div key={task.id} draggable onDragStart={(e) => handlePoolDragStart(e, task)} onDragEnd={handleDragEnd}
                                    className={cn("p-2 rounded border cursor-grab flex items-start gap-2 transition-opacity duration-150 ease-in-out group", task.subjectColor)}>
                                    <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0 flex-none group-hover:text-foreground" />
                                    <div className="flex-grow min-w-0">
                                        <div className="font-medium text-sm truncate leading-tight flex justify-between items-center" title={task.title}>
                                            <span>{task.title}</span>
                                             <Badge variant="secondary" className='ml-2 text-[10px] px-1 py-0 h-4 capitalize'>{task.taskType}</Badge>
                                        </div>
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

            {/* Weekly Schedule Grid */}
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {weeklySchedule.map((day) => {
                    const dayDateObj = parseISO(day.date);
                    const isToday = formatISO(new Date(), { representation: 'date' }) === day.date;
                    const scheduledDuration = day.tasks.reduce((sum, t) => sum + t.duration, 0);

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
                                <ScrollArea className="h-[55vh] lg:h-[calc(80vh-100px)] pr-2 -mr-2">
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
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}