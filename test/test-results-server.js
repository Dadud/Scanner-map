// test-results-server.js - Web server for viewing test results in browser

const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

/**
 * Test Results Web Server
 * Serves test results and allows running tests from the browser
 */
class TestResultsServer {
  constructor(port = 8768) {
    this.port = port;
    this.app = express();
    this.server = null;
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'web')));
    
    this.testResults = {
      lastRun: null,
      status: 'idle', // 'idle', 'running', 'completed', 'error'
      results: null,
      error: null
    };
    
    this.setupRoutes();
  }

  setupRoutes() {
    // Serve test results page
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'web', 'index.html'));
    });

    // Get current test results
    this.app.get('/api/results', (req, res) => {
      res.json(this.testResults);
    });

    // Run tests
    this.app.post('/api/run', async (req, res) => {
      const { suite = 'all' } = req.body;
      
      if (this.testResults.status === 'running') {
        return res.status(400).json({ error: 'Tests are already running' });
      }

      this.testResults.status = 'running';
      this.testResults.lastRun = new Date().toISOString();
      this.testResults.results = null;
      this.testResults.error = null;

      // Start test process
      this.runTests(suite)
        .then(results => {
          this.testResults.status = 'completed';
          this.testResults.results = results;
          res.json({ success: true, results });
        })
        .catch(error => {
          this.testResults.status = 'error';
          this.testResults.error = error.message;
          res.status(500).json({ error: error.message });
        });
    });

    // Run regression tests
    this.app.post('/api/regression', async (req, res) => {
      if (this.testResults.status === 'running') {
        return res.status(400).json({ error: 'Tests are already running' });
      }

      this.testResults.status = 'running';
      this.testResults.lastRun = new Date().toISOString();

      this.runRegressionTests()
        .then(results => {
          this.testResults.status = 'completed';
          this.testResults.results = results;
          res.json({ success: true, results });
        })
        .catch(error => {
          this.testResults.status = 'error';
          this.testResults.error = error.message;
          res.status(500).json({ error: error.message });
        });
    });

    // Run verification
    this.app.post('/api/verify', async (req, res) => {
      if (this.testResults.status === 'running') {
        return res.status(400).json({ error: 'Tests are already running' });
      }

      this.testResults.status = 'running';
      this.testResults.lastRun = new Date().toISOString();

      this.runVerification()
        .then(results => {
          this.testResults.status = 'completed';
          this.testResults.results = results;
          res.json({ success: true, results });
        })
        .catch(error => {
          this.testResults.status = 'error';
          this.testResults.error = error.message;
          res.status(500).json({ error: error.message });
        });
    });

    // Get test logs (if available)
    this.app.get('/api/logs', (req, res) => {
      // Return any available logs
      res.json({ logs: [] });
    });
  }

  async runTests(suite) {
    return new Promise((resolve, reject) => {
      const testRunner = path.join(__dirname, 'run-all-tests.js');
      const args = suite !== 'all' ? ['--suite=' + suite] : [];
      
      const child = spawn('node', [testRunner, ...args], {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const results = {
          exitCode: code,
          stdout,
          stderr,
          success: code === 0
        };
        resolve(results);
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async runRegressionTests() {
    return new Promise((resolve, reject) => {
      const regressionScript = path.join(__dirname, 'regression-test.js');
      
      const child = spawn('node', [regressionScript], {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const results = {
          exitCode: code,
          stdout,
          stderr,
          success: code === 0
        };
        resolve(results);
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async runVerification() {
    return new Promise((resolve, reject) => {
      const verifyScript = path.join(__dirname, 'verify-setup.js');
      
      const child = spawn('node', [verifyScript], {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const results = {
          exitCode: code,
          stdout,
          stderr,
          success: code === 0
        };
        resolve(results);
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`[Test Results Server] Listening on http://localhost:${this.port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getUrl() {
    return `http://localhost:${this.port}`;
  }
}

module.exports = TestResultsServer;

