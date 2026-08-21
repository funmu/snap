import { loadConfig } from './auth';

export interface PublishNoteOptions {
  body: string;
  tags?: string[];
  dryRun?: boolean;
}

export function convertTextToProseMirrorDoc(text: string) {
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  
  return {
    type: "doc",
    content: paragraphs.map(p => ({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: p.trim()
        }
      ]
    }))
  };
}

export async function publishNoteToSubstack(options: PublishNoteOptions): Promise<{ success: boolean; message: string; noteId?: string }> {
  const { body, dryRun = true } = options;
  const config = loadConfig();
  const sessionToken = config.substack_session_id;

  const charCount = body.length;
  const hashtags = Array.from(body.matchAll(/#([a-zA-Z0-9_]+)/g)).map(m => '#' + m[1]);

  console.log(`\n📝 SNAP Note Publisher Preview`);
  console.log(`================================`);
  console.log(`Content:\n"${body}"\n`);
  console.log(`Length: ${charCount} chars ${charCount > 1000 ? '⚠️ (Exceeds ~1000 char recommended note length)' : '✅ (Within limit)'}`);
  console.log(`Hashtags: ${hashtags.join(', ') || 'None'}`);

  if (dryRun || !sessionToken) {
    console.log(`\n🔍 Mode: DRY RUN (No network request sent)`);
    if (!sessionToken) {
      console.log(`💡 Note: Substack session token not set. Run 'snap auth' to set up publishing.`);
    }

    const proseMirrorPayload = convertTextToProseMirrorDoc(body);
    console.log(`\n📦 ProseMirror API Payload representation:`);
    console.log(JSON.stringify(proseMirrorPayload, null, 2));

    return {
      success: true,
      message: 'Dry run completed successfully.',
    };
  }

  // Live Publishing Attempt via Substack API
  console.log(`\n🚀 Attempting live publication to Substack Notes via API...`);

  // Target endpoints for Substack Notes creation
  const targetUrls = [
    'https://substack.com/api/v1/comment/feed',
    'https://substack.com/api/v1/comment'
  ];
  if (config.substack_handle) {
    const cleanHandle = config.substack_handle.replace(/^@/, '');
    targetUrls.push(`https://${cleanHandle}.substack.com/api/v1/comment/feed`);
    targetUrls.push(`https://${cleanHandle}.substack.com/api/v1/comment`);
  }

  const proseMirrorDoc = convertTextToProseMirrorDoc(body);
  const payload = JSON.stringify({
    body: proseMirrorDoc,
    bodyJson: proseMirrorDoc,
    tab: 'notes',
    replyCount: 0
  });

  // Format cookie header cleanly (handles raw token, substack.sid=..., or full cookie string)
  let cookieHeader = sessionToken.trim();
  if (!cookieHeader.includes('=')) {
    cookieHeader = `substack.sid=${cookieHeader}`;
  }

  for (const url of targetUrls) {
    try {
      const originHost = new URL(url).origin;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Cookie': cookieHeader,
          'Origin': originHost,
          'Referer': `${originHost}/notes`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
        },
        body: payload
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log(`🎉 Live note published successfully!`);
        return {
          success: true,
          message: 'Note published live to Substack!',
          noteId: responseData.id || responseData.comment_id || responseData.comment?.id
        };
      }

      const errorText = await response.text();
      // If 404 and we have another target URL to try, log and continue fallback
      if (response.status === 404 && targetUrls.indexOf(url) < targetUrls.length - 1) {
        console.warn(`⚠️ Target ${url} returned 404, trying fallback URL...`);
        continue;
      }

      if (response.status === 403) {
        console.error(`\n❌ Substack API returned HTTP 403 (Forbidden / Cloudflare Block).`);
        console.log(`💡 Troubleshooting 403 Forbidden:`);
        console.log(`   1. Your session cookie (substack.sid) may have expired or been invalidated.`);
        console.log(`   2. Refresh https://substack.com in Chrome DevTools -> Application -> Cookies.`);
        console.log(`   3. Copy the full 'substack.sid' cookie value and run:`);
        console.log(`      snap auth --set "<fresh_cookie_value>" --handle "<your_handle>"\n`);
      } else {
        console.error(`❌ Substack API returned HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }

      return {
        success: false,
        message: `HTTP ${response.status}: ${errorText.substring(0, 200)}`
      };
    } catch (err: any) {
      console.error(`❌ Network error while publishing note to ${url}:`, err.message);
      if (targetUrls.indexOf(url) === targetUrls.length - 1) {
        return {
          success: false,
          message: err.message
        };
      }
    }
  }

  return {
    success: false,
    message: 'All publishing attempts failed.'
  };
}

export async function deleteNoteFromSubstack(noteId: string): Promise<{ success: boolean; message: string }> {
  const config = loadConfig();
  const sessionToken = config.substack_session_id;

  if (!sessionToken) {
    return {
      success: false,
      message: 'Substack session token not set. Configure via "snap auth" first.'
    };
  }

  // Normalize note ID (e.g., c-12345 -> 12345 or c-12345)
  const rawId = noteId.replace(/^note-/, '');
  const cleanId = rawId.replace(/^c-/, '');

  const targetUrls = [
    `https://substack.com/api/v1/comment/feed/${cleanId}`,
    `https://substack.com/api/v1/comment/${cleanId}`,
    `https://substack.com/api/v1/comment/feed/${rawId}`,
    `https://substack.com/api/v1/comment/${rawId}`
  ];

  if (config.substack_handle) {
    const cleanHandle = config.substack_handle.replace(/^@/, '');
    targetUrls.push(`https://${cleanHandle}.substack.com/api/v1/comment/feed/${cleanId}`);
    targetUrls.push(`https://${cleanHandle}.substack.com/api/v1/comment/${cleanId}`);
    targetUrls.push(`https://${cleanHandle}.substack.com/api/v1/comment/feed/${rawId}`);
    targetUrls.push(`https://${cleanHandle}.substack.com/api/v1/comment/${rawId}`);
  }

  // Format cookie header cleanly
  let cookieHeader = sessionToken.trim();
  if (!cookieHeader.includes('=')) {
    cookieHeader = `substack.sid=${cookieHeader}`;
  }

  console.log(`\n🗑️ Attempting to delete note ${noteId} from Substack via API...`);

  for (const url of targetUrls) {
    try {
      const originHost = new URL(url).origin;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Cookie': cookieHeader,
          'Origin': originHost,
          'Referer': `${originHost}/notes`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
        }
      });

      if (response.ok || response.status === 204) {
        console.log(`🎉 Note ${noteId} deleted successfully from Substack!`);
        return {
          success: true,
          message: `Note ${noteId} deleted successfully.`
        };
      }

      const errorText = await response.text();
      if (response.status === 404 && targetUrls.indexOf(url) < targetUrls.length - 1) {
        continue;
      }

      console.error(`❌ Substack API returned HTTP ${response.status}: ${errorText}`);
      return {
        success: false,
        message: `HTTP ${response.status}: ${errorText}`
      };
    } catch (err: any) {
      if (targetUrls.indexOf(url) === targetUrls.length - 1) {
        console.error(`❌ Network error while deleting note:`, err.message);
        return {
          success: false,
          message: err.message
        };
      }
    }
  }

  return {
    success: false,
    message: 'Failed to delete note from Substack API.'
  };
}

