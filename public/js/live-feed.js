// ==========================================
// Live Feed Module
// Extracted from app.js during refactoring
// ==========================================

// XSS-safe HTML escape helper (duplicated from app.js since modules aren't shared)
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// --- Live Feed State Variables ---
let liveFeedSelectedTalkgroups = new Set(); // Stores IDs of selected talkgroups
// REMOVED: let isLiveFeedEnabled = false;
let isLiveFeedAudioEnabled = false;
let allLiveFeedTalkgroups = []; // Cache for the full talkgroup list
const MAX_LIVE_FEED_ITEMS = 5;
const LIVE_FEED_ITEM_DURATION = 15000; // 15 seconds in milliseconds
const LIVE_FEED_RETRY_INTERVAL = 3000; // 3 seconds for retry
const MAX_LIVE_FEED_RETRIES = 5; // Max 5 retries (total 15 seconds)

// Performance optimization variables
let liveFeedSearchDebounceTimer = null;
const LIVE_FEED_SEARCH_DEBOUNCE_DELAY = 300; // 300ms debounce
const MAX_TALKGROUPS_DISPLAY = 100; // Limit displayed talkgroups for performance

// Add references for the UI elements that will be assigned in setupLiveFeed
// REMOVED liveFeedEnableCheckbox
let liveFeedModal, liveFeedSetupBtn, liveFeedSearchInput, liveFeedAudioEnableCheckbox, liveFeedTalkgroupListContainer, liveFeedDisplayContainer;

// Declare the audio source variable globally if it doesn't exist elsewhere
let currentAudioSource = null;
// --- End Live Feed State Variables ---

// NEW Handler for Live Feed Updates
function handleLiveFeedUpdate(call) {
    // OPTIMIZATION: Skip if nothing is selected/enabled
    if (liveFeedSelectedTalkgroups.size === 0 && !isLiveFeedAudioEnabled) {
        // console.log("[LiveFeed] No talkgroups selected and audio disabled. Skipping update.");
        return; 
    }
    
    // console.log("[LiveFeed] handleLiveFeedUpdate triggered for call ID:", call.id);
    const incomingTgId = parseInt(call.talk_group_id, 10); 

    // Check if the talkgroup is selected
    if (liveFeedSelectedTalkgroups.has(incomingTgId)) { 
        // console.log(`[LiveFeed] Match found for TG ID ${incomingTgId}! Calling displayLiveFeedItem.`);
        displayLiveFeedItem(call); // Display the item (handles audio internally)
    } else {
        // console.log(`[LiveFeed] Call TG ID ${incomingTgId} ignored. Selected: ${liveFeedSelectedTalkgroups.has(incomingTgId)}`);
    }
}

// NEW: Live Feed Setup and Helper Functions

