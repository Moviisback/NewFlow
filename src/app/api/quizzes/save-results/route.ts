import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { quizId, mode, documentId, score, answers, weakAreas, timeSpent } = await req.json();

    // Here you would save the results to your database
    // For now, we'll just return a success response

    return NextResponse.json({ 
      success: true, 
      message: 'Quiz results saved successfully',
      result: {
        id: quizId || Date.now(),
        mode,
        documentId,
        score,
        completedAt: new Date().toISOString(),
        weakAreas,
        timeSpent
      }
    });
  } catch (error) {
    console.error('Error saving quiz results:', error);
    return NextResponse.json({ error: 'Failed to save quiz results' }, { status: 500 });
  }
}