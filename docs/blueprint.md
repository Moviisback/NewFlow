# **App Name**: StudyFlow

## Core Features:

- Document Upload: Displays an upload area for study documents with drag and drop functionality.
- Progress Overview: Displays key progress metrics such as documents uploaded, quizzes taken, average score, and weak areas in a card format.
- Recent Documents Table: Presents a table of recently uploaded documents with details like name, upload date, pages, and status.
- Learning Progress Charts: Visualizes learning progress through quiz performance (bar chart) and topic mastery (donut chart).
- AI Document Analysis: Analyzes uploaded documents using an AI tool to identify key topics and generate summaries.

## Style Guidelines:

- Background: White (#FFFFFF).
- Primary text: Dark gray/black (#333333).
- Accent colors: Blue (#4285F4) for buttons and charts.
- Secondary accents: Light pastels for charts (light blue, orange, teal, purple).
- Accent: A light shade of green (#90EE90) to indicate successful uploads.
- Consistent spacing and padding throughout the dashboard.
- Organized in vertical sections with clear visual separation and generous whitespace.
- Cloud upload icon in light gray for the document upload section.
- Subtle hover states for buttons and table rows.

## Original User Request:
# StudyFlow Dashboard Design Specification

## Overall Design
Create a clean, minimalist dashboard interface for StudyFlow with the following specifications:

## Color Scheme & Typography
- Background: White (#FFFFFF)
- Primary text: Dark gray/black (#333333)
- Accent colors: Blue (#4285F4) for buttons and charts
- Secondary accents: Light pastels for charts (light blue, orange, teal, purple)
- Font: Modern sans-serif (like Inter, Roboto, or SF Pro)
- Consistent spacing and padding throughout

## Header/Navigation
- Top navigation bar with light gray/white background
- Left side: StudyFlow logo (cube icon) with "StudyFlow" text
- Right side: Navigation menu with tabs for "Dashboard", "Documents", "Quizzes", "Progress", "Mistakes"
- Active tab should be subtly highlighted
- Far right: User profile icon/bell notification

## Main Dashboard Layout
- Clear "Dashboard" page title at the top of content area
- Generous whitespace between sections
- Organized in vertical sections with clear visual separation

## Document Upload Section
- Prominent upload area with dashed border
- Cloud upload icon in light gray 
- "Click to upload or drag and drop" instruction text
- Small text indicating supported file types (PDF, DOC, DOCX, TXT, MAX: 20MB)
- "Upload a Document" section title in bold
- Descriptive text: "Upload your study documents to get started. We'll analyze them and create study materials."

## Progress Overview Cards
- Section titled "Your Progress"
- Four equal-sized cards in a horizontal row
- Each card with:
  - Icon on left (document, quiz, score, or weak areas icon)
  - Title (Documents, Quizzes Taken, Average Score, Weak Areas)
  - Large number indicating current stat
  - Light background with subtle border

## Recent Documents Table
- Section titled "Recent Documents" with "View all" link on right
- Clean table with columns:
  - Document Name
  - Date Uploaded
  - Pages
  - Status
  - Actions
- Empty state message when no documents: "No documents found. Upload one to get started!"

## Learning Progress Section
- Section titled "Learning Progress"
- Two equal cards side by side:
  1. Quiz Performance card:
     - Bar chart showing performance across quizzes (Quiz 1-5)
     - Y-axis showing percentage (0-100%)
     - Blue bars for each quiz result
     - Clear labels and legend
  
  2. Topics Mastery card:
     - Donut/ring chart showing topic distribution
     - Each topic in different color with percentage
     - Topic labels (Neural Networks, Machine Learning, Data Preprocessing, etc.)
     - Clean legend with colors matching chart segments

## Footer
- Light gray text
- Copyright information: "© 2025 StudyFlow. All rights reserved."
- Links for Terms, Privacy, Help

## Responsive Behavior
- Cards should stack vertically on smaller screens
- Tables should become scrollable horizontally on mobile
- Upload area should adjust to screen width
- Charts should resize appropriately for smaller screens

## Interactive Elements
- Upload area should highlight when dragging files over it
- Buttons should have subtle hover states
- Table rows should have hover state
- Navigation items should indicate active/hover states clearly

This dashboard should feel intuitive, clean, and focused on helping students track their learning progress while making it easy to upload new study materials.

  