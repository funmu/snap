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

  try {
    const response = await fetch('https://substack.com/api/v1/comment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `substack.sid=${sessionToken}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        body: convertTextToProseMirrorDoc(body),
        tab: 'notes',
        replyCount: 0
      })
    });

    if (response.ok) {
      const responseData = await response.json();
      console.log(`🎉 Live note published successfully!`);
      return {
        success: true,
        message: 'Note published live to Substack!',
        noteId: responseData.id || responseData.comment_id
      };
    } else {
      const errorText = await response.text();
      console.error(`❌ Substack API returned HTTP ${response.status}: ${errorText}`);
      return {
        success: false,
        message: `HTTP ${response.status}: ${errorText}`
      };
    }
  } catch (err: any) {
    console.error(`❌ Network error while publishing note:`, err.message);
    return {
      success: false,
      message: err.message
    };
  }
}
