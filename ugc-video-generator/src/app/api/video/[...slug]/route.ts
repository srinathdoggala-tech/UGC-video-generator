import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Readable } from 'stream';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const filename = path.basename(slug.join('/'));
    
    // Look in persistent storage directories
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'generated-videos', filename),
      path.join(os.tmpdir(), 'ugc-generated-videos', filename),
    ];

    let filePath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }
    
    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = request.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      const webStream = Readable.toWeb(fileStream);

      const head: Record<string, string> = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': 'video/mp4',
      };
      return new Response(webStream as any, { status: 206, headers: head });
    }

    const head: Record<string, string> = {
      'Content-Length': fileSize.toString(),
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    };
    const fileStream = fs.createReadStream(filePath);
    const webStream = Readable.toWeb(fileStream);
    return new Response(webStream as any, { status: 200, headers: head });
  } catch (error) {
    console.error('Video serving error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}