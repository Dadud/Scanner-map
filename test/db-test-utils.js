// db-test-utils.js - Database setup/teardown and test utilities

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

/**
 * Database Test Utilities
 * Provides setup, teardown, and helper functions for database testing
 */
class DBTestUtils {
  constructor(dbPath = null) {
    this.dbPath = dbPath || path.join(__dirname, 'test-db.db');
    this.db = null;
  }

  /**
   * Initialize test database
   */
  async init() {
    return new Promise((resolve, reject) => {
      // Remove existing test database if it exists
      if (fs.existsSync(this.dbPath)) {
        fs.unlinkSync(this.dbPath);
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          this.createTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  /**
   * Create all necessary tables
   */
  async createTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Talk groups table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS talk_groups (
            id TEXT PRIMARY KEY,
            alpha_tag TEXT,
            tag TEXT,
            description TEXT
          )
        `);

        // Transcriptions table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS transcriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            talk_group_id TEXT,
            transcription TEXT,
            audio_file_path TEXT,
            timestamp INTEGER,
            lat REAL,
            lon REAL,
            address TEXT,
            category TEXT,
            system_name TEXT,
            source TEXT,
            talker_alias TEXT,
            frequency TEXT,
            talk_group_group TEXT,
            total_errors INTEGER DEFAULT 0,
            total_spikes INTEGER DEFAULT 0,
            emergency INTEGER DEFAULT 0,
            priority INTEGER DEFAULT 0,
            encrypted INTEGER DEFAULT 0,
            call_length INTEGER,
            freq_error REAL,
            signal_quality TEXT,
            start_time INTEGER,
            stop_time INTEGER,
            tdma_slot INTEGER,
            phase2_tdma INTEGER DEFAULT 0,
            color_code INTEGER,
            has_two_tone INTEGER DEFAULT 0,
            detected_tones TEXT,
            tone_detection_type TEXT,
            message_url TEXT
          )
        `);

        // Audio files table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS audio_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transcription_id INTEGER,
            audio_data BLOB,
            FOREIGN KEY (transcription_id) REFERENCES transcriptions(id)
          )
        `);

        // Keywords table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS keywords (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            keyword TEXT NOT NULL,
            talk_group_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Users table (for auth)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Sessions table (for auth)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            user_agent TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  /**
   * Insert a test call
   */
  async insertCall(callData = {}) {
    const {
      talkGroupID = '12345',
      transcription = null,
      audioFilePath = null,
      timestamp = Math.floor(Date.now() / 1000),
      lat = null,
      lon = null,
      address = null,
      category = null,
      systemName = 'Test System',
      source = '1234',
      talkerAlias = null,
      frequency = '453.125',
      talkGroupGroup = 'Police'
    } = callData;

    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO transcriptions (
          talk_group_id, transcription, audio_file_path, timestamp,
          lat, lon, address, category, system_name, source, talker_alias,
          frequency, talk_group_group
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        talkGroupID, transcription, audioFilePath, timestamp,
        lat, lon, address, category, systemName, source, talkerAlias,
        frequency, talkGroupGroup
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Update call transcription
   */
  async updateTranscription(callId, transcription) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE transcriptions SET transcription = ? WHERE id = ?',
        [transcription, callId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  /**
   * Update call address and coordinates
   */
  async updateAddress(callId, address, lat, lon) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE transcriptions SET address = ?, lat = ?, lon = ? WHERE id = ?',
        [address, lat, lon, callId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  /**
   * Update call category
   */
  async updateCategory(callId, category) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE transcriptions SET category = ? WHERE id = ?',
        [category, callId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  /**
   * Get call by ID
   */
  async getCall(callId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM transcriptions WHERE id = ?',
        [callId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  /**
   * Get calls by time range
   */
  async getCallsByTimeRange(startTime, endTime) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM transcriptions WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC',
        [startTime, endTime],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  /**
   * Get calls by talkgroup
   */
  async getCallsByTalkgroup(talkGroupID, limit = 100) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM transcriptions WHERE talk_group_id = ? ORDER BY timestamp DESC LIMIT ?',
        [talkGroupID, limit],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  /**
   * Insert a talkgroup
   */
  async insertTalkgroup(talkGroupData) {
    const {
      id,
      alphaTag = null,
      tag = null,
      description = null
    } = talkGroupData;

    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT OR REPLACE INTO talk_groups (id, alpha_tag, tag, description)
        VALUES (?, ?, ?, ?)
      `, [id, alphaTag, tag, description], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Purge calls (set lat/lon to NULL)
   */
  async purgeCalls(criteria = {}) {
    const {
      talkgroupIds = null,
      categories = null,
      timeRangeStart = null,
      timeRangeEnd = null
    } = criteria;

    let whereConditions = ['lat IS NOT NULL AND lon IS NOT NULL'];
    let params = [];

    if (talkgroupIds && talkgroupIds.length > 0) {
      whereConditions.push(`talk_group_id IN (${talkgroupIds.map(() => '?').join(',')})`);
      params.push(...talkgroupIds);
    }

    if (categories && categories.length > 0) {
      whereConditions.push(`UPPER(category) IN (${categories.map(() => 'UPPER(?)').join(',')})`);
      params.push(...categories);
    }

    if (timeRangeStart && timeRangeEnd) {
      whereConditions.push('timestamp BETWEEN ? AND ?');
      params.push(timeRangeStart, timeRangeEnd);
    }

    const whereClause = whereConditions.join(' AND ');

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE transcriptions SET lat = NULL, lon = NULL WHERE ${whereClause}`,
        params,
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  /**
   * Get all calls
   */
  async getAllCalls() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM transcriptions ORDER BY timestamp DESC',
        [],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  /**
   * Close database connection
   */
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.db = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Clean up test database
   */
  async cleanup() {
    await this.close();
    if (fs.existsSync(this.dbPath)) {
      fs.unlinkSync(this.dbPath);
    }
  }

  /**
   * Get database instance (for direct access if needed)
   */
  getDB() {
    return this.db;
  }
}

module.exports = DBTestUtils;

