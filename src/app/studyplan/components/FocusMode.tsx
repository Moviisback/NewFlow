import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Lock, CheckCircle } from "lucide-react";
import { Task, DaySchedule } from '../types'; // Import types
import { cn } from '../utils'; // Import helpers

interface FocusModeProps {
  dailyAgenda: DaySchedule | null;
}

export default function FocusMode({ dailyAgenda }: FocusModeProps): React.ReactNode {
    const [completedTasks, setCompletedTasks] = useState<string[]>([]);
    const [timer, setTimer] = useState<number | null>(null);
    const [currentTask, setCurrentTask] = useState<Task | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleComplete = (taskId: string) => {
        if (!completedTasks.includes(taskId)) {
            if (currentTask?.id === taskId && timer !== null) { stopTimer(); } // Stop timer if completing the active task
            setCompletedTasks(prev => [...prev, taskId]);
        }
    };

    const stopTimer = () => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        setTimer(null);
        setCurrentTask(null);
    };

    const startTimer = (task: Task) => {
        if (intervalRef.current) clearInterval(intervalRef.current); // Clear previous interval
        setCurrentTask(task);
        setTimer(task.duration * 60);
        intervalRef.current = setInterval(() => {
            setTimer(prev => {
                if (prev === null || prev <= 1) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    handleComplete(task.id); // Auto-complete when timer finishes
                    stopTimer(); // Ensure timer state is reset
                    // Optionally add a sound/notification here
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        // Cleanup interval on component unmount
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    useEffect(() => {
        // Reset focus mode state when the agenda changes (e.g., new day)
        setCompletedTasks([]);
        stopTimer();
    }, [dailyAgenda]); // Dependency on dailyAgenda

    if (!dailyAgenda || (!dailyAgenda.tasks?.length && !dailyAgenda.fixedEvents?.length)) {
        return ( <div className="max-w-2xl mx-auto text-center py-20"><p className="text-muted-foreground">Nothing scheduled for today.</p></div> );
    }

    const tasks = dailyAgenda.tasks ?? [];
    const fixedEvents = dailyAgenda.fixedEvents ?? [];
    const date = parseISO(dailyAgenda.date);
    const sortedItems = [
        ...fixedEvents.map(fe => ({ ...fe, type: 'fixed' as const, sortKey: fe.startTime })),
        ...tasks.map(t => ({ ...t, type: 'task' as const, sortKey: t.scheduledTime ?? '00:00' }))
    ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    return (
        <div className="max-w-2xl mx-auto">
            <Card className="border-4 border-primary shadow-lg">
                <CardHeader className="text-center bg-primary/10">
                    <CardTitle className="text-2xl">Focus Mode</CardTitle>
                    <CardDescription className="text-base">Today's Plan: {format(date, "EEEE, MMMM d")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    {sortedItems.length === 0 ? (
                        <p className="text-center text-muted-foreground py-10">Nothing scheduled for today!</p>
                    ) : (
                        <ScrollArea className="h-[calc(100vh-300px)] max-h-[500px] p-1 pr-3 -mr-2">
                             <div className="space-y-4">
                                 {sortedItems.map((item, index) => {
                                    if (item.type === 'fixed') {
                                        return (
                                            <div key={`focus-fixed-${item.id}-${index}`} className="p-4 rounded-lg border bg-muted/60 text-muted-foreground flex items-center gap-3">
                                                <Lock className="h-5 w-5 shrink-0 flex-none" />
                                                <div className='min-w-0'>
                                                    <p className="font-medium truncate" title={item.name}>{item.name}</p>
                                                    <p className="text-sm">{item.startTime} - {item.endTime}</p>
                                                </div>
                                            </div> );
                                    } else if (item.type === 'task') {
                                        const task = item;
                                        const isCompleted = completedTasks.includes(task.id);
                                        const isCurrentTask = currentTask?.id === task.id;
                                        return (
                                             <div key={task.id} className={cn("p-4 rounded-lg border relative transition-all duration-200", task.subjectColor, isCompleted && "opacity-60 brightness-90", isCurrentTask && "ring-2 ring-offset-2 ring-primary shadow-lg")}>
                                                <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                                                    <h3 className={cn("font-bold text-lg", isCompleted && "line-through")}>{task.title}</h3>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {task.scheduledTime && <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{task.scheduledTime}</Badge>}
                                                        <Badge variant="outline" className="text-xs px-1.5 py-0.5 truncate max-w-[100px]" title={task.subjectName}>{task.subjectName}</Badge>
                                                    </div>
                                                </div>
                                                <p className={cn("text-sm opacity-90 mb-3", isCompleted && "line-through")}>{task.description}</p>
                                                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t pt-3 mt-3">
                                                    <div className="flex items-center text-sm font-medium">
                                                        <Clock className="h-4 w-4 mr-1.5 flex-none" /> {task.duration} min session
                                                        {isCurrentTask && timer !== null && ( <Badge variant="outline" className="ml-2 font-mono py-0.5 px-1.5 text-base tabular-nums">{formatTime(timer)}</Badge> )}
                                                        {isCurrentTask && timer !== null ? <span className="ml-1.5 text-xs text-muted-foreground">remaining</span> : ''}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {isCurrentTask && timer !== null ? (
                                                            <Button size="sm" variant="destructive" onClick={stopTimer}>Stop Timer</Button>
                                                        ) : (
                                                            <Button size="sm" variant="secondary" onClick={() => startTimer(task)} disabled={isCompleted || (timer !== null && !isCurrentTask)}>Start Timer</Button>
                                                        )}
                                                        <Button size="sm" variant={isCompleted ? "ghost" : "default"} onClick={() => handleComplete(task.id)} disabled={isCompleted} className={isCompleted ? "cursor-not-allowed text-green-600 dark:text-green-400" : ""}>
                                                            {isCompleted ? <><CheckCircle className='w-4 h-4 mr-1'/> Completed</> : "Mark Complete"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div> );
                                    }
                                    return null;
                                })}
                             </div>
                         </ScrollArea>
                    )}
                    <div className="p-4 bg-secondary/50 rounded-lg text-center mt-6">
                        <p className="font-medium">You got this! Stay focused.</p>
                        <p className="text-sm mt-1 text-muted-foreground">Remember to take short breaks between sessions.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}