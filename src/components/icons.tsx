'use client';

import {  Home, Sun, Moon, LogOut, Menu, ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Bell, X, Plus } from 'lucide-react';

interface IconProps {
  className?: string;
}

export const MenuIcon = ({ className }: IconProps) => (
  <Menu className={className} />
);

export const ArrowLeftIcon = ({ className }: IconProps) => (
  <ArrowLeft className={className} />
);

export const ArrowRightIcon = ({ className }: IconProps) => (
  <ArrowRight className={className} />
);

export const CheckIcon = ({ className }: IconProps) => (
  <Check className={className} />
);

export const ChevronDownIcon = ({ className }: IconProps) => (
  <ChevronDown className={className} />
);

export const ChevronUpIcon = ({ className }: IconProps) => (
  <ChevronUp className={className} />
);

export const LogOutIcon = ({ className }: IconProps) => (
  <LogOut className={className} />
);

export const BellIcon = ({ className }: IconProps) => (
  <Bell className={className} />
);

export const XIcon = ({ className }: IconProps) => <X className={className} />;

export const PlusIcon = ({ className }: IconProps) => (
  <Plus className={className} />
);


const Icons = {
  Menu: MenuIcon,
  ArrowLeft: ArrowLeftIcon,
  ArrowRight: ArrowRightIcon,
  Check: CheckIcon,
  ChevronDown: ChevronDownIcon,
  ChevronUp: ChevronUpIcon,
  LogOut: LogOutIcon,
  Bell: BellIcon,
  X: XIcon,
  Plus: PlusIcon,
};

export { Icons };
