# Quick Start Guide

## For New Users

1. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```
   
   Note: The `--legacy-peer-deps` flag is required due to Discord.js dependency conflicts. This is safe and commonly used.

2. **Run the setup wizard:**
   ```bash
   node index.js
   ```

3. **Open your browser:**
   - The terminal will display a temporary password
   - Open `http://localhost:8080/setup` in your browser
   - Enter the temporary password
   - Follow the setup wizard to configure everything

4. **After setup completes:**
   - Scanner Map will automatically restart in normal mode
   - Access the main interface at `http://localhost:8080`

## Troubleshooting

### "Cannot find module" errors
- Make sure you ran `npm install --legacy-peer-deps` first
- Delete `node_modules` and `package-lock.json`, then reinstall

### Port already in use
- The setup server will automatically try the next port (8081, 8082, etc.)
- Check the terminal output for the correct URL

### Setup wizard doesn't load
- Check that the server started successfully (look for the banner in terminal)
- Verify the URL matches what's shown in terminal
- Check browser console for errors (F12)

### Import from .env not working
- Make sure your `.env` file is in the project root
- The wizard will detect it automatically and offer to import

## Next Steps

After completing setup:
1. Connect your radio software (SDRTrunk, TrunkRecorder, etc.)
2. Use the API key shown in the wizard to configure your scanner software
3. Upload your talkgroups CSV file in the wizard
4. Configure transcription, geocoding, and Discord as needed

For more details, see the main [README.md](README.md).

