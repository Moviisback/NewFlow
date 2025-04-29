import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Replace this with your actual logic to fetch quizzes
    const quizzes = [
      { id: 1, title: 'Quiz 1' },
      { id: 2, title: 'Quiz 2' },
      { id: 3, title: 'Quiz 3' },
    ];

    return NextResponse.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json({ message: 'Error fetching quizzes' }, { status: 500 });
  }
}