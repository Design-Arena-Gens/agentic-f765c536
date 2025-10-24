import { NextRequest, NextResponse } from 'next/server';

interface VideoFrame {
  text: string;
  backgroundColor: string;
  textColor: string;
}

// SVG-based frame generation (works without canvas library)
function generateFrameSVG(
  text: string,
  frameNumber: number,
  totalFrames: number,
  colorScheme: { bg: string; text: string },
  isFirst: boolean
): string {
  const lines: string[] = [];
  const words = text.split(' ');
  let currentLine = '';
  const maxCharsPerLine = 45;

  // Simple word wrap
  for (const word of words) {
    if ((currentLine + word).length > maxCharsPerLine) {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  const textElements = lines.map((line, i) =>
    `<text x="640" y="${300 + i * 60}" font-size="40" fill="${colorScheme.text}" text-anchor="middle" font-family="Arial, sans-serif">${escapeXml(line)}</text>`
  ).join('\n');

  const titleElement = isFirst
    ? `<text x="640" y="120" font-size="60" fill="#fbbf24" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold">BREAKING NEWS</text>`
    : '';

  return `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
    <rect width="1280" height="720" fill="${colorScheme.bg}"/>
    <defs>
      <linearGradient id="grad${frameNumber}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:rgba(0,0,0,0.3);stop-opacity:1" />
        <stop offset="100%" style="stop-color:rgba(0,0,0,0.1);stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#grad${frameNumber})"/>
    ${titleElement}
    <line x1="200" y1="200" x2="1080" y2="200" stroke="#fbbf24" stroke-width="4"/>
    ${textElements}
    <text x="1200" y="680" font-size="30" fill="#fbbf24" text-anchor="end" font-family="Arial, sans-serif" font-weight="bold">${frameNumber}/${totalFrames}</text>
  </svg>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function POST(request: NextRequest) {
  try {
    const { text, title } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Split text into sentences for different frames
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const framesToCreate = Math.min(sentences.length, 6); // Max 6 frames

    // Generate frames as SVG data URLs
    const frames: string[] = [];
    const colors = [
      { bg: '#1e3a8a', text: '#ffffff' },
      { bg: '#0f172a', text: '#ffffff' },
      { bg: '#1e40af', text: '#ffffff' },
      { bg: '#312e81', text: '#ffffff' },
      { bg: '#1e293b', text: '#ffffff' },
      { bg: '#0c4a6e', text: '#ffffff' },
    ];

    for (let i = 0; i < framesToCreate; i++) {
      const colorScheme = colors[i % colors.length];
      const sentence = sentences[i]?.trim() || text.slice(0, 200);

      const svg = generateFrameSVG(
        sentence,
        i + 1,
        framesToCreate,
        colorScheme,
        i === 0
      );

      const base64 = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
      frames.push(base64);
    }

    // Generate frame data for client-side video creation
    const frameData = sentences.slice(0, framesToCreate).map((sentence: string, i: number) => ({
      text: sentence.trim(),
      color: colors[i % colors.length],
      isFirst: i === 0
    }));

    return NextResponse.json({
      frames,
      frameData,
      videoUrl: '#', // Will be generated client-side
      message: 'Video frames generated successfully'
    });

  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json({
      error: 'Failed to generate video. Please try again.'
    }, { status: 500 });
  }
}