function setupLiveFeed() {
    console.log("[LiveFeed] Setting up Live Feed UI and listeners...");

    // Check each element individually
    liveFeedSetupBtn = document.getElementById('live-feed-setup-btn');
    if (!liveFeedSetupBtn) console.error("[LiveFeed] Failed to find #live-feed-setup-btn");

    liveFeedModal = document.getElementById('live-feed-modal');
    if (!liveFeedModal) console.error("[LiveFeed] Failed to find #live-feed-modal");

    liveFeedSearchInput = document.getElementById('live-feed-search');
    if (!liveFeedSearchInput) console.error("[LiveFeed] Failed to find #live-feed-search");

    liveFeedTalkgroupListContainer = document.getElementById('live-feed-talkgroup-list');
    if (!liveFeedTalkgroupListContainer) console.error("[LiveFeed] Failed to find #live-feed-talkgroup-list");

    liveFeedDisplayContainer = document.getElementById('live-feed-display');
    if (!liveFeedDisplayContainer) console.error("[LiveFeed] Failed to find #live-feed-display");

    // Check if ALL required elements were found
    if (!liveFeedSetupBtn || !liveFeedModal || !liveFeedSearchInput || !liveFeedTalkgroupListContainer || !liveFeedDisplayContainer) {
        console.error("[LiveFeed] Initialization failed due to missing elements.");
        return; // Stop setup if elements are missing
    }

    console.log("[LiveFeed] All required elements found.");

    // --- REMOVING DEBUG LOG ---
    // console.log("[LiveFeed] Value of liveFeedSetupBtn before addEventListener:", liveFeedSetupBtn);
    // --- END DEBUG LOG ---

    // Listener to open the modal
    try { // Add try-catch for more detailed error
        liveFeedSetupBtn.addEventListener('click', openLiveFeedModal);
    } catch (error) {
        console.error("[LiveFeed] Error adding event listener to liveFeedSetupBtn:", error);
        console.error("[LiveFeed] liveFeedSetupBtn value at time of error:", liveFeedSetupBtn);
    }

    // Listeners within the modal
    // --- REMOVING DEBUG LOG ---
    // console.log("[LiveFeed] Value of liveFeedSearchInput before addEventListener:", liveFeedSearchInput);
    // --- END DEBUG LOG ---
    try { // Add try-catch for more detailed error
        liveFeedSearchInput.addEventListener('input', handleLiveFeedSearch);
    } catch (error) {
        console.error("[LiveFeed] Error adding event listener to liveFeedSearchInput:", error);
        console.error("[LiveFeed] liveFeedSearchInput value at time of error:", liveFeedSearchInput);
    }


    // Initial state setup
    // REMOVED: liveFeedEnableCheckbox.checked = isLiveFeedEnabled;
    updateLiveFeedDisplayVisibility(); // Use helper function for initial state

    // Fetch all talkgroups for the modal (unchanged)
    fetch('/api/talkgroups')
        .then(response => response.json())
        .then(talkgroups => {
            allLiveFeedTalkgroups = talkgroups; // Cache the list
            console.log(`[LiveFeed] Fetched ${allLiveFeedTalkgroups.length} talkgroups.`);
        })
        .catch(error => {
            console.error('[LiveFeed] Error fetching talkgroups:', error);
            liveFeedTalkgroupListContainer.innerHTML = '<div class="loading-placeholder error">Error loading talkgroups.</div>';
        });
}

function openLiveFeedModal() {
    if (!liveFeedModal || !allLiveFeedTalkgroups) return;
    console.log("[LiveFeed] Opening setup modal.");
    liveFeedModal.style.display = 'block';
    populateLiveFeedTalkgroups(); // Populate with current selections
    // Ensure display state is correct when opening modal
    liveFeedDisplayContainer.style.display = liveFeedSelectedTalkgroups.size > 0 ? 'flex' : 'none'; 
}

// Placeholder for the globally accessible close function (defined in index.html)
function closeLiveFeedModal() { 
    const modal = document.getElementById('live-feed-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Ensure display state is correct when closing modal
    if (liveFeedDisplayContainer) { // Add check for safety
       liveFeedDisplayContainer.style.display = liveFeedSelectedTalkgroups.size > 0 ? 'flex' : 'none'; 
    }
}

function populateLiveFeedTalkgroups() {
    if (!liveFeedTalkgroupListContainer) return;

    // Show loading state
    liveFeedTalkgroupListContainer.innerHTML = '<div class="loading-placeholder">Loading talkgroups...</div>';

    // Use requestAnimationFrame to ensure DOM updates happen after processing
    requestAnimationFrame(() => {
        const searchTerm = liveFeedSearchInput.value.toLowerCase();
        
        // Filter talkgroups based on search term
        const filteredTalkgroups = allLiveFeedTalkgroups.filter(tg =>
            tg.name.toLowerCase().includes(searchTerm)
        );

        if (filteredTalkgroups.length === 0) {
            liveFeedTalkgroupListContainer.innerHTML = '<div class="loading-placeholder">No matching talkgroups found.</div>';
            return;
        }

        // Separate selected and unselected talkgroups instead of sorting
        const selectedTalkgroups = [];
        const unselectedTalkgroups = [];

        filteredTalkgroups.forEach(tg => {
            if (liveFeedSelectedTalkgroups.has(tg.id)) {
                selectedTalkgroups.push(tg);
            } else {
                unselectedTalkgroups.push(tg);
            }
        });

        // Sort each group alphabetically
        selectedTalkgroups.sort((a, b) => a.name.localeCompare(b.name));
        unselectedTalkgroups.sort((a, b) => a.name.localeCompare(b.name));

        // Limit display for performance (prioritize selected talkgroups)
        const displaySelected = selectedTalkgroups.slice(0, MAX_TALKGROUPS_DISPLAY);
        const remainingSlots = MAX_TALKGROUPS_DISPLAY - displaySelected.length;
        const displayUnselected = unselectedTalkgroups.slice(0, Math.max(0, remainingSlots));

        // Build HTML with separate sections
        let html = '';
        
        // Selected talkgroups section
        if (displaySelected.length > 0) {
            html += '<div class="live-feed-section-header">Selected Talkgroups</div>';
            html += displaySelected.map(tg => `
                <div class="live-feed-tg-item selected">
                    <input type="checkbox"
                           id="live-feed-tg-${tg.id}"
                           data-tg-id="${tg.id}"
                           checked>
                    <label for="live-feed-tg-${tg.id}">${escapeHtml(tg.name)}</label>
                </div>
            `).join('');
        }

        // Unselected talkgroups section
        if (displayUnselected.length > 0) {
            if (displaySelected.length > 0) {
                html += '<div class="live-feed-section-header">Available Talkgroups</div>';
            }
            html += displayUnselected.map(tg => `
                <div class="live-feed-tg-item">
                    <input type="checkbox"
                           id="live-feed-tg-${tg.id}"
                           data-tg-id="${tg.id}">
                    <label for="live-feed-tg-${tg.id}">${escapeHtml(tg.name)}</label>
                </div>
            `).join('');
        }

        // Show message if results were truncated
        const totalFiltered = filteredTalkgroups.length;
        const totalDisplayed = displaySelected.length + displayUnselected.length;
        if (totalFiltered > totalDisplayed) {
            html += `<div class="live-feed-truncated-message">
                Showing ${totalDisplayed} of ${totalFiltered} talkgroups. 
                Use search to narrow results.
            </div>`;
        }

        // Update DOM
        liveFeedTalkgroupListContainer.innerHTML = html;

        // Add event listeners
        liveFeedTalkgroupListContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', handleLiveFeedSelectionChange);
        });
    });
}

function handleLiveFeedSearch() {
    // Clear existing debounce timer
    if (liveFeedSearchDebounceTimer) {
        clearTimeout(liveFeedSearchDebounceTimer);
    }
    
    // Show loading state immediately
    if (liveFeedTalkgroupListContainer) {
        liveFeedTalkgroupListContainer.innerHTML = '<div class="loading-placeholder">Searching...</div>';
    }
    
    // Set new debounce timer
    liveFeedSearchDebounceTimer = setTimeout(() => {
        populateLiveFeedTalkgroups();
    }, LIVE_FEED_SEARCH_DEBOUNCE_DELAY);
}

function handleLiveFeedSelectionChange(event) {
    const checkbox = event.target;
    const talkgroupId = parseInt(checkbox.dataset.tgId, 10);

    if (checkbox.checked) {
        liveFeedSelectedTalkgroups.add(talkgroupId);
        console.log(`[LiveFeed] Added TG ID ${talkgroupId} to selection. Current set:`, liveFeedSelectedTalkgroups);
    } else {
        liveFeedSelectedTalkgroups.delete(talkgroupId);
         console.log(`[LiveFeed] Removed TG ID ${talkgroupId} from selection. Current set:`, liveFeedSelectedTalkgroups);
    }
    
    // NEW: Update display based on selection size
    updateLiveFeedDisplayVisibility(); // Call the new visibility function

    // NEW: Update audio state based on selection
    isLiveFeedAudioEnabled = liveFeedSelectedTalkgroups.size > 0;
    console.log(`[LiveFeed] Audio state updated to: ${isLiveFeedAudioEnabled}`);

    /* // OLD Logic - replaced by updateLiveFeedDisplayVisibility()
    if (liveFeedDisplayContainer) { // Add safety check
        liveFeedDisplayContainer.style.display = liveFeedSelectedTalkgroups.size > 0 ? 'flex' : 'none';
        // Optional: Clear display if no TGs are selected
        if (liveFeedSelectedTalkgroups.size === 0) {
            liveFeedDisplayContainer.innerHTML = '';
        }
    }
    */
}

// REMOVED function handleMasterEnableChange(event) { ... }

function handleAudioEnableChange(event) { // (Unchanged)
    isLiveFeedAudioEnabled = event.target.checked;
    console.log(`[LiveFeed] Audio Enabled set to: ${isLiveFeedAudioEnabled}`);
}

// Ensure displayLiveFeedItem is defined before handleLiveFeedUpdate
function displayLiveFeedItem(call) {
    // MODIFIED: Removed check for isLiveFeedEnabled
    if (!liveFeedDisplayContainer) return; 

    const existingItem = liveFeedDisplayContainer.querySelector(`#live-feed-item-${call.id}`);
    if (existingItem) {
        // console.log(`[LiveFeed] Item ${call.id} already displayed. Skipping duplicate.`);
        return; // Avoid adding duplicates if event fires rapidly
    }

    const newItem = document.createElement('div');
    newItem.className = 'live-feed-item';
    newItem.id = `live-feed-item-${call.id}`; // Assign an ID for easy targeting

    // Wrap content in a span for measurement and scrolling
    const contentSpan = document.createElement('span');
    contentSpan.className = 'scroll-content';
    // Initial content based on whether transcription is pending
    const initialTranscription = (call.transcription && call.transcription !== "[Transcription Pending...]") 
                               ? call.transcription 
                               : "[Transcription Pending...]";
    const strongLabel = document.createElement('strong');
    strongLabel.textContent = call.talk_group_name || 'Unknown TG';
    const transcriptionSpan = document.createElement('span');
    transcriptionSpan.className = 'transcription-text';
    transcriptionSpan.textContent = initialTranscription;
    contentSpan.appendChild(strongLabel);
    contentSpan.appendChild(document.createTextNode(': '));
    contentSpan.appendChild(transcriptionSpan);
    newItem.appendChild(contentSpan);

    liveFeedDisplayContainer.prepend(newItem);

    // Check for overflow AFTER adding to DOM and applying styles
    requestAnimationFrame(() => {
        const itemWidth = newItem.clientWidth;
        const contentWidth = contentSpan.scrollWidth;
        if (contentWidth > itemWidth) {
            newItem.classList.add('scrolling');
            const scrollSpeed = 50;
            const duration = contentWidth / scrollSpeed;
            contentSpan.style.animationDuration = `${Math.max(5, duration)}s`;
        }
    });

    while (liveFeedDisplayContainer.children.length > MAX_LIVE_FEED_ITEMS) {
        liveFeedDisplayContainer.removeChild(liveFeedDisplayContainer.lastElementChild);
    }

    // Setup removal timer
    const removalTimeoutId = setTimeout(() => {
        newItem.classList.add('fading-out');
        setTimeout(() => {
            if (newItem.parentNode === liveFeedDisplayContainer) {
                liveFeedDisplayContainer.removeChild(newItem);
            }
        }, 1500);
    }, LIVE_FEED_ITEM_DURATION - 1500);

    // Retry logic if transcription is pending
    if (initialTranscription === "[Transcription Pending...]") {
        attemptLiveFeedRetry(call.id, newItem, 0, removalTimeoutId);
    }

    // Live Audio Logic
    if (isLiveFeedAudioEnabled && call.id && call.transcription !== "[Transcription Pending...]") { 
        // Only play audio if transcription is not pending initially
        // console.log(`[LiveFeed] Attempting live audio for TG ${call.talk_group_id}, Call ${call.id}`);
        playLiveAudio(call);
    }
}

function attemptLiveFeedRetry(callId, itemElement, retryCount, removalTimeoutId) {
    if (!itemElement || !itemElement.parentNode) {
        // console.log(`[LiveFeed Retry] Item ${callId} no longer in DOM. Stopping retries.`);
        return; // Item removed, stop retrying
    }
    if (retryCount >= MAX_LIVE_FEED_RETRIES) {
        // console.log(`[LiveFeed Retry] Max retries reached for ${callId}.`);
        return; // Max retries reached
    }

    setTimeout(async () => {
        // Double check item is still in DOM before fetch
        if (!itemElement || !itemElement.parentNode) return;

        try {
            // console.log(`[LiveFeed Retry] Attempt ${retryCount + 1} for call ID ${callId}`);
            const response = await fetch(`/api/call/${callId}/details`);
            if (!response.ok) {
                // console.warn(`[LiveFeed Retry] API error for ${callId}: ${response.status}`);
                // Optionally retry on certain server errors, or just give up
                if (response.status !== 404) { // Don't retry if call truly not found
                    // Recursive call for next attempt
                    attemptLiveFeedRetry(callId, itemElement, retryCount + 1, removalTimeoutId);
                }
                return;
            }
            const callDetails = await response.json();

            // Check again if item is still in DOM after await
            if (!itemElement || !itemElement.parentNode) return;

            if (callDetails && callDetails.transcription && callDetails.transcription !== "[Transcription Pending...]") {
                // console.log(`[LiveFeed Retry] SUCCESS for ${callId}. New transcription: ${callDetails.transcription}`);
                const contentSpan = itemElement.querySelector('.scroll-content');
                const transcriptionSpan = contentSpan ? contentSpan.querySelector('.transcription-text') : null;
                if (transcriptionSpan) {
                    transcriptionSpan.textContent = callDetails.transcription;
                    // Re-evaluate scrolling if content changed
                    requestAnimationFrame(() => {
                        const itemWidth = itemElement.clientWidth;
                        const newContentWidth = contentSpan.scrollWidth;
                        if (newContentWidth > itemWidth && !itemElement.classList.contains('scrolling')) {
                            itemElement.classList.add('scrolling');
                            const scrollSpeed = 50;
                            const duration = newContentWidth / scrollSpeed;
                            contentSpan.style.animationDuration = `${Math.max(5, duration)}s`;
                        } else if (newContentWidth <= itemWidth && itemElement.classList.contains('scrolling')) {
                            itemElement.classList.remove('scrolling');
                            contentSpan.style.animationDuration = '';
                        }
                    });
                    // Play audio now that transcription is available, if it wasn't played before
                    if (isLiveFeedAudioEnabled && callId) { 
                        playLiveAudio(callDetails); // Pass full details in case playLiveAudio needs more than ID
                    }
                }
            } else {
                // Still pending, retry if not maxed out
                // console.log(`[LiveFeed Retry] Still pending for ${callId}. Retrying...`);
                attemptLiveFeedRetry(callId, itemElement, retryCount + 1, removalTimeoutId);
            }
        } catch (error) {
            console.error(`[LiveFeed Retry] Fetch error for ${callId}:`, error);
            // Potentially retry on network errors too
            attemptLiveFeedRetry(callId, itemElement, retryCount + 1, removalTimeoutId);
        }
    }, LIVE_FEED_RETRY_INTERVAL);
}

// playLiveAudio function (use window.audioContext)
function playLiveAudio(call) {
    // --- Ensure AudioContext exists --- 
    if (!window.audioContext) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            window.audioContext = new AudioContext();
            // Need to ensure GainNode is also ready if context was just created
            initGlobalGainNode(); 
        } catch (e) {
             console.error('Failed to create AudioContext:', e);
             return; // Cannot proceed without context
        }
    }

    // Resume if suspended
    if (window.audioContext.state === 'suspended') { 
        window.audioContext.resume().catch(e => console.warn('AudioContext resume failed:', e));
    }
    
    const audioUrl = `/audio/${call.id}`; // Corrected: Use call.id
    
    fetch(audioUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.arrayBuffer();
        })
        .then(arrayBuffer => {
            if (!arrayBuffer || arrayBuffer.byteLength === 0) { 
                 throw new Error("Received invalid audio data");
            }
            return window.audioContext.decodeAudioData(arrayBuffer); 
        })
        .then(audioBuffer => {
            const source = window.audioContext.createBufferSource(); 
            source.buffer = audioBuffer;
            
            if (window.globalGainNode) {
                const destinationNode = window.globalGainNode;
                // Force gain value to match global setting
                destinationNode.gain.value = globalVolumeLevel;
                
                source.connect(destinationNode);
                source.start(0);
            } else {
                // Fallback to connect directly to destination, but volume won't work
                source.connect(window.audioContext.destination);
                source.start(0);
            }
        })
        .catch(error => {
            console.error(`Error playing live audio for call ID ${call.id}:`, error);
        });
}

// --- NEW Live Feed Helper Functions ---

// Shows/hides the main live feed display area based on selections
function updateLiveFeedDisplayVisibility() {
    if (!liveFeedDisplayContainer) return;
    liveFeedDisplayContainer.style.display = liveFeedSelectedTalkgroups.size > 0 ? 'flex' : 'none';
    // Optional: Clear display if no TGs are selected and it's being hidden
    if (liveFeedSelectedTalkgroups.size === 0) {
        liveFeedDisplayContainer.innerHTML = '';
    }
}

// Updates the corresponding checkbox in the Live Feed setup modal
function updateLiveFeedModalCheckbox(talkgroupId, isSelected) {
    const modalCheckbox = document.querySelector(`#live-feed-modal #live-feed-tg-${talkgroupId}`);
    if (modalCheckbox) {
        modalCheckbox.checked = isSelected;
    }
}
