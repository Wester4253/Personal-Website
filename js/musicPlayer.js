// ===== YOUTUBE MUSIC PLAYER =====
let player = null;
let isPlayerReady = false;
let videoQueue = null;
let updateStatsInterval = null;
let isPlaying = false;

// Suppress YouTube console errors
const originalConsoleError = console.error;
console.error = (...args) => {
    if (typeof args[0] === 'string' && 
        (args[0].includes('youtubei/v1/log_event') || 
         args[0].includes('Error: Failed to execute'))) {
        return;
    }
    originalConsoleError.apply(console, args);
};

function loadYouTubeAPI() {
    return new Promise((resolve, reject) => {
        if (window.YT && window.YT.Player) {
            resolve();
            return;
        }

        window.onYouTubeIframeAPIReady = function() {
            isPlayerReady = true;
            resolve();
        };

        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        tag.onerror = () => reject(new Error('Failed to load YouTube API'));

        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        setTimeout(() => {
            if (!window.YT) {
                reject(new Error('YouTube API load timeout'));
            }
        }, 10000);
    });
}

async function initializePlayer() {
    return new Promise((resolve, reject) => {
        let playerContainer = document.getElementById('youtube-player');
        if (!playerContainer) {
            playerContainer = document.createElement('div');
            playerContainer.id = 'youtube-player';
            playerContainer.style.cssText = 'position: absolute; left: -9999px;';
            document.body.appendChild(playerContainer);
        }

        try {
            player = new YT.Player('youtube-player', {
                height: '1',
                width: '1',
                videoId: '',
                playerVars: {
                    'playsinline': 1,
                    'controls': 0,
                    'autoplay': 0,
                    'enablejsapi': 1,
                    'origin': window.location.origin,
                    'rel': 0,
                    'modestbranding': 1,
                    'fs': 0,
                    'showinfo': 0,
                    'iv_load_policy': 3
                },
                events: {
                    'onReady': (event) => {
                        isPlayerReady = true;
                        resolve(event);
                    },
                    'onStateChange': onPlayerStateChange,
                    'onError': (event) => {
                        console.warn('Player error:', event.data);
                    }
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

function extractVideoId(url) {
    if (!url) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

    const patterns = [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

async function loadVideo(videoId) {
    if (!videoId) return;

    try {
        if (!isPlayerReady) {
            videoQueue = videoId;
            await initializePlayer();
            if (videoQueue) {
                await loadVideo(videoQueue);
                videoQueue = null;
            }
            return;
        }

        const elements = {
            thumbnail: document.querySelector('.song-thumbnail'),
            title: document.querySelector('.song-title'),
            artist: document.querySelector('.song-artist')
        };

        if (elements.thumbnail) elements.thumbnail.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        if (elements.title) elements.title.textContent = 'Loading...';
        if (elements.artist) elements.artist.textContent = '';

        await new Promise((resolve) => {
            player.loadVideoById({ videoId: videoId });
            setTimeout(resolve, 1000);
        });

        startStatsUpdate();

    } catch (error) {
        console.warn('Error loading video:', error);
        const titleElement = document.querySelector('.song-title');
        const artistElement = document.querySelector('.song-artist');
        if (titleElement) titleElement.textContent = 'Error loading video';
        if (artistElement) artistElement.textContent = 'Please try again';
    }
}

function formatTime(seconds) {
    seconds = Math.floor(seconds);
    const minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function startStatsUpdate() {
    if (updateStatsInterval) {
        clearInterval(updateStatsInterval);
    }

    updateStatsInterval = setInterval(() => {
        if (player && player.getPlayerState) {
            const state = player.getPlayerState();
            if (state === 1) {
                const currentTime = player.getCurrentTime();
                const duration = player.getDuration();
                const videoData = player.getVideoData();
                
                document.querySelector('.song-title').textContent = videoData.title;
                document.querySelector('.song-artist').textContent = videoData.author;
                
                const thumbnail = document.querySelector('.song-thumbnail');
                if (!thumbnail.src) {
                    thumbnail.src = `https://i.ytimg.com/vi/${videoData.video_id}/hqdefault.jpg`;
                }

                const progress = (currentTime / duration) * 100;
                document.querySelector('.progress-fill').style.width = `${progress}%`;

                document.querySelector('.current-time').textContent = formatTime(currentTime);
                document.querySelector('.duration').textContent = formatTime(duration);
            }
        }
    }, 1000);
}

function onPlayerStateChange(event) {
    const playIcon = document.querySelector('.play-icon');
    const pauseIcon = document.querySelector('.pause-icon');
    const statsContainer = document.querySelector('.stats-container');
    
    switch(event.data) {
        case YT.PlayerState.PLAYING:
            isPlaying = true;
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            statsContainer.classList.add('visible');
            break;
        case YT.PlayerState.PAUSED:
            isPlaying = false;
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            break;
        case YT.PlayerState.ENDED:
            isPlaying = false;
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            setTimeout(() => {
                statsContainer.classList.remove('visible');
            }, 300);
            break;
    }
}

// Music player event listeners
document.addEventListener('DOMContentLoaded', async function() {
    const maxRetries = 3;
    let retryCount = 0;

    async function initWithRetry() {
        try {
            await loadYouTubeAPI();
            await new Promise(resolve => setTimeout(resolve, 500));
            await initializePlayer();
            
            const elements = {
                musicToggle: document.querySelector('.music-toggle'),
                submitButton: document.querySelector('.youtube-submit'),
                input: document.querySelector('.youtube-input'),
                youtubeInputContainer: document.querySelector('.youtube-input-container'),
                statsContainer: document.querySelector('.stats-container')
            };

            if (elements.musicToggle && elements.youtubeInputContainer) {
                elements.musicToggle.addEventListener('click', () => {
                    elements.youtubeInputContainer.classList.toggle('visible');
                    elements.musicToggle.classList.toggle('hidden');
                });
            }

            if (elements.submitButton && elements.input) {
                const handleSubmit = async () => {
                    const videoId = extractVideoId(elements.input.value.trim());
                    if (videoId) {
                        await loadVideo(videoId);
                        elements.youtubeInputContainer.classList.remove('visible');
                        elements.musicToggle.classList.remove('hidden');
                        elements.statsContainer.classList.add('visible');
                    } else {
                        alert('Please enter a valid YouTube URL or video ID');
                    }
                };

                elements.submitButton.addEventListener('click', handleSubmit);

                elements.input.addEventListener('keypress', async (e) => {
                    if (e.key === 'Enter') {
                        await handleSubmit();
                    }
                });
            }

            const playPauseBtn = document.querySelector('.play-pause-btn');
            if (playPauseBtn) {
                playPauseBtn.addEventListener('click', () => {
                    if (player) {
                        if (isPlaying) {
                            player.pauseVideo();
                        } else {
                            player.playVideo();
                        }
                    }
                });
            }

            const closePlayer = document.querySelector('.close-player');
            if (closePlayer) {
                closePlayer.addEventListener('click', () => {
                    elements.statsContainer.classList.remove('visible');
                    setTimeout(() => {
                        if (player && typeof player.stopVideo === 'function') {
                            player.stopVideo();
                        }
                        document.querySelector('.song-thumbnail').src = '';
                        document.querySelector('.song-title').textContent = 'No song playing';
                        document.querySelector('.song-artist').textContent = 'Unknown artist';
                        if (updateStatsInterval) {
                            clearInterval(updateStatsInterval);
                        }
                    }, 300);
                });
            }

        } catch (error) {
            console.warn(`Initialization attempt ${retryCount + 1} failed:`, error);
            retryCount++;
            
            if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                return initWithRetry();
            } else {
                console.error('Failed to initialize after', maxRetries, 'attempts');
            }
        }
    }

    initWithRetry();
});
