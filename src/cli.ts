import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ingestRawInventory } from './ingest';
import { buildTopicClusters, formatClusterSummary } from './topics';
import { getAuthInstructions, saveSessionToken, loadConfig } from './auth';
import { publishNoteToSubstack, deleteNoteFromSubstack } from './publisher';
import { FileStorageAdapter, StorageAdapter } from './store';

function formatHomePath(p: string): string {
  const homeDir = os.homedir();
  if (p.startsWith(homeDir)) {
    return p.replace(homeDir, '~');
  }
  return p;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  // Support custom data-dir flag
  const dataDirIdx = args.indexOf('--data-dir');
  const customDataDir = dataDirIdx !== -1 ? args[dataDirIdx + 1] : undefined;

  const storage: StorageAdapter = new FileStorageAdapter(customDataDir);

  console.log(`\n⚡ SNAP — Substack Notes Authoring Platform (v1.0.0)`);
  console.log(`📂 Data Store: ${formatHomePath(storage.getDataDir())}`);
  console.log(`====================================================`);

  switch (command) {
    case 'ingest': {
      const inputPathArg = args[1] && !args[1].startsWith('--') ? args[1] : null;
      if (!inputPathArg) {
        console.log(`💡 Usage: snap ingest <path/to/substack_notes_inventory.json>`);
        return;
      }

      const inputPath = path.resolve(inputPathArg);
      console.log(`📥 Ingesting raw Substack notes from: ${inputPath}...`);

      try {
        const parsedNotes = ingestRawInventory(inputPath);
        const db = await storage.loadDB();

        // Merge notes into database
        const existingMap = new Map(db.notes.map(n => [n.id, n]));
        parsedNotes.forEach(n => existingMap.set(n.id, n));

        db.notes = Array.from(existingMap.values());
        await storage.saveDB(db);

        console.log(`✅ Successfully ingested ${parsedNotes.length} notes! Total notes in SNAP DB: ${db.notes.length}`);
        console.log(`📁 Saved to backend data store: ${storage.getDataDir()}/db.json`);
      } catch (err: any) {
        console.error(`❌ Ingestion failed: ${err.message}`);
      }
      break;
    }

    case 'list': {
      const db = await storage.loadDB();
      const topicFilterIdx = args.indexOf('--topic');
      const topicFilter = topicFilterIdx !== -1 ? args[topicFilterIdx + 1] : null;

      const searchIdx = args.indexOf('--search');
      const searchQuery = searchIdx !== -1 ? args[searchIdx + 1]?.toLowerCase() : null;

      let filtered = db.notes;
      if (topicFilter) {
        filtered = filtered.filter(n => n.topic_cluster === topicFilter);
      }
      if (searchQuery) {
        filtered = filtered.filter(n => n.content.body.toLowerCase().includes(searchQuery) || n.content.raw.toLowerCase().includes(searchQuery));
      }

      console.log(`📋 Note Inventory (${filtered.length} notes listed):\n`);
      filtered.forEach((note, i) => {
        const hashtagsStr = note.content.hashtags.length > 0 ? ` [${note.content.hashtags.join(', ')}]` : '';
        const topicStr = note.topic_cluster ? ` (Topic: ${note.topic_cluster})` : '';
        const preview = note.content.body.replace(/\n+/g, ' ').substring(0, 100);
        console.log(`${i + 1}. [${note.id}] ${note.author.name} (@${note.author.handle})${topicStr}`);
        console.log(`   "${preview}..."`);
        console.log(`   URL: ${note.url}${hashtagsStr}`);
        if (note.quoted_note) {
          console.log(`   💬 Restacked Quote: ${note.quoted_note.author_name} - "${note.quoted_note.content.substring(0, 60)}..."`);
        }
        console.log(``);
      });
      break;
    }

    case 'topics': {
      const db = await storage.loadDB();
      if (db.notes.length === 0) {
        console.log(`⚠️ Database is empty. Ingest raw notes first: snap ingest <file.json>`);
        return;
      }
      const clusters = buildTopicClusters(db.notes);
      console.log(formatClusterSummary(clusters));
      break;
    }

    case 'create': {
      const bodyIdx = args.indexOf('--body');
      const bodyText = bodyIdx !== -1 ? args[bodyIdx + 1] : null;

      const publishIdx = args.indexOf('--publish');
      const shouldPublish = publishIdx !== -1;

      if (!bodyText) {
        console.log(`💡 Usage: snap create --body "Your note text here #AI" [--publish]`);
        console.log(`   (Omit --publish to perform a dry-run draft preview)`);
        return;
      }

      await publishNoteToSubstack({
        body: bodyText,
        dryRun: !shouldPublish
      });
      break;
    }

    case 'delete': {
      const targetId = args[1] && !args[1].startsWith('--') ? args[1] : null;
      const isLocalOnly = args.includes('--local-only');

      if (!targetId) {
        console.log(`💡 Usage: snap delete <note_id> [--local-only]`);
        console.log(`   Example: snap delete c-319089287`);
        return;
      }

      // Perform API deletion unless --local-only is specified
      if (!isLocalOnly) {
        const deleteRes = await deleteNoteFromSubstack(targetId);
        if (!deleteRes.success) {
          console.log(`⚠️ API deletion warning: ${deleteRes.message}`);
        }
      }

      // Update local storage database
      const db = await storage.loadDB();
      const initialCount = db.notes.length;
      const cleanTargetId = targetId.replace(/^note-/, '');
      db.notes = db.notes.filter(n => n.id !== targetId && n.id !== cleanTargetId && n.id !== `c-${cleanTargetId}`);

      if (db.notes.length < initialCount) {
        await storage.saveDB(db);
        console.log(`✅ Removed note [${targetId}] from local SNAP database.`);
      } else {
        console.log(`💡 Note [${targetId}] was not found in local database.`);
      }
      break;
    }

    case 'auth': {
      const setIdx = args.indexOf('--set');
      const handleIdx = args.indexOf('--handle');
      const showGuide = args.includes('--guide') || args.includes('--help');

      if (setIdx !== -1 && args[setIdx + 1]) {
        const handleVal = handleIdx !== -1 ? args[handleIdx + 1] : undefined;
        saveSessionToken(args[setIdx + 1], handleVal, storage.getDataDir());
      } else {
        const config = loadConfig(storage.getDataDir());
        if (config.substack_session_id && !showGuide) {
          console.log(`\n🔒 Authentication Status : CONFIGURED`);
          if (config.substack_handle) {
            const handleDisplay = config.substack_handle.startsWith('@') ? config.substack_handle : `@${config.substack_handle}`;
            console.log(`👤 Substack Handle        : ${handleDisplay}`);
          }
          console.log(`🔑 Session Cookie        : ${config.substack_session_id.substring(0, 12)}...`);
          console.log(`\n💡 To update token, run: snap auth --set "<new_token>" [--handle "<handle>"]`);
          console.log(`   To view step-by-step browser DevTools guide, run: snap auth --guide`);
        } else {
          console.log(getAuthInstructions());
          if (config.substack_session_id) {
            console.log(`\n🔒 Current Session Token: configured (${config.substack_session_id.substring(0, 12)}...)`);
          } else {
            console.log(`\n⚠️ Current Session Token: Not configured`);
          }
        }
      }
      break;
    }

    case 'export': {
      const db = await storage.loadDB();
      const exportDir = path.join(storage.getDataDir(), 'exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const exportPath = path.join(exportDir, 'snap_export.json');
      fs.writeFileSync(exportPath, JSON.stringify(db, null, 2), 'utf-8');
      console.log(`\n📤 Exported SNAP Database and Topic Cards to ${exportPath}`);
      break;
    }

    case 'config': {
      const db = await storage.loadDB();
      const config = loadConfig(storage.getDataDir());
      const isJson = args.includes('--json');

      const dataDir = storage.getDataDir();

      const configSummary = {
        data_directory: formatHomePath(dataDir),
        db_path: formatHomePath(path.join(dataDir, 'db.json')),
        config_path: formatHomePath(path.join(dataDir, 'config.json')),
        exports_directory: formatHomePath(path.join(dataDir, 'exports')),
        substack_handle: config.substack_handle || 'not configured',
        session_token_status: config.substack_session_id ? 'configured' : 'not configured',
        total_notes_ingested: db.notes.length,
        total_topic_clusters: db.clusters.length || buildTopicClusters(db.notes).length,
        version: '1.0.0'
      };

      if (isJson) {
        console.log(JSON.stringify(configSummary, null, 2));
      } else {
        console.log(`🔧 SNAP Configuration & Storage State`);
        console.log(`=======================================`);
        console.log(`📂 Data Store Path     : ${configSummary.data_directory}`);
        console.log(`📄 Database File Path  : ${configSummary.db_path}`);
        console.log(`🔒 Config File Path    : ${configSummary.config_path}`);
        console.log(`📤 Exports Directory   : ${configSummary.exports_directory}`);
        console.log(`👤 Substack Handle     : ${configSummary.substack_handle}`);
        console.log(`🔑 Session Cookie      : ${configSummary.session_token_status}`);
        console.log(`📊 Ingested Notes      : ${configSummary.total_notes_ingested}`);
        console.log(`🏷️ Topic Clusters      : ${configSummary.total_topic_clusters}`);
      }
      break;
    }

    case 'help':
    default: {
      const binName = 'snap';
      console.log(`
Available Commands:
  ${binName} ingest <file.json>   Ingest & normalize raw browser JSON extract
  ${binName} list [--topic T]      List notes inventory with filters
  ${binName} topics                Display topic clusters & future post ideas
  ${binName} create --body "..."   Draft/preview or publish a new note
  ${binName} delete <note_id>      Delete a note by ID (from Substack & DB)
  ${binName} auth [--set TOKEN]    View auth instructions or set substack.sid
  ${binName} config [--json]       Emit current SNAP configuration & store state
  ${binName} export                Export SNAP inventory & topic cards

Options:
  --data-dir <path>                               Custom data storage directory (defaults to ~/.snap)
      `);
      break;
    }
  }
}

main().catch(err => {
  console.error("Fatal SNAP Error:", err);
  process.exit(1);
});
