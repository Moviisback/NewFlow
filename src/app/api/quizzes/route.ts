import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch quizzes from database
    const quizzes = [
      { id: 1, title: 'Quiz 1', mode: 'preparation', completedSections: 3, totalSections: 5, score: 85 },
      { id: 2, title: 'Quiz 2', mode: 'exam', score: 92, questionCount: 20, timeTaken: '15:42' },
      { id: 3, title: 'Quiz 3', mode: 'preparation', completedSections: 8, totalSections: 8, score: 78 },
    ];

    return NextResponse.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json({ message: 'Error fetching quizzes' }, { status: 500 });
  }
}