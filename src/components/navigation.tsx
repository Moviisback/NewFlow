'use client';

import Link from 'next/link';
import { Home, FileText as FileTextIcon, GraduationCap, BarChart, Calendar, ChevronDown, Book } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ProfileMenu from './ProfileMenu';
import { useIsMobile } from '@/hooks/use-mobile';

// Type definitions
type NavItemBase = {
  label: string;
  position: 'first' | 'middle' | 'last';
  icon?: React.ElementType;
};

type NavLinkItem = NavItemBase & {
  href: string;
  isDropdown?: false;
  isPrimary?: boolean;
  active?: never;
};

type NavDropdownItem = NavItemBase & {
  href?: never;
  isDropdown: true;
  active: boolean;
  isPrimary?: never;
};

type NavItem = NavLinkItem | NavDropdownItem;

// Typed debounce function
const useDebounce = <T extends (...args: any[]) => any>(fn: T, delay: number): ((...args: Parameters<T>) => void) => {
  let timer: NodeJS.Timeout | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const StudieNavigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  // Check if current path is part of the study tools group
  const isInStudyTools = ['/documents', '/quizzes', '/studyplan'].some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(event.target as Node)) {
        setMobileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef, mobileDropdownRef]);

  // Haptic feedback function for mobile
  const handlePress = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  // Study tools submenu items - used in both mobile and desktop
  const studyToolsItems = [
    { href: '/documents', label: 'Documents', mobileLabel: 'Docs', icon: FileTextIcon },
    { href: '/quizzes', label: 'Quizzes', mobileLabel: 'Quizzes', icon: GraduationCap },
    { href: '/studyplan', label: 'StudyPlan', mobileLabel: 'Plan', icon: Calendar },
  ];

  const handleNavigation = (href: string) => {
    handlePress();
    startTransition(() => {
      router.push(href);
      setDropdownOpen(false);
      setMobileDropdownOpen(false);
    });
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const toggleMobileDropdown = () => {
    setMobileDropdownOpen(!mobileDropdownOpen);
  };

  return (
    <>
      {/* Top bar for logo and app name */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 shadow-sm">
        <div className="container flex items-center justify-between h-14">
          <Link href="/" className="flex items-center text-lg font-semibold text-blue-600 dark:text-blue-400" aria-label="StudieMaterials">
            <div className="w-8 h-8 bg-blue-600 dark:bg-blue-700 rounded mr-2 flex items-center justify-center">
              <Book className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="block text-blue-600 dark:text-blue-400 font-bold">StudieMaterials</span>
              <span className="block text-[10px] text-gray-500 dark:text-gray-400 -mt-1 font-normal">Smart Summaries & Study Tools</span>
            </div>
          </Link>

          {/* Desktop navigation */}
          {!isMobile && (
            <div className="flex items-center space-x-6">
              <Link
                href="/"
                prefetch={true}
                aria-current={pathname === '/' ? 'page' : undefined}
                aria-label="Dashboard"
                className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 ${
                  pathname === '/' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300'
                } ${pathname === '/' ? 'bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg' : ''}`}
              >
                Dashboard
              </Link>
              
              {/* Study Tools Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={toggleDropdown}
                  onMouseEnter={() => setDropdownOpen(true)}
                  className={`flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 ${
                    isInStudyTools ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300'
                  }`}
                  aria-expanded={dropdownOpen}
                  aria-label="Study Tools Menu"
                >
                  <span>Study Tools</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div
                    className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-700 focus:outline-none z-50"
                    onMouseLeave={() => setDropdownOpen(false)}
                  >
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      {studyToolsItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isActiveSub = pathname === subItem.href || pathname.startsWith(`${subItem.href}/`);
                        return (
                          <button
                            key={subItem.href}
                            onClick={() => handleNavigation(subItem.href)}
                            className={`flex items-center px-4 py-2 text-sm w-full text-left ${
                              isActiveSub ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                            role="menuitem"
                          >
                            {SubIcon && <SubIcon className="h-4 w-4 mr-2" />}
                            {subItem.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <Link
                href="/progress"
                prefetch={true}
                aria-current={pathname === '/progress' ? 'page' : undefined}
                aria-label="Progress"
                className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 ${
                  pathname === '/progress' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300'
                } ${pathname === '/progress' ? 'bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg' : ''}`}
              >
                Progress
              </Link>
              
              {/* Add ProfileMenu component */}
              <ProfileMenu />
            </div>
          )}
          
          {/* Only show ProfileMenu on mobile when not in mobile nav */}
          {isMobile && (
            <div className="flex items-center">
              <ProfileMenu />
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation for mobile */}
      {isMobile && (
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 fixed bottom-0 left-0 right-0 z-50 shadow-lg">
          <div className="flex items-center justify-around h-16">
            {/* Home/Dashboard button */}
            <button
              onClick={() => handleNavigation('/')}
              onTouchStart={handlePress}
              aria-current={pathname === '/' ? 'page' : undefined}
              aria-label="Dashboard"
              className={`flex flex-col items-center justify-center w-1/3 text-xs py-1
                ${pathname === '/' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400'}
                transition-all duration-200 ${pathname === '/' ? '' : 'hover:scale-105 active:scale-95'}`}
            >
              <Home
                className={`h-5 w-5 mb-1
                  ${pathname === '/' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}
                  ${isPending && pathname !== '/' ? 'opacity-50' : 'opacity-100'}`}
              />
              <span className={pathname === '/' ? 'font-medium' : ''}>Dashboard</span>
              {pathname === '/' && <div className="w-1/2 h-1 bg-blue-600 dark:bg-blue-500 rounded-full mt-1"></div>}
            </button>

            {/* Study Tools Dropdown for Mobile */}
            <div className="relative w-1/3" ref={mobileDropdownRef}>
              <button
                onClick={toggleMobileDropdown}
                onTouchStart={handlePress}
                aria-expanded={mobileDropdownOpen}
                aria-label="Study Tools"
                className={`flex flex-col items-center justify-center w-full text-xs py-1
                  ${isInStudyTools ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400'}
                  transition-all duration-200 ${isInStudyTools ? '' : 'hover:scale-105 active:scale-95'}`}
              >
                <FileTextIcon
                  className={`h-5 w-5 mb-1
                    ${isInStudyTools ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
                />
                <div className="flex items-center">
                  <span className={isInStudyTools ? 'font-medium' : ''}>Tools</span>
                  <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${mobileDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
                {isInStudyTools && <div className="w-1/2 h-1 bg-blue-600 dark:bg-blue-500 rounded-full mt-1"></div>}
              </button>

              {/* Mobile dropdown menu */}
              {mobileDropdownOpen && (
                <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-700 focus:outline-none z-50">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                     {studyToolsItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isActiveSub = pathname === subItem.href || pathname.startsWith(`${subItem.href}/`);
                      return (
                        <button
                          key={subItem.href}
                          onClick={() => handleNavigation(subItem.href)}
                          className={`flex items-center px-4 py-2 text-sm w-full text-left ${
                            isActiveSub ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                          role="menuitem"
                        >
                           {SubIcon && <SubIcon className="h-4 w-4 mr-2" />}
                          {subItem.mobileLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Progress button */}
            <button
              onClick={() => handleNavigation('/progress')}
              onTouchStart={handlePress}
              aria-current={pathname === '/progress' ? 'page' : undefined}
              aria-label="Progress"
              className={`flex flex-col items-center justify-center w-1/3 text-xs py-1
                ${pathname === '/progress' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400'}
                transition-all duration-200 ${pathname === '/progress' ? '' : 'hover:scale-105 active:scale-95'}`}
            >
              <BarChart
                className={`h-5 w-5 mb-1
                  ${pathname === '/progress' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}
                  ${isPending && pathname !== '/progress' ? 'opacity-50' : 'opacity-100'}`}
              />
              <span className={pathname === '/progress' ? 'font-medium' : ''}>Progress</span>
              {pathname === '/progress' && <div className="w-1/2 h-1 bg-blue-600 dark:bg-blue-500 rounded-full mt-1"></div>}
            </button>
          </div>
        </div>
      )}

      {/* Add padding to the bottom when on mobile to prevent content from being hidden behind nav */}
      {isMobile && <div className="h-16" />}
    </>
  );
};

export default StudieNavigation;