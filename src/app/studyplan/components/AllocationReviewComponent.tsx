import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ArrowRight } from "lucide-react";
import { Subject } from '../types'; // Import types
import { minutesToHours } from '../utils'; // Import helpers

interface AllocationReviewProps {
    subjects: Subject[];
    updateSubjectAllocation: (id: string, minutes: number) => void;
    totalAvailableMinutes: number;
    handleConfirmAllocation: () => void;
    isLoading: boolean;
}

export default function AllocationReviewComponent({
    subjects, updateSubjectAllocation, totalAvailableMinutes, handleConfirmAllocation, isLoading
}: AllocationReviewProps): React.ReactNode {
    const totalSuggestedMinutes = useMemo(() => subjects.reduce((sum, s) => sum + (s.suggestedMinutes ?? 0), 0), [subjects]);
    const totalAllocatedMinutes = useMemo(() => subjects.reduce((sum, s) => sum + s.allocatedMinutes, 0), [subjects]);

    const sliderMax = useMemo(() => {
        const maxNeeded = Math.max(totalAllocatedMinutes, totalSuggestedMinutes, totalAvailableMinutes);
        return Math.ceil(Math.max(maxNeeded + 120, 120) / 30) * 30;
    }, [totalAllocatedMinutes, totalSuggestedMinutes, totalAvailableMinutes]); // Removed subjects dependency as it's covered by the allocated/suggested totals

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Review & Adjust Time Allocation</CardTitle>
                <CardDescription>
                    We've suggested study time based on priorities and calculated availability. Adjust sliders to your preference.
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
}