import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import DetailLevelSlider from '@/components/documents/DetailLevelSlider';
import {
  SummaryOptions,
  StudyPurpose,
  SubjectType,
  StudyFormat,
  KnowledgeLevel,
  DetailLevel,
  getStudyPurposeDescription,
  getSubjectTypeDescription,
  getStudyFormatDescription,
  getKnowledgeLevelDescription,
  getDetailLevelDescription,
  getMinLengthFromDetailLevel
} from '@/types/summaryOptions';

interface SummaryOptionsSelectorProps {
  options: SummaryOptions;
  onChange: (options: SummaryOptions) => void;
  onApply: () => void; // For applying changes
  isLoading?: boolean;
  originalDocumentWordCount: number;
  actualGeneratedSummaryWordCount?: number;
}

// SummaryOptionsSelector component allows customizing summary generation options
const SummaryOptionsSelector: React.FC<SummaryOptionsSelectorProps> = ({
  options,
  onChange,
  onApply,
  isLoading = false,
  originalDocumentWordCount,
  actualGeneratedSummaryWordCount
}) => {
  // Helper to update a specific option
  const updateOption = <K extends keyof SummaryOptions>(
    key: K,
    value: SummaryOptions[K]
  ) => {
    // Special handling for detailLevel - also update minLength
    if (key === 'detailLevel') {
      const detailLevel = value as DetailLevel;
      onChange({
        ...options,
        [key]: value,
        minLength: getMinLengthFromDetailLevel(detailLevel)
      });
    } else {
      onChange({
        ...options,
        [key]: value
      });
    }
  };

  return (
    <Card className="border-muted/60">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Study Purpose */}
          <div>
            <Label htmlFor="studyPurpose" className="text-sm mb-1">Study Purpose</Label>
            <Select
              value={options.studyPurpose}
              onValueChange={(value) => updateOption('studyPurpose', value as StudyPurpose)}
              disabled={isLoading}
            >
              <SelectTrigger id="studyPurpose" className="w-full">
                <SelectValue placeholder="Select purpose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="examPrep">Exam Preparation</SelectItem>
                <SelectItem value="conceptUnderstanding">Concept Understanding</SelectItem>
                <SelectItem value="quickReview">Quick Review</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {getStudyPurposeDescription(options.studyPurpose)}
            </p>
          </div>

          {/* Subject Type */}
          <div>
            <Label htmlFor="subjectType" className="text-sm mb-1">Subject Area</Label>
            <Select
              value={options.subjectType}
              onValueChange={(value) => updateOption('subjectType', value as SubjectType)}
              disabled={isLoading}
            >
              <SelectTrigger id="subjectType" className="w-full">
                <SelectValue placeholder="Select subject type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Academic</SelectItem>
                <SelectItem value="mathScience">Math & Natural Sciences</SelectItem>
                <SelectItem value="engineeringComputerScience">Engineering & Computer Science</SelectItem>
                <SelectItem value="humanitiesSocialSciences">Humanities & Social Sciences</SelectItem>
                <SelectItem value="lawMedicine">Law & Medicine</SelectItem>
                <SelectItem value="businessFinance">Business & Finance</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {getSubjectTypeDescription(options.subjectType)}
            </p>
          </div>

          {/* Study Format */}
          <div>
            <Label htmlFor="studyFormat" className="text-sm mb-1">Summary Format</Label>
            <Select
              value={options.studyFormat}
              onValueChange={(value) => updateOption('studyFormat', value as StudyFormat)}
              disabled={isLoading}
            >
              <SelectTrigger id="studyFormat" className="w-full">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Format</SelectItem>
                <SelectItem value="cornellNotes">Cornell Notes</SelectItem>
                <SelectItem value="mindMap">Mind Map Structure</SelectItem>
                <SelectItem value="flashcardPrep">Flashcard Preparation</SelectItem>
                <SelectItem value="definitionList">Definition List</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {getStudyFormatDescription(options.studyFormat)}
            </p>
          </div>

          {/* Knowledge Level */}
          <div>
            <Label htmlFor="knowledgeLevel" className="text-sm mb-1">Knowledge Level</Label>
            <Select
              value={options.knowledgeLevel}
              onValueChange={(value) => updateOption('knowledgeLevel', value as KnowledgeLevel)}
              disabled={isLoading}
            >
              <SelectTrigger id="knowledgeLevel" className="w-full">
                <SelectValue placeholder="Select knowledge level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="introductory">Introductory</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {getKnowledgeLevelDescription(options.knowledgeLevel)}
            </p>
          </div>

          {/* Detail Level - REPLACED WITH SLIDER */}
          <div className="md:col-span-2">
            <DetailLevelSlider
              value={options.detailLevel || 'standard'}
              onChange={(value) => updateOption('detailLevel', value)}
              disabled={isLoading}
              originalDocumentWordCount={originalDocumentWordCount}
              actualGeneratedSummaryWordCount={actualGeneratedSummaryWordCount}
            />
          </div>

          {/* Additional Options */}
          <div className="md:col-span-2 space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="includeExamples" className="text-sm">Include Examples</Label>
                <p className="text-xs text-muted-foreground">Add specific examples that clarify concepts</p>
              </div>
              <Switch
                id="includeExamples"
                checked={options.includeExamples}
                onCheckedChange={(value) => updateOption('includeExamples', value)}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="includeCitations" className="text-sm">Include Citations</Label>
                <p className="text-xs text-muted-foreground">Reference original sections/page numbers (if applicable)</p>
              </div>
              <Switch
                id="includeCitations"
                checked={options.includeCitations}
                onCheckedChange={(value) => updateOption('includeCitations', value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={onApply}
            disabled={isLoading}
            size="sm"
          >
            {isLoading ? 'Applying...' : 'Apply Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SummaryOptionsSelector;