'use client';

import Link from 'next/link';
import { User, Home, FileText, GraduationCap, BarChart, Calendar, ChevronDown, LucideIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useTransition, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ProfileSettings from '@/components/profile-settings';
import { useRouter } from 'next/navigation';

// Typed debounce function
const useDebounce = <T extends (...args: any[]) => any>(fn: T, delay: number): ((...args: Parameters<T>) => void) => {
  let timer: NodeJS.Timeout | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  // Check if current path is part of the study tools group
  const isInStudyTools = ['/documents', '/quizzes', '/studyplan'].includes(pathname);

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };

      // Initial check
      checkMobile();

      // Add debounced event listener for window resize for better performance
      const debouncedResize = useDebounce(checkMobile, 200);
      window.addEventListener('resize', debouncedResize);

      // Cleanup
      return () => window.removeEventListener('resize', debouncedResize);
    }
  }, []);

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
    { href: '/documents', label: 'Documents', mobileLabel: 'Docs', icon: FileText },
    { href: '/quizzes', label: 'Quizzes', mobileLabel: 'Quizzes', icon: GraduationCap },
    { href: '/studyplan', label: 'StudyPlan', mobileLabel: 'Plan', icon: Calendar },
  ];

  // Top level navigation items for desktop and mobile (keeping consistent)
  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home, position: 'first', isPrimary: true },
    { 
      label: 'Study Tools', 
      isDropdown: true, 
      position: 'middle', 
      active: isInStudyTools,
      icon: FileText // Using FileText as the icon for the dropdown
    },
    { href: '/progress', label: 'Progress', icon: BarChart, position: 'last' },
  ];

  const handleNavigation = (href: string) => {
    handlePress(); // Haptic feedback
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
      <div className="bg-background border-b sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14">
          <Link href="/" className="flex items-center text-lg font-semibold" aria-label="StudyFlow">
            StudyFlow
          </Link>

          {/* Desktop navigation */}
          {!isMobile && (
            <div className="flex items-center space-x-6">
              {navItems.map((item, index) => {
                // For dropdown menu
                if (item.isDropdown) {
                  return (
                    <div key={`dropdown-${index}`} className="relative" ref={dropdownRef}>
                      <button
                        onClick={toggleDropdown}
                        onMouseEnter={() => setDropdownOpen(true)}
                        className={`flex items-center space-x-1 hover:text-primary transition-colors duration-200 ${
                          item.active ? 'text-primary font-medium' : 'text-muted-foreground'
                        }`}
                        aria-expanded={dropdownOpen}
                        aria-label="Study Tools Menu"
                      >
                        <span>{item.label}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {/* Dropdown menu */}
                      {dropdownOpen && (
                        <div 
                          className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                          onMouseLeave={() => setDropdownOpen(false)}
                        >
                          <div className="py-1" role="menu" aria-orientation="vertical">
                            {studyToolsItems.map((subItem) => {
                              const SubIcon: LucideIcon = subItem.icon;
                              const isActive = pathname === subItem.href;
                              return (
                                <button
                                  key={subItem.href}
                                  onClick={() => handleNavigation(subItem.href)}
                                  className={`flex items-center px-4 py-2 text-sm w-full text-left ${
                                    isActive ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                                  role="menuitem"
                                >
                                  <subItem.icon className="h-4 w-4 mr-2" />
                                  {subItem.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                
                // For regular nav items
                
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={item.label}
                    className={`hover:text-primary transition-colors duration-200 ${
                      isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                    } ${item.isPrimary ? 'bg-primary/10 px-3 py-1 rounded-lg' : ''}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <button
                    className="inline-flex items-center justify-center rounded-full p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                    aria-label="Profile"
                  >
                    <User className="h-5 w-5" />
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <ProfileSettings />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation for mobile */}
      {isMobile && (
        <div className="bg-background border-t fixed bottom-0 left-0 right-0 z-50 shadow-lg">
          <div className="flex items-center justify-around h-16">
            {/* Home/Dashboard button */}
            <button
              onClick={() => handleNavigation('/')}
              onTouchStart={handlePress}
              aria-current={pathname === '/' ? 'page' : undefined}
              aria-label="Dashboard"
              className={`flex flex-col items-center justify-center w-1/4 text-xs py-1 
                ${pathname === '/' ? 'text-primary font-medium' : 'text-muted-foreground'}
                transition-all duration-200 ${pathname === '/' ? '' : 'hover:scale-105 active:scale-95'}`}
            >
              <Home
                className={`h-5 w-5 mb-1 
                  ${pathname === '/' ? 'text-primary' : 'text-muted-foreground'}
                  ${isPending && pathname !== '/' ? 'opacity-50' : 'opacity-100'}`}
              />
              <span className={pathname === '/' ? 'font-medium' : ''}>Dashboard</span>
              {pathname === '/' && <div className="w-1/2 h-1 bg-primary rounded-full mt-1"></div>}
            </button>

            {/* Study Tools Dropdown for Mobile */}
            <div className="relative w-1/4" ref={mobileDropdownRef}>
              <button
                onClick={toggleMobileDropdown}
                onTouchStart={handlePress}
                aria-expanded={mobileDropdownOpen}
                aria-label="Study Tools"
                className={`flex flex-col items-center justify-center w-full text-xs py-1
                  ${isInStudyTools ? 'text-primary font-medium' : 'text-muted-foreground'}
                  transition-all duration-200 ${isInStudyTools ? '' : 'hover:scale-105 active:scale-95'}`}
              >
                <FileText
                  className={`h-5 w-5 mb-1 
                    ${isInStudyTools ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <div className="flex items-center">
                  <span className={isInStudyTools ? 'font-medium' : ''}>Tools</span>
                  <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${mobileDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
                {isInStudyTools && <div className="w-1/2 h-1 bg-primary rounded-full mt-1"></div>}
              </button>
              
              {/* Mobile dropdown menu */}
              {mobileDropdownOpen && (
                <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                     {studyToolsItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isActive = pathname === subItem.href;
                      return (
                        <button
                          key={subItem.href}
                          onClick={() => handleNavigation(subItem.href)}
                          className={`flex items-center px-4 py-2 text-sm w-full text-left ${
                            isActive ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          role="menuitem"
                        >
                           <subItem.icon className="h-4 w-4 mr-2" />
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
              className={`flex flex-col items-center justify-center w-1/4 text-xs py-1 
                ${pathname === '/progress' ? 'text-primary font-medium' : 'text-muted-foreground'}
                transition-all duration-200 ${pathname === '/progress' ? '' : 'hover:scale-105 active:scale-95'}`}
            >
              <BarChart
                className={`h-5 w-5 mb-1 
                  ${pathname === '/progress' ? 'text-primary' : 'text-muted-foreground'}
                  ${isPending && pathname !== '/progress' ? 'opacity-50' : 'opacity-100'}`}
              />
              <span className={pathname === '/progress' ? 'font-medium' : ''}>Progress</span>
              {pathname === '/progress' && <div className="w-1/2 h-1 bg-primary rounded-full mt-1"></div>}
            </button>

            {/* Profile Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button
                  className="flex flex-col items-center justify-center w-1/4 text-xs py-1 transition-all duration-200 hover:scale-105 active:scale-95"
                  aria-label="Profile"
                  onTouchStart={handlePress}
                >
                  <User className="h-5 w-5 mb-1 text-muted-foreground" />
                  <span>Profile</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <ProfileSettings />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* Add padding to the bottom when on mobile to prevent content from being hidden behind nav */}
      {isMobile && <div className="h-16" />}
    </>
  );
};

export default Navigation;
