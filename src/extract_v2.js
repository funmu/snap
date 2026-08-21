/**
 * SNAP Browser Extractor V2
 * Substack Notes Structural DOM Extractor (Generic & Open Source Ready)
 * 
 * Usage:
 * 1. Open your Substack profile page or Notes feed in browser (e.g. https://substack.com/@yourusername/notes)
 * 2. Scroll down to load historical notes.
 * 3. Open Browser Console (F12 or Cmd+Option+J).
 * 4. Paste and run this script.
 */
(function extractSubstackNotesV2() {
    console.log("🚀 Running SNAP Extractor V2...");

    const noteLinks = Array.from(document.querySelectorAll('a'))
        .filter(a => a.href && a.href.includes('/note/'));

    let extractedNotes = [];

    noteLinks.forEach(link => {
        // Walk up DOM tree to isolate note card container (~6 levels)
        let card = link;
        for (let i = 0; i < 6; i++) {
            if (card.parentElement && card.parentElement.tagName !== 'BODY') {
                card = card.parentElement;
            }
        }

        const rawText = card.innerText ? card.innerText.trim() : '';
        if (rawText.length < 10) return;

        // Parse note URL and ID
        const noteUrl = link.href;
        const noteIdMatch = noteUrl.match(/note\/(c-[0-9a-zA-Z]+)/);
        const noteId = noteIdMatch ? noteIdMatch[1] : 'note-' + Math.random().toString(36).substring(2, 9);

        // Extract hashtags
        const hashtags = Array.from(rawText.matchAll(/#([a-zA-Z0-9_]+)/g)).map(m => '#' + m[1]);

        extractedNotes.push({
            id: noteId,
            url: noteUrl,
            rawText: rawText,
            hashtags: Array.from(new Set(hashtags)),
            extractedAt: new Date().toISOString()
        });
    });

    // Deduplicate by URL
    const uniqueNotesMap = new Map();
    extractedNotes.forEach(item => {
        if (!uniqueNotesMap.has(item.url)) {
            uniqueNotesMap.set(item.url, item);
        }
    });

    const finalInventory = Array.from(uniqueNotesMap.values());

    if (finalInventory.length === 0) {
        console.warn("⚠️ No notes isolated. Make sure you are on the Notes tab and scrolled down.");
        return;
    }

    console.log(`✅ SNAP Extractor V2 isolated ${finalInventory.length} unique note items.`);

    // Download JSON file
    const blob = new Blob([JSON.stringify(finalInventory, null, 2)], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = "substack_notes_inventory.json";
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(blobUrl);

    console.log("💾 Downloaded raw inventory as substack_notes_inventory.json");
})();
