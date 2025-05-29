// components/documents/DetailLevelSlider.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DetailLevel,
  getDetailLevelDescription,
} from '@/types/summaryOptions';

interface DetailLevelSliderProps {
  value: DetailLevel;
  onChange: (value: DetailLevel) => void;
  disabled?: boolean;
  originalDocumentWordCount: number;
  actualGeneratedSummaryWordCount?: number;
}

const levelToPercentage: Record<DetailLevel, number> = {
  brief: 15,
  standard: 25,
  detailed: 45,
  comprehensive: 60,
  complete: 80,
};

const sortedDetailLevels = (Object.keys(levelToPercentage) as DetailLevel[]).sort(
  (a, b) => levelToPercentage[a] - levelToPercentage[b]
);

const MIN_SLIDER_PERCENTAGE = levelToPercentage[sortedDetailLevels[0]];
const MAX_SLIDER_PERCENTAGE = levelToPercentage[sortedDetailLevels[sortedDetailLevels.length - 1]];

const DetailLevelSlider: React.FC<DetailLevelSliderProps> = ({
  value: currentActiveLevel, // Renamed prop for clarity: this is the active/target level
  onChange,
  disabled = false,
  originalDocumentWordCount,
  actualGeneratedSummaryWordCount,
}) => {
  // Track whether user is actively dragging the slider
  const [isDragging, setIsDragging] = useState(false);
  // Track user drag position separately to avoid jumps
  const [userDragPosition, setUserDragPosition] = useState<number | null>(null);

  // Reset userDragPosition when the component props change but not during dragging
  useEffect(() => {
    if (!isDragging) {
      setUserDragPosition(null);
    }
  }, [currentActiveLevel, isDragging]);

  // sliderThumbPositionPercentage determines where the slider's thumb is visually shown.
  // When dragging: use the user's drag position
  // When not dragging: use actual summary percentage if available, otherwise target percentage
  const sliderThumbPositionPercentage = useMemo(() => {
    // If user is actively dragging, respect their drag position for smooth experience
    if (isDragging && userDragPosition !== null) {
      return userDragPosition;
    }
    
    // If there's real summary data, show that
    if (actualGeneratedSummaryWordCount !== undefined && originalDocumentWordCount > 0) {
      const actualPercentage = (actualGeneratedSummaryWordCount / originalDocumentWordCount) * 100;
      // Clamp the value within slider's min/max
      return Math.max(MIN_SLIDER_PERCENTAGE, Math.min(MAX_SLIDER_PERCENTAGE, actualPercentage));
    }
    
    // Fallback: show the target percentage for the current level
    return levelToPercentage[currentActiveLevel];
  }, [
    actualGeneratedSummaryWordCount, 
    originalDocumentWordCount, 
    currentActiveLevel,
    isDragging,
    userDragPosition
  ]);

  // Helper to determine the DetailLevel based on a percentage (slider position)
  const getLevelFromSliderPosition = useCallback((percentage: number): DetailLevel => {
    // Find the closest level to the dragged percentage
    let closestLevel = sortedDetailLevels[0];
    let smallestDiff = Infinity;

    for (const level of sortedDetailLevels) {
      const diff = Math.abs(percentage - levelToPercentage[level]);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestLevel = level;
      }
    }
    
    // For more precise mapping when dragging
    for (let i = 0; i < sortedDetailLevels.length - 1; i++) {
      const currentLevel = sortedDetailLevels[i];
      const nextLevel = sortedDetailLevels[i + 1];
      const midpoint = (levelToPercentage[currentLevel] + levelToPercentage[nextLevel]) / 2;
      
      if (percentage < midpoint) {
        return currentLevel;
      }
    }
    
    return sortedDetailLevels[sortedDetailLevels.length - 1]; // Return highest level if beyond all midpoints
  }, []);

  const handleSliderDrag = (newThumbPositions: number[]) => {
    if (disabled) return;
    
    const newSliderPosPercent = newThumbPositions[0];
    setUserDragPosition(newSliderPosPercent);
    setIsDragging(true);
    
    const newTargetLevel = getLevelFromSliderPosition(newSliderPosPercent);
    if (newTargetLevel !== currentActiveLevel) {
      onChange(newTargetLevel);
    }
  };

  // Handle drag end to reset state
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handlePresetClick = (level: DetailLevel) => {
    if (disabled) return;
    setUserDragPosition(null);
    if (level !== currentActiveLevel) {
      onChange(level);
    }
  };

  // Determine the percentage and word count to display to the user
  const displayPercentage = useMemo(() => {
    if (isDragging && userDragPosition !== null) {
      return Math.round(userDragPosition);
    }
    
    if (actualGeneratedSummaryWordCount !== undefined && originalDocumentWordCount > 0) {
      return Math.round((actualGeneratedSummaryWordCount / originalDocumentWordCount) * 100);
    }
    
    // Fallback: Show the target percentage of the current active level
    return Math.round(levelToPercentage[currentActiveLevel]);
  }, [
    actualGeneratedSummaryWordCount,
    originalDocumentWordCount,
    currentActiveLevel,
    isDragging,
    userDragPosition
  ]);

  const displayWords = useMemo(() => {
    if (isDragging && userDragPosition !== null) {
      // When dragging, show estimated word count based on drag position
      return Math.round(originalDocumentWordCount * (userDragPosition / 100));
    }
    
    if (actualGeneratedSummaryWordCount !== undefined) {
      return actualGeneratedSummaryWordCount;
    }
    
    // Fallback: Estimate words based on the target percentage of the current active level
    return Math.round(originalDocumentWordCount * (levelToPercentage[currentActiveLevel] / 100));
  }, [
    actualGeneratedSummaryWordCount,
    originalDocumentWordCount,
    currentActiveLevel,
    isDragging,
    userDragPosition
  ]);

  const readingTimeMinutes = Math.ceil(displayWords / 238); // Average reading speed
  const readingTime = readingTimeMinutes < 1 ? '< 1 min' : `${readingTimeMinutes} min`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="detail-level-slider" className="text-base font-medium text-gray-800 dark:text-gray-200">
          Summary Length
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">
            {displayPercentage}%
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ~{displayWords.toLocaleString()} words
          </span>
        </div>
      </div>

      <div className="relative pt-8">
        <Slider
          id="detail-level-slider"
          value={[sliderThumbPositionPercentage]} // Slider thumb reflects current position
          min={MIN_SLIDER_PERCENTAGE}
          max={MAX_SLIDER_PERCENTAGE}
          step={1}
          onValueChange={handleSliderDrag} // User dragging updates the drag position
          onValueCommit={handleDragEnd} // Handle when dragging ends
          disabled={disabled}
          className="w-full"
        />

        <div className="mt-3 grid grid-cols-5 gap-x-2">
          {sortedDetailLevels.map((level) => {
            // A preset button is "active" if the `currentActiveLevel` (from props) matches it
            const isActive = currentActiveLevel === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => handlePresetClick(level)}
                disabled={disabled}
                className={`
                  flex flex-col items-center justify-start text-center py-1 px-1 rounded-md
                  transition-all duration-150 ease-in-out
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-opacity-75
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}
                `}
              >
                <div className="w-px h-2 mb-1 bg-gray-300 dark:bg-gray-600 group-hover:bg-indigo-500"></div>
                <span
                  className={`text-xs ${
                    isActive
                      ? 'font-semibold text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-500 dark:text-gray-400'
                  } capitalize`}
                >
                  {level}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentActiveLevel} // Animation triggers when the active level changes
          className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-base capitalize text-gray-900 dark:text-gray-100">
                {currentActiveLevel}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {getDetailLevelDescription(currentActiveLevel)} (Target: ~{levelToPercentage[currentActiveLevel]}% of original)
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5 bg-white dark:bg-gray-700 shadow-sm rounded-full px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300">
              <Clock className="h-3.5 w-3.5" />
              <span>{readingTime}</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DetailLevelSlider;