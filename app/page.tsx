'use client';

import { useState, useRef } from 'react';

interface FrameData {
  text: string;
  color: { bg: string; text: string };
  isFirst: boolean;
}

export default function Home() {
  const [newsUrl, setNewsUrl] = useState('');
  const [newsText, setNewsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');
  const [previewFrames, setPreviewFrames] = useState<string[]>([]);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchNews = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/fetch-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newsUrl }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setNewsText(data.text);
      }
    } catch (err) {
      setError('Failed to fetch news');
    } finally {
      setLoading(false);
    }
  };

  const createVideoFromFrames = async (frameData: FrameData[]) => {
    setGeneratingVideo(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d')!;

      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setGeneratingVideo(false);
      };

      mediaRecorder.start();

      // Render each frame
      for (let i = 0; i < frameData.length; i++) {
        const frame = frameData[i];
        const framesPerScene = 90; // 3 seconds at 30fps

        for (let f = 0; f < framesPerScene; f++) {
          // Background
          ctx.fillStyle = frame.color.bg;
          ctx.fillRect(0, 0, 1280, 720);

          // Gradient overlay
          const gradient = ctx.createLinearGradient(0, 0, 0, 720);
          gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
          gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 1280, 720);

          // Title (first frame only)
          if (frame.isFirst) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 60px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('BREAKING NEWS', 640, 120);
          }

          // Decorative line
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(200, 200);
          ctx.lineTo(1080, 200);
          ctx.stroke();

          // Main text with word wrap
          ctx.fillStyle = frame.color.text;
          ctx.font = '40px Arial';
          ctx.textAlign = 'center';

          const words = frame.text.split(' ');
          const lines: string[] = [];
          let currentLine = '';
          const maxWidth = 1100;

          for (const word of words) {
            const testLine = currentLine + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine !== '') {
              lines.push(currentLine);
              currentLine = word + ' ';
            } else {
              currentLine = testLine;
            }
          }
          lines.push(currentLine);

          const startY = 300;
          lines.forEach((line, index) => {
            ctx.fillText(line.trim(), 640, startY + (index * 60));
          });

          // Frame counter
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 30px Arial';
          ctx.textAlign = 'right';
          ctx.fillText(`${i + 1}/${frameData.length}`, 1200, 680);

          await new Promise(resolve => setTimeout(resolve, 33)); // ~30fps
        }
      }

      mediaRecorder.stop();
    } catch (err) {
      console.error('Video creation error:', err);
      setError('Failed to create video from frames');
      setGeneratingVideo(false);
    }
  };

  const generateVideo = async () => {
    setError('');
    setLoading(true);
    setVideoUrl('');
    setPreviewFrames([]);

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newsText,
          title: 'Breaking News'
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setPreviewFrames(data.frames || []);

        // Create video from frames
        if (data.frameData) {
          await createVideoFromFrames(data.frameData);
        }
      }
    } catch (err) {
      setError('Failed to generate video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">📰 News Video Maker</h1>
          <p className="text-xl text-gray-600">Transform news articles into engaging videos</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">Input News Content</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              News URL (Optional - for auto-fetching)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newsUrl}
                onChange={(e) => setNewsUrl(e.target.value)}
                placeholder="https://example.com/news-article"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={fetchNews}
                disabled={loading || !newsUrl}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Fetch
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              News Text
            </label>
            <textarea
              value={newsText}
              onChange={(e) => setNewsText(e.target.value)}
              placeholder="Enter or paste your news content here..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <button
            onClick={generateVideo}
            disabled={loading || !newsText || generatingVideo}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {loading || generatingVideo ? '🎬 Generating Video...' : '🎬 Generate Video'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {previewFrames.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 animate-fade-in">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Video Preview Frames</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {previewFrames.map((frame, index) => (
                <div key={index} className="border rounded-lg overflow-hidden shadow-md">
                  <img src={frame} alt={`Frame ${index + 1}`} className="w-full h-auto" />
                  <div className="p-2 bg-gray-50 text-center text-sm text-gray-600">
                    Frame {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {videoUrl && (
          <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Generated Video</h2>
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
              <video controls className="w-full h-full" src={videoUrl}>
                Your browser does not support the video tag.
              </video>
            </div>
            <a
              href={videoUrl}
              download="news-video.webm"
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              📥 Download Video
            </a>
          </div>
        )}

        <div className="mt-12 text-center text-gray-600">
          <p className="mb-2">✨ Features:</p>
          <div className="flex flex-wrap justify-center gap-4">
            <span className="px-4 py-2 bg-white rounded-full shadow">🎨 Auto-generated visuals</span>
            <span className="px-4 py-2 bg-white rounded-full shadow">📱 Responsive design</span>
            <span className="px-4 py-2 bg-white rounded-full shadow">🆓 100% free resources</span>
            <span className="px-4 py-2 bg-white rounded-full shadow">⚡ Fast rendering</span>
          </div>
        </div>
      </div>
    </main>
  );
}
