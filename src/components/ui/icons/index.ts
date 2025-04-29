'use client';

import {
  ArrowRight,
  Check,
  ChevronsUpDown,
  Circle,
  Copy,
  Edit,
  ExternalLink,
  File,
  HelpCircle,
  Home,
  Loader2,
  Mail,
  MessageSquare,
  Moon,
  Plus,
  PlusCircle,
  Search,
  Server,
  Settings,
  Share2,
  Shield,
  Sun,
  Trash,
  User,
  Workflow,
  Upload,
  FileText,
  Presentation,
  Redo as RedoIcon,
  BarChart as BarChartIcon,
  GraduationCap as GraduationCapIcon,
  X
} from 'lucide-react';

/**
 * Icon component type definition
 */
export type IconComponent = React.ComponentType<{
  className?: string;
  size?: number;
  strokeWidth?: number;
}>;

/**
 * Available icons in the application
 */
export const Icons: Record<string, IconComponent> = {
  // Navigation
  arrowRight: ArrowRight,
  chevronDown: ChevronsUpDown,
  home: Home,
  search: Search,
  
  // Actions
  check: Check,
  close: X,
  copy: Copy,
  edit: Edit,
  plus: Plus,
  plusCircle: PlusCircle,
  redo: RedoIcon,
  trash: Trash,
  upload: Upload,
  
  // UI Elements
  circle: Circle,
  loader: Loader2,
  spinner: Loader2,
  
  // Theme
  dark: Moon,
  light: Sun,
  
  // Content
  file: File,
  fileText: FileText,
  presentation: Presentation,
  workflow: Workflow,
  
  // Communication
  mail: Mail,
  messageSquare: MessageSquare,
  share: Share2,
  
  // User Interface
  externalLink: ExternalLink,
  help: HelpCircle,
  server: Server,
  settings: Settings,
  shield: Shield,
  user: User,
  
  // Education
  barChart: BarChartIcon,
  graduationCap: GraduationCapIcon,
};

/**
 * Icon component props
 */
export interface IconProps {
  name: keyof typeof Icons;
  className?: string;
  size?: number;
  strokeWidth?: number;
}

/**
 * Icon component that renders the specified icon
 */
export const Icon: React.FC<IconProps> = ({
  name,
  className = '',
  size = 24,
  strokeWidth = 2,
}) => {
  const IconComponent = Icons[name];
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  
  return (
    <IconComponent
      className={className}
      size={size}
      strokeWidth={strokeWidth}
    />
  );
}; 