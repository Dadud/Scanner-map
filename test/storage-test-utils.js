// storage-test-utils.js - Storage setup/teardown and test utilities

const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

/**
 * Storage Test Utilities
 * Provides setup, teardown, and helper functions for storage testing
 */
class StorageTestUtils {
  constructor(storageMode = 'local', s3Config = null) {
    this.storageMode = storageMode;
    this.s3Config = s3Config;
    this.s3 = null;
    this.localStoragePath = path.join(__dirname, 'test-storage');
    this.uploadedFiles = [];
  }

  /**
   * Initialize storage
   */
  async init() {
    if (this.storageMode === 'local') {
      await this.initLocalStorage();
    } else if (this.storageMode === 's3') {
      await this.initS3Storage();
    }
  }

  /**
   * Initialize local storage
   */
  async initLocalStorage() {
    if (!fs.existsSync(this.localStoragePath)) {
      fs.mkdirSync(this.localStoragePath, { recursive: true });
    }
  }

  /**
   * Initialize S3 storage (using MinIO for testing)
   */
  async initS3Storage() {
    if (!this.s3Config) {
      throw new Error('S3 config required for S3 storage mode');
    }

    AWS.config.update({
      accessKeyId: this.s3Config.accessKeyId,
      secretAccessKey: this.s3Config.secretAccessKey,
      endpoint: this.s3Config.endpoint,
      s3ForcePathStyle: true,
      signatureVersion: 'v4'
    });

    this.s3 = new AWS.S3();

    // Create bucket if it doesn't exist
    try {
      await this.s3.headBucket({ Bucket: this.s3Config.bucketName }).promise();
    } catch (error) {
      if (error.statusCode === 404) {
        await this.s3.createBucket({ Bucket: this.s3Config.bucketName }).promise();
      } else {
        throw error;
      }
    }
  }

  /**
   * Save audio file
   */
  async saveAudioFile(audioData, filename) {
    if (this.storageMode === 'local') {
      return this.saveAudioFileLocal(audioData, filename);
    } else if (this.storageMode === 's3') {
      return this.saveAudioFileS3(audioData, filename);
    }
  }

  /**
   * Save audio file to local storage
   */
  async saveAudioFileLocal(audioData, filename) {
    const filePath = path.join(this.localStoragePath, filename);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    if (Buffer.isBuffer(audioData)) {
      fs.writeFileSync(filePath, audioData);
    } else if (typeof audioData === 'string') {
      // Assume it's a path to copy
      fs.copyFileSync(audioData, filePath);
    } else {
      throw new Error('Invalid audio data type');
    }

    this.uploadedFiles.push({ mode: 'local', path: filePath });
    return filename; // Return relative path
  }

  /**
   * Save audio file to S3
   */
  async saveAudioFileS3(audioData, filename) {
    let body;
    
    if (Buffer.isBuffer(audioData)) {
      body = audioData;
    } else if (typeof audioData === 'string') {
      // Assume it's a file path
      body = fs.readFileSync(audioData);
    } else {
      throw new Error('Invalid audio data type');
    }

    const params = {
      Bucket: this.s3Config.bucketName,
      Key: filename,
      Body: body,
      ContentType: filename.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg'
    };

    await this.s3.putObject(params).promise();
    this.uploadedFiles.push({ mode: 's3', key: filename });
    return filename;
  }

  /**
   * Retrieve audio file
   */
  async getAudioFile(filename) {
    if (this.storageMode === 'local') {
      return this.getAudioFileLocal(filename);
    } else if (this.storageMode === 's3') {
      return this.getAudioFileS3(filename);
    }
  }

  /**
   * Retrieve audio file from local storage
   */
  async getAudioFileLocal(filename) {
    const filePath = path.join(this.localStoragePath, filename);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    return fs.readFileSync(filePath);
  }

  /**
   * Retrieve audio file from S3
   */
  async getAudioFileS3(filename) {
    try {
      const params = {
        Bucket: this.s3Config.bucketName,
        Key: filename
      };

      const data = await this.s3.getObject(params).promise();
      return data.Body;
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if audio file exists
   */
  async fileExists(filename) {
    if (this.storageMode === 'local') {
      const filePath = path.join(this.localStoragePath, filename);
      return fs.existsSync(filePath);
    } else if (this.storageMode === 's3') {
      try {
        await this.s3.headObject({
          Bucket: this.s3Config.bucketName,
          Key: filename
        }).promise();
        return true;
      } catch (error) {
        if (error.statusCode === 404) {
          return false;
        }
        throw error;
      }
    }
  }

  /**
   * Delete audio file
   */
  async deleteAudioFile(filename) {
    if (this.storageMode === 'local') {
      const filePath = path.join(this.localStoragePath, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } else if (this.storageMode === 's3') {
      try {
        await this.s3.deleteObject({
          Bucket: this.s3Config.bucketName,
          Key: filename
        }).promise();
      } catch (error) {
        // Ignore errors for cleanup
      }
    }
  }

  /**
   * Generate test audio file
   */
  generateTestAudio(durationSeconds = 5) {
    // Create a minimal valid audio file (MP3 header)
    // In a real scenario, you might use ffmpeg or a library
    const buffer = Buffer.alloc(1024);
    buffer.write('ID3', 0); // MP3 ID3 tag header
    return buffer;
  }

  /**
   * Clean up all uploaded files
   */
  async cleanup() {
    // Delete all uploaded files
    for (const file of this.uploadedFiles) {
      if (file.mode === 'local') {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } else if (file.mode === 's3') {
        try {
          await this.s3.deleteObject({
            Bucket: this.s3Config.bucketName,
            Key: file.key
          }).promise();
        } catch (error) {
          // Ignore errors for cleanup
        }
      }
    }

    this.uploadedFiles = [];

    // Clean up local storage directory
    if (this.storageMode === 'local' && fs.existsSync(this.localStoragePath)) {
      this.deleteDirectory(this.localStoragePath);
    }
  }

  /**
   * Delete directory recursively
   */
  deleteDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
      fs.readdirSync(dirPath).forEach((file) => {
        const curPath = path.join(dirPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          this.deleteDirectory(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(dirPath);
    }
  }

  /**
   * Get storage path (for local) or URL (for S3)
   */
  getStoragePath(filename) {
    if (this.storageMode === 'local') {
      return path.join(this.localStoragePath, filename);
    } else if (this.storageMode === 's3') {
      return `https://${this.s3Config.endpoint.replace(/^https?:\/\//, '')}/${this.s3Config.bucketName}/${filename}`;
    }
  }
}

module.exports = StorageTestUtils;

