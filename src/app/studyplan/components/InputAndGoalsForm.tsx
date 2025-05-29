import React, { ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarIcon, Trash2, PlusCircle, CheckCircle, ArrowRight, Info } from "lucide-react";
import { Subject, FixedEvent } from '../types'; // Import types
import { DAY_NAMES, SLEEP_START_TIME, SLEEP_END_TIME } from '../constants'; // Import constants
import { cn } from '../utils'; // Import cn helper

interface InputAndGoalsFormProps {
    subjects: Subject[];
    addSubject: () => void;
    removeSubject: (id: string) => void;
    updateSubject: (id: string, field: keyof Subject, value: any) => void;
    handleFileChange: (id: string, event: ChangeEvent<HTMLInputElement>) => void;
    fixedEvents: FixedEvent[];
    addFixedEvent: () => void;
    removeFixedEvent: (id: string) => void;
    updateFixedEvent: (id: string, field: keyof FixedEvent, value: any) => void;
    handleDayToggle: (eventId: string, dayIndex: number) => void;
    totalWeeklyStudyTime: string;
    setTotalWeeklyStudyTime: (value: string) => void;
    handleSubmit: () => void;
    isLoading: boolean;
    isSubmitDisabled: boolean;
    submitButtonText: string;
}

export default function InputAndGoalsForm({
    subjects, addSubject, removeSubject, updateSubject, handleFileChange,
    fixedEvents, addFixedEvent, removeFixedEvent, updateFixedEvent, handleDayToggle,
    totalWeeklyStudyTime, setTotalWeeklyStudyTime, handleSubmit, isLoading, isSubmitDisabled, submitButtonText
}: InputAndGoalsFormProps): React.ReactNode {

  const renderSubjectCard = (subject: Subject) => (
     <Card key={subject.id} className="relative p-4 border shadow-sm bg-card">
          {subjects.length > 1 && ( <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeSubject(subject.id)} aria-label={`Remove subject ${subject.name || 'unnamed'}`}><Trash2 className="h-4 w-4" /></Button> )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"> <Label htmlFor={`subject-name-${subject.id}`}>Subject Name *</Label> <Input id={`subject-name-${subject.id}`} value={subject.name} onChange={(e) => updateSubject(subject.id, 'name', e.target.value)} placeholder="e.g., Calculus I" required aria-required="true"/> </div>
              <div className="space-y-1.5"> <Label htmlFor={`prior-knowledge-${subject.id}`}>Prior Knowledge *</Label> <Select value={subject.priorKnowledge} onValueChange={(value) => updateSubject(subject.id, 'priorKnowledge', value)} required aria-required="true"> <SelectTrigger id={`prior-knowledge-${subject.id}`}><SelectValue placeholder="Select knowledge level" /></SelectTrigger> <SelectContent> <SelectItem value="None">None</SelectItem> <SelectItem value="Basic">Basic</SelectItem> <SelectItem value="Intermediate">Intermediate</SelectItem> <SelectItem value="Advanced">Advanced</SelectItem> </SelectContent> </Select> </div>
              <div className="space-y-1.5">
                <Label htmlFor={`exam-date-${subject.id}`}>Exam Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <span> {/* Keep the span wrapper */}
                      <Button
                        // --- Prevent form submission on click ---
                        type="button"
                        // --- End fix ---
                        variant="outline"
                        id={`exam-date-${subject.id}`}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !subject.examDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {subject.examDate ? (
                          format(subject.examDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={subject.examDate}
                      onSelect={(date) => {
                        // console.log(`InputForm: Date selected for subject ${subject.id}:`, date); // Keep log for debugging if needed
                        updateSubject(subject.id, "examDate", date ?? undefined)
                      }}
                      initialFocus
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
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
                 <CardHeader> <CardTitle className="flex items-center gap-2"> Weekly Study Goal <TooltipProvider><Tooltip> <TooltipTrigger asChild><button type="button" aria-label="Info about weekly study goal"><Info className="h-4 w-4 text-muted-foreground cursor-help"/></button></TooltipTrigger> <TooltipContent><p className='max-w-xs'>This is your target for planning. The tool will calculate your actual available time based on fixed events.</p></TooltipContent> </Tooltip></TooltipProvider> </CardTitle> <CardDescription>Set your target study hours for the week.</CardDescription> </CardHeader>
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
}