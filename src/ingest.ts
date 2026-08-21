import * as fs from 'fs';
import { NoteItem } from './types';

export function parseRawContent(rawText: string, targetHandle?: string): { body: string; quoted?: { author_name: string; author_handle: string; content: string } } {
  // Normalize line endings
  const lines = rawText.split('\n').map(l => l.trim());
  
  // Filter out leading author name and relative time (e.g. "Murali Krishnan", "2h", "1d", "7d")
  let startIndex = 0;
  while (startIndex < lines.length) {
    const line = lines[startIndex];
    const isTimeLine = /^[0-9]+[hdmw]$/i.test(line);
    const isAuthorLine = line.length > 0 && !line.includes('#') && line.split(' ').length <= 4;
    
    if (!line || isTimeLine || (startIndex <= 1 && isAuthorLine)) {
      startIndex++;
    } else {
      break;
    }
  }

  const remainingText = lines.slice(startIndex).join('\n').trim();

  // Check if there is a quoted user block
  const doubleNewlineSplit = remainingText.split(/\n\n+/);
  
  if (doubleNewlineSplit.length >= 2) {
    const potentialQuoteHeader = doubleNewlineSplit[doubleNewlineSplit.length - 2] || '';
    const potentialQuoteContent = doubleNewlineSplit[doubleNewlineSplit.length - 1] || '';
    
    if (/[A-Z][a-z]+ [A-Z][a-z]+/.test(potentialQuoteHeader) && potentialQuoteContent.length > 10) {
      const mainBody = doubleNewlineSplit.slice(0, doubleNewlineSplit.length - 2).join('\n\n').trim();
      return {
        body: mainBody || remainingText,
        quoted: {
          author_name: potentialQuoteHeader,
          author_handle: potentialQuoteHeader.toLowerCase().replace(/\s+/g, ''),
          content: potentialQuoteContent
        }
      };
    }
  }

  return { body: remainingText };
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_]+/g) || [];
  return Array.from(new Set(matches));
}

export function ingestRawInventory(rawFilePath: string, targetHandle?: string): NoteItem[] {
  if (!fs.existsSync(rawFilePath)) {
    throw new Error(`File not found: ${rawFilePath}`);
  }

  const rawData = JSON.parse(fs.readFileSync(rawFilePath, 'utf-8'));
  const notesMap = new Map<string, NoteItem>();

  for (const item of rawData) {
    const url: string = item.url || '';
    const rawText: string = item.content || item.rawText || '';
    
    if (!url || !rawText) continue;

    // Extract Note ID from URL (e.g., https://substack.com/@username/note/c-319089287)
    const idMatch = url.match(/note\/(c-[0-9a-zA-Z]+)/);
    const noteId = idMatch ? idMatch[1] : `note-${notesMap.size + 1}`;

    const { body, quoted } = parseRawContent(rawText, targetHandle);
    const hashtags = extractHashtags(rawText);

    // Extract handle from URL if present
    const urlHandleMatch = url.match(/@([a-zA-Z0-9_]+)/);
    const detectedHandle = urlHandleMatch ? urlHandleMatch[1] : (targetHandle || 'user');
    const authorName = detectedHandle;

    const noteItem: NoteItem = {
      id: noteId,
      url: url,
      author: {
        name: authorName,
        handle: detectedHandle,
      },
      content: {
        raw: rawText,
        body: body,
        hashtags: hashtags,
      },
      is_restack: Boolean(quoted),
      quoted_note: quoted ? {
        author_name: quoted.author_name,
        author_handle: quoted.author_handle,
        content: quoted.content,
        url: url
      } : undefined,
      status: 'PUBLISHED',
      tags: hashtags.map(h => h.replace('#', '')),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!notesMap.has(noteId)) {
      notesMap.set(noteId, noteItem);
    }
  }

  return Array.from(notesMap.values());
}
