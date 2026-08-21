import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SNAPDatabase } from './types';
import { buildTopicClusters } from './topics';

export interface StorageAdapter {
  loadDB(): Promise<SNAPDatabase>;
  saveDB(db: SNAPDatabase): Promise<void>;
  getDataDir(): string;
}

export function getDefaultDataDir(): string {
  if (process.env.SNAP_DATA_DIR) {
    return path.resolve(process.env.SNAP_DATA_DIR);
  }
  // Default to hidden directory in user home directory ~/.snap
  return path.join(os.homedir(), '.snap');
}

export class FileStorageAdapter implements StorageAdapter {
  private dataDir: string;
  private dbPath: string;

  constructor(customDataDir?: string) {
    this.dataDir = customDataDir ? path.resolve(customDataDir) : getDefaultDataDir();
    this.dbPath = path.join(this.dataDir, 'db.json');

    // Ensure hidden data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  public getDataDir(): string {
    return this.dataDir;
  }

  public async loadDB(): Promise<SNAPDatabase> {
    if (fs.existsSync(this.dbPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
      } catch (err) {
        console.warn(`⚠️ Warning: Could not parse database at ${this.dbPath}. Initializing new DB.`);
      }
    }

    return {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      notes: [],
      clusters: []
    };
  }

  public async saveDB(db: SNAPDatabase): Promise<void> {
    db.last_updated = new Date().toISOString();
    db.clusters = buildTopicClusters(db.notes);
    fs.writeFileSync(this.dbPath, JSON.stringify(db, null, 2), 'utf-8');
  }
}
