'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, addDays, differenceInDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, BookOpen, Clock, Award, AlertCircle } from "lucide-react";

export default function StudyPlanPage() {
  // User input states
  const [examDate, setExamDate] = useState(addDays(new Date(), 30));
  const [difficulty, setDifficulty] = useState('Beginner');
  const [studyTime, setStudyTime] = useState('1 hour/day');
  const [learningStyle, setLearningStyle] = useState('');
  const [knowledgeMap, setKnowledgeMap] = useState('');
  
  // Generated plan states
  const [planGenerated, setPlanGenerated] = useState(false);
  const [studyPlan, setStudyPlan] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentTab, setCurrentTab] = useState("input");
  const [dailyAgenda, setDailyAgenda] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFocus, setShowFocus] = useState(false);

  // Effects
  useEffect(() => {
    if (planGenerated) {
      const daysLeft = differenceInDays(examDate, new Date());
      const totalDays = differenceInDays(examDate, studyPlan.startDate);
      const progressValue = 100 - (daysLeft / totalDays * 100);
      setProgress(Math.max(0, Math.min(100, progressValue)));
      
      // Set today's agenda
      const todayAgenda = studyPlan?.schedule.find(day => 
        new Date(day.date).toDateString() === new Date().toDateString()
      );
      setDailyAgenda(todayAgenda);
    }
  }, [planGenerated, examDate, studyPlan]);

  // Handlers
  const handleSubmit = () => {
    setIsLoading(true);
    
    // Simulate AI processing time
    setTimeout(() => {
      // Generate a plan based on the inputs
      const plan = generateAIStudyPlan(examDate, difficulty, studyTime, learningStyle, knowledgeMap);
      setStudyPlan(plan);
      setPlanGenerated(true);
      setCurrentTab("timeline");
      setIsLoading(false);
    }, 1500);
  };

  const toggleFocusMode = () => {
    setShowFocus(!showFocus);
  };

  const panicMode = () => {
    if (!studyPlan) return;
    
    const condensedPlan = {
      ...studyPlan,
      schedule: studyPlan.schedule.map(day => ({
        ...day,
        tasks: day.tasks.map(task => ({
          ...task,
          duration: Math.floor(task.duration * 0.7) // Reduce time by 30%
        }))
      }))
    };
    
    setStudyPlan(condensedPlan);
  };

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Exam Date and Study Plan</h1>
        {planGenerated && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={toggleFocusMode}>
              {showFocus ? "Exit Focus Mode" : "Focus Mode"}
            </Button>
            <Button variant="destructive" size="sm" onClick={panicMode}>
              <AlertCircle className="mr-2 h-4 w-4" />
              Panic Mode
            </Button>
          </div>
        )}
      </div>

      {showFocus && planGenerated ? (
        <FocusMode dailyAgenda={dailyAgenda} examDate={examDate} />
      ) : (
        <Tabs defaultValue="input" value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="input">Exam Details</TabsTrigger>
            <TabsTrigger value="timeline" disabled={!planGenerated}>Timeline</TabsTrigger>
            <TabsTrigger value="knowledge" disabled={!planGenerated}>Knowledge Map</TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-6">
            <InputForm 
              examDate={examDate}
              setExamDate={setExamDate}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              studyTime={studyTime}
              setStudyTime={setStudyTime}
              learningStyle={learningStyle}
              setLearningStyle={setLearningStyle}
              knowledgeMap={knowledgeMap}
              setKnowledgeMap={setKnowledgeMap}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="timeline">
            {planGenerated && (
              <TimelineView 
                studyPlan={studyPlan} 
                progress={progress} 
                examDate={examDate}
                setStudyPlan={setStudyPlan}
              />
            )}
          </TabsContent>

          <TabsContent value="knowledge">
            {planGenerated && (
              <KnowledgeMapView 
                knowledgeMap={studyPlan.knowledgeMap} 
                complexTopics={studyPlan.complexTopics}
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Sub-components
function InputForm({ 
  examDate, setExamDate, difficulty, setDifficulty, studyTime, setStudyTime, 
  learningStyle, setLearningStyle, knowledgeMap, setKnowledgeMap, handleSubmit, isLoading 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter Your Exam Details</CardTitle>
        <CardDescription>
          Provide information about your exam to generate a personalized study plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="exam-date">Exam Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="exam-date"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !examDate && "text-muted-foreground"
                  )}
                >
                  {examDate ? (
                    format(examDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={examDate}
                  onSelect={setExamDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty Level</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger id="difficulty">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Confident">Confident</SelectItem>
                <SelectItem value="Expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="study-time">Daily Study Time</Label>
            <Select value={studyTime} onValueChange={setStudyTime}>
              <SelectTrigger id="study-time">
                <SelectValue placeholder="Select study time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30 minutes/day">30 minutes/day</SelectItem>
                <SelectItem value="1 hour/day">1 hour/day</SelectItem>
                <SelectItem value="2 hours/day">2 hours/day</SelectItem>
                <SelectItem value="3 hours/day">3 hours/day</SelectItem>
                <SelectItem value="4+ hours/day">4+ hours/day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="learning-style">Learning Style (Optional)</Label>
            <Select value={learningStyle} onValueChange={setLearningStyle}>
              <SelectTrigger id="learning-style">
                <SelectValue placeholder="Select learning style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Visual">Visual</SelectItem>
                <SelectItem value="Auditory">Auditory</SelectItem>
                <SelectItem value="Reading/Writing">Reading/Writing</SelectItem>
                <SelectItem value="Kinesthetic">Kinesthetic</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Label htmlFor="knowledge-map">Knowledge Map (Optional)</Label>
          <Textarea
            id="knowledge-map"
            placeholder="Enter your current knowledge map or leave blank to generate one"
            value={knowledgeMap}
            onChange={(e) => setKnowledgeMap(e.target.value)}
            rows={5}
          />
        </div>

        <Button 
          onClick={handleSubmit} 
          className="w-full mt-4" 
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? "Generating Plan..." : "Generate Study Plan"}
        </Button>
      </CardContent>
    </Card>
  );
}

function TimelineView({ studyPlan, progress, examDate, setStudyPlan }) {
  const daysLeft = differenceInDays(examDate, new Date());
  const statusColor = daysLeft < 7 ? "bg-red-500" : daysLeft < 14 ? "bg-yellow-500" : "bg-green-500";
  
  const handleReschedule = (index, newTasks) => {
    const updatedSchedule = [...studyPlan.schedule];
    updatedSchedule[index].tasks = newTasks;
    
    setStudyPlan({
      ...studyPlan,
      schedule: updatedSchedule
    });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Study Plan Progress</CardTitle>
          <CardDescription>
            {daysLeft} days left until exam
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${statusColor} mr-2`}></div>
                  <span className="font-medium">
                    {daysLeft < 7 ? "Critical Phase" : daysLeft < 14 ? "Intense Phase" : "On Track"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {progress.toFixed(0)}% of study plan completed
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  <Award className="h-3 w-3 mr-1" />
                  {studyPlan.achievements[0]}
                </Badge>
              </div>
            </div>
            
            <Progress value={progress} className="h-2" />
            
            <div className="pt-4">
              <h3 className="font-medium mb-2">Next Milestone</h3>
              <div className="bg-secondary p-3 rounded-md">
                <div className="flex justify-between items-center">
                  <span>{studyPlan.milestones[0].title}</span>
                  <span className="text-sm text-muted-foreground">
                    Due: {format(new Date(studyPlan.milestones[0].date), "MMM d")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Day-by-Day Schedule</CardTitle>
          <CardDescription>
            Drag and drop tasks to reschedule them
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {studyPlan.schedule.map((day, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">
                      {format(new Date(day.date), "EEE, MMM d")}
                    </h3>
                    <Badge variant={day.type === "review" ? "secondary" : day.type === "practice" ? "destructive" : "default"}>
                      {day.type === "review" ? "Review" : day.type === "practice" ? "Practice Exam" : "Study"}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {day.tasks.map((task, taskIndex) => (
                      <div 
                        key={taskIndex} 
                        className="bg-secondary/50 p-2 rounded flex justify-between items-center"
                        draggable 
                        onDragStart={(e) => {
                          e.dataTransfer.setData("taskIndex", taskIndex.toString());
                          e.dataTransfer.setData("dayIndex", index.toString());
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const sourceTaskIndex = parseInt(e.dataTransfer.getData("taskIndex"));
                          const sourceDayIndex = parseInt(e.dataTransfer.getData("dayIndex"));
                          
                          if (sourceDayIndex === index) {
                            // Reorder within the same day
                            const newTasks = [...day.tasks];
                            const [movedTask] = newTasks.splice(sourceTaskIndex, 1);
                            newTasks.splice(taskIndex, 0, movedTask);
                            handleReschedule(index, newTasks);
                          }
                        }}
                      >
                        <div>
                          <div className="font-medium text-sm">{task.title}</div>
                          <div className="text-xs text-muted-foreground">{task.description}</div>
                        </div>
                        <div className="flex items-center text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {task.duration} min
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function KnowledgeMapView({ knowledgeMap, complexTopics }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Map</CardTitle>
          <CardDescription>
            Visual representation of topics and their relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-secondary p-4 rounded-md">
            <pre className="whitespace-pre-wrap text-sm">{knowledgeMap}</pre>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Complex Topics</CardTitle>
          <CardDescription>
            These topics may require additional focus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {complexTopics.map((topic, index) => (
              <div key={index} className="flex items-start gap-3 pb-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium">{topic.title}</h4>
                  <p className="text-sm text-muted-foreground">{topic.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FocusMode({ dailyAgenda, examDate }) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-4 border-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Focus Mode</CardTitle>
          <CardDescription>
            Exam in {differenceInDays(examDate, new Date())} days
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Today's Agenda</h2>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d")}
            </p>
          </div>
          
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {dailyAgenda?.tasks.map((task, index) => (
                <div key={index} className="bg-secondary p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg">{task.title}</h3>
                    <div className="flex items-center text-sm">
                      <Clock className="h-3 w-3 mr-1" />
                      {task.duration} min
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-3">{task.description}</p>
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline">Complete</Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Award className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <p className="text-green-600 dark:text-green-400">
                You're on track! Keep up the good work and consider taking a short break after completing today's tasks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// AI-powered study plan generation mock
function generateAIStudyPlan(examDate, difficulty, studyTime, learningStyle, knowledgeMap) {
  // This is a mock implementation that would be replaced with actual AI logic
  const hoursPerDay = parseInt(studyTime.split(' ')[0]);
  const daysUntilExam = differenceInDays(examDate, new Date());
  const startDate = new Date();
  
  // Generate a simple schedule
  const schedule = [];
  for (let i = 0; i < Math.min(daysUntilExam, 14); i++) {
    const date = addDays(startDate, i);
    const dayType = i % 5 === 4 ? "review" : i % 7 === 6 ? "practice" : "study";
    
    // Create tasks for the day
    const tasks = [];
    const totalDuration = hoursPerDay * 60; // Convert to minutes
    let remainingDuration = totalDuration;
    
    if (dayType === "study") {
      tasks.push({
        title: `Study Topic ${i % 3 + 1}`,
        description: `Focus on key concepts and definitions`,
        duration: Math.floor(remainingDuration * 0.6)
      });
      remainingDuration *= 0.4;
      
      tasks.push({
        title: "Practice Problems",
        description: "Apply concepts to solve problems",
        duration: Math.floor(remainingDuration * 0.8)
      });
      remainingDuration *= 0.2;
      
      tasks.push({
        title: "Quick Review",
        description: "Summarize what you've learned",
        duration: Math.floor(remainingDuration)
      });
    } else if (dayType === "review") {
      tasks.push({
        title: "Comprehensive Review",
        description: "Review all topics covered so far",
        duration: Math.floor(remainingDuration * 0.7)
      });
      
      tasks.push({
        title: "Knowledge Gap Assessment",
        description: "Identify areas needing more focus",
        duration: Math.floor(remainingDuration * 0.3)
      });
    } else {
      tasks.push({
        title: "Practice Exam",
        description: "Complete a full practice exam under timed conditions",
        duration: Math.floor(remainingDuration * 0.8)
      });
      
      tasks.push({
        title: "Exam Review",
        description: "Review answers and identify weak areas",
        duration: Math.floor(remainingDuration * 0.2)
      });
    }
    
    schedule.push({
      date: date.toISOString(),
      type: dayType,
      tasks
    });
  }
  
  // Create milestones
  const milestones = [
    {
      title: "Complete Topic 1 Mastery",
      date: addDays(startDate, 3).toISOString()
    },
    {
      title: "First Practice Exam",
      date: addDays(startDate, 6).toISOString()
    },
    {
      title: "Complete All Topics Review",
      date: addDays(startDate, 10).toISOString()
    }
  ];
  
  // Create achievements
  const achievements = [
    "3-Day Study Streak",
    "First Practice Exam Completed",
    "Knowledge Map 50% Explored"
  ];
  
  // Create knowledge map
  const generatedKnowledgeMap = knowledgeMap || 
    `Topic 1
├── Subtopic 1.1
│   ├── Concept A
│   └── Concept B
└── Subtopic 1.2
    ├── Concept C
    └── Concept D

Topic 2
├── Subtopic 2.1
└── Subtopic 2.2

Topic 3
├── Subtopic 3.1
└── Subtopic 3.2`;

  // Create complex topics
  const complexTopics = [
    {
      title: "Concept B",
      reason: "This concept builds on advanced prerequisite knowledge and has many applications."
    },
    {
      title: "Subtopic 2.2",
      reason: "This subtopic contains the most commonly tested material on the exam."
    }
  ];
  
  return {
    startDate,
    schedule,
    milestones,
    achievements,
    knowledgeMap: generatedKnowledgeMap,
    complexTopics
  };
}