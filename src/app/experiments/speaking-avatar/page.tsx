'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const SpeakingAvatarPage = () => {
  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [talkingHeadLoaded, setTalkingHeadLoaded] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const talkingHeadRef = useRef<any>(null);
  const femaleVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Load and select a female voice
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      
      // Try to find a female voice (common patterns in voice names)
      const femaleVoice = voices.find(voice => 
        voice.lang.startsWith('en') && (
          voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('woman') ||
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('karen') ||
          voice.name.toLowerCase().includes('tessa') ||
          voice.name.toLowerCase().includes('zira') ||
          voice.name.toLowerCase().includes('hazel') ||
          voice.name.toLowerCase().includes('susan') ||
          voice.name.toLowerCase().includes('victoria') ||
          voice.name.toLowerCase().includes('kate') ||
          voice.name.toLowerCase().includes('sarah') ||
          voice.name.toLowerCase().includes('alice') ||
          voice.name.toLowerCase().includes('nancy') ||
          voice.name.toLowerCase().includes('shelley') ||
          voice.name.toLowerCase().includes('moira') ||
          voice.name.toLowerCase().includes('fiona') ||
          voice.name.toLowerCase().includes('sinead') ||
          voice.name.toLowerCase().includes('tessa') ||
          voice.name.toLowerCase().includes('veena') ||
          voice.name.toLowerCase().includes('amara') ||
          voice.name.toLowerCase().includes('aria') ||
          voice.name.toLowerCase().includes('en-us') && voice.name.toLowerCase().includes('female')
        )
      ) || voices.find(voice => 
        voice.lang.startsWith('en-US') && voice.name.toLowerCase().includes('us')
      ) || voices.find(voice => 
        voice.lang.startsWith('en')
      );
      
      if (femaleVoice) {
        femaleVoiceRef.current = femaleVoice;
        console.log('Selected female voice:', femaleVoice.name, femaleVoice.lang);
      } else {
        console.log('No specific female voice found, using default');
      }
    };

    // Load voices immediately if available
    loadVoices();
    
    // Some browsers load voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Load TalkingHead library
  useEffect(() => {
    let isMounted = true;
    
    const loadTalkingHead = async () => {
      try {
        // Clean up any existing instance
        if (talkingHeadRef.current) {
          try {
            // Check if TalkingHead has a cleanup/destroy method
            if (typeof talkingHeadRef.current.destroy === 'function') {
              talkingHeadRef.current.destroy();
            }
            // Clear the container
            if (mountRef.current) {
              mountRef.current.innerHTML = '';
            }
          } catch (cleanupError) {
            console.error('Error cleaning up TalkingHead:', cleanupError);
          }
          talkingHeadRef.current = null;
        }

        // Set up import map for Three.js dependencies
        let importMapExists = document.querySelector('script[type="importmap"]');
        if (!importMapExists) {
          const script = document.createElement('script');
          script.type = 'importmap';
          script.textContent = JSON.stringify({
            imports: {
              'three': 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js',
              'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/',
            }
          });
          document.head.appendChild(script);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Import TalkingHead from local file using full URL
        // Use window.location.origin to get the base URL (client-side only)
        const baseUrl = window.location.origin;
        const moduleUrl = `${baseUrl}/lib/talkinghead.mjs`;
        
        console.log('Loading TalkingHead from:', moduleUrl);
        
        // Use eval to make it a truly dynamic import that Next.js won't try to resolve at build time
        let TalkingHeadModule;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          TalkingHeadModule = await (eval(`import("${moduleUrl}")`) as Promise<any>);
          console.log('TalkingHead module loaded successfully');
        } catch (importError) {
          console.error('Failed to import TalkingHead module:', importError);
          // Log more details about the error
          if (importError instanceof Error) {
            console.error('Error message:', importError.message);
            console.error('Error stack:', importError.stack);
          }
          // Try fetching first to see if the file exists
          try {
            const response = await fetch(moduleUrl);
            console.log('Module fetch response status:', response.status, response.statusText);
            if (!response.ok) {
              throw new Error(`Failed to fetch module: ${response.status} ${response.statusText}`);
            }
            const text = await response.text();
            console.log('Module file exists. First 200 chars:', text.substring(0, 200));
          } catch (fetchError) {
            console.error('Failed to fetch module file:', fetchError);
          }
          throw new Error(`Failed to load TalkingHead: ${importError instanceof Error ? importError.message : String(importError)}. Check console for details.`);
        }
        
        const TalkingHead = TalkingHeadModule.TalkingHead || TalkingHeadModule.default || TalkingHeadModule;
        
        if (!TalkingHead || typeof TalkingHead !== 'function') {
          console.error('TalkingHead not found in module. Available exports:', Object.keys(TalkingHeadModule));
          throw new Error('TalkingHead class not found in module');
        }

        if (!mountRef.current || !isMounted) return;

        // Initialize TalkingHead with camera settings for head and shoulders view
        const head = new TalkingHead(mountRef.current, {
          lipsyncModules: ['en'],
          mixerGainSpeech: 1.0,
          avatarOnly: false,
          cameraY: 1.5, // Position camera at head/upper chest level
          cameraDistance: 1.6, // Moderate distance for head and shoulders
          cameraZoomEnable: false, // Disable zoom to keep position
        });

        // Load the default avatar
        const defaultAvatarUrl = 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png';
        
        try {
          await head.showAvatar({ url: defaultAvatarUrl });
          
          // Adjust camera for head and shoulders view - use continuous update to override any resets
          let cameraAdjusted = false;
          const adjustCamera = () => {
            if (head.camera && head.controls && !cameraAdjusted) {
              // Position camera to show head and shoulders (not too high, not too low)
              // Camera at head level, looking at face/upper chest
              head.camera.position.set(0, 1.8, 1.6); // Camera at head level, moderate distance
              head.controls.target.set(0, 1.5, 0); // Look at face/upper chest area
              head.controls.update();
              
              // Moderate FOV to frame head and shoulders nicely
              head.camera.fov = 20; // Good balance for head and shoulders
              head.camera.updateProjectionMatrix();
              
              // Disable controls to prevent user from changing view
              head.controls.enableRotate = false;
              head.controls.enableZoom = false;
              head.controls.enablePan = false;
              
              console.log('Camera adjusted - position:', head.camera.position, 'target:', head.controls.target);
              cameraAdjusted = true;
            }
          };
          
          // Try adjusting multiple times
          setTimeout(adjustCamera, 500);
          setTimeout(adjustCamera, 1000);
          setTimeout(adjustCamera, 2000);
          
          // Also continuously update camera position to override any resets
          const cameraUpdateInterval = setInterval(() => {
            if (head.camera && head.controls) {
              head.camera.position.set(0, 1.8, 1.6);
              head.controls.target.set(0, 1.5, 0);
              head.controls.update();
              head.camera.fov = 20;
              head.camera.updateProjectionMatrix();
            } else {
              clearInterval(cameraUpdateInterval);
            }
          }, 100); // Update every 100ms
          
          // Clean up interval when component unmounts
          if (isMounted) {
            setTimeout(() => clearInterval(cameraUpdateInterval), 10000);
          }
          
          if (isMounted) {
            setAvatarLoaded(true);
            console.log('Default avatar loaded successfully');
          }
        } catch (avatarError) {
          console.error('Failed to load default avatar:', avatarError);
          if (isMounted) {
            setError('Failed to load avatar. Please check the console for details.');
          }
        }

        if (isMounted) {
          talkingHeadRef.current = head;
          setTalkingHeadLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load TalkingHead:', err);
        if (isMounted) {
          setError('Failed to load TalkingHead library. Please check your internet connection.');
        }
      }
    };

    loadTalkingHead();

    // Cleanup function
    return () => {
      isMounted = false;
      if (talkingHeadRef.current) {
        try {
          // Check if TalkingHead has a cleanup/destroy method
          if (typeof talkingHeadRef.current.destroy === 'function') {
            talkingHeadRef.current.destroy();
          }
          // Clear the container
          if (mountRef.current) {
            mountRef.current.innerHTML = '';
          }
        } catch (cleanupError) {
          console.error('Error cleaning up TalkingHead:', cleanupError);
        }
        talkingHeadRef.current = null;
      }
    };
  }, []);

  // Estimate speech duration based on text length
  // Average speaking rate is about 150 words per minute = 2.5 words per second
  // Average word length is about 5 characters
  const estimateSpeechDuration = (text: string): number => {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const wordsPerSecond = 2.5; // Average speaking rate
    return (words.length / wordsPerSecond) * 1000; // Return in milliseconds
  };

  // Speak text using TalkingHead
  const speakText = async () => {
    if (!text.trim()) {
      setError('Please enter some text to speak');
      return;
    }

    if (!talkingHeadRef.current) {
      setError('TalkingHead not loaded yet. Please wait...');
      return;
    }

    if (isSpeaking) {
      // Stop current speech if speaking
      try {
        if (talkingHeadRef.current && typeof talkingHeadRef.current.stopSpeaking === 'function') {
          talkingHeadRef.current.stopSpeaking();
        }
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } catch (err) {
        console.error('Error stopping speech:', err);
      }
      setIsSpeaking(false);
      return;
    }

    try {
      setError(null);
      setIsSpeaking(true);

      const textToSpeak = text.trim();
      
      // Split text into sentences (ending with . ! ?)
      const sentenceRegex = /[.!?]+/g;
      const sentences = textToSpeak.split(sentenceRegex).filter(s => s.trim().length > 0);
      const sentenceEndings = textToSpeak.match(sentenceRegex) || [];
      
      // Process each sentence separately with pauses between them
      const allWords: string[] = [];
      const wtimes: number[] = [];
      const wdurations: number[] = [];
      let currentTime = 0;
      const pauseBetweenSentences = 800; // 800ms pause after each sentence
      
      sentences.forEach((sentence, sentenceIndex) => {
        const sentenceWords = sentence.trim().split(/\s+/).filter(w => w.length > 0);
        
        sentenceWords.forEach((word) => {
          // Estimate word duration (longer words take more time)
          const wordDuration = Math.max(200, word.length * 50); // Minimum 200ms, ~50ms per character
          allWords.push(word);
          wtimes.push(currentTime);
          wdurations.push(wordDuration);
          currentTime += wordDuration + 50; // Add small pause between words
        });
        
        // Add pause after sentence (except after the last one)
        if (sentenceIndex < sentences.length - 1) {
          currentTime += pauseBetweenSentences;
        }
      });
      
      const estimatedDuration = currentTime;

      // Try to use high-quality TTS API first, fallback to browser TTS
      let useHighQualityTTS = true;
      
      try {
        // Call TTS API for high-quality neural voice
        const ttsResponse = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: textToSpeak,
            voice: 'nova', // Natural, friendly female voice
          }),
        });

        const ttsData = await ttsResponse.json();

        if (ttsData.success && ttsData.audioBase64) {
          // Process each sentence separately to add breaks between them
          let totalDuration = 0;
          
          for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i].trim();
            if (sentence.length === 0) continue;
            
            // Get audio for this sentence
            const sentenceTtsResponse = await fetch('/api/tts', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: sentence,
                voice: 'nova',
              }),
            });
            
            const sentenceTtsData = await sentenceTtsResponse.json();
            
            if (sentenceTtsData.success && sentenceTtsData.audioBase64) {
              // Convert base64 to ArrayBuffer
              const audioBytes = Uint8Array.from(atob(sentenceTtsData.audioBase64), c => c.charCodeAt(0));
              
              // Decode audio using Web Audio API
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const audioBuffer = await audioContext.decodeAudioData(audioBytes.buffer);
              
              // Get words for this sentence
              const sentenceWords = sentence.split(/\s+/).filter(w => w.length > 0);
              const sentenceDuration = audioBuffer.duration * 1000;
              
              // Calculate word timings for this sentence
              const sentenceWtimes: number[] = [];
              const sentenceWdurations: number[] = [];
              let sentenceCurrentTime = 0;
              const avgWordDuration = sentenceDuration / sentenceWords.length;
              
              sentenceWords.forEach((word) => {
                const wordDuration = Math.max(avgWordDuration * 0.8, word.length * 30);
                sentenceWtimes.push(sentenceCurrentTime);
                sentenceWdurations.push(wordDuration);
                sentenceCurrentTime += wordDuration;
              });
              
              // Use speakAudio for this sentence
              talkingHeadRef.current.speakAudio({
                words: sentenceWords,
                wtimes: sentenceWtimes,
                wdurations: sentenceWdurations,
                audio: audioBuffer,
              }, {
                lipsyncLang: 'en',
              });
              
              totalDuration += sentenceDuration;
              
              // Add break after sentence (except after the last one)
              if (i < sentences.length - 1) {
                talkingHeadRef.current.speakBreak(pauseBetweenSentences);
                totalDuration += pauseBetweenSentences;
              }
            }
          }
          
          console.log('Using high-quality TTS API with sentence breaks');
          
          // Set up callback to know when speaking ends
          setTimeout(() => {
            setIsSpeaking(false);
          }, totalDuration);
          
          return;
        } else {
          // API failed, fallback to browser TTS
          console.log('TTS API not available, falling back to browser TTS');
          useHighQualityTTS = false;
        }
      } catch (apiError) {
        console.error('TTS API error:', apiError);
        useHighQualityTTS = false;
      }

      // Fallback to browser TTS
      if (!useHighQualityTTS) {
        // Create a silent audio buffer with the estimated duration
        // This is needed so TalkingHead processes the animation with proper timing
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const sampleRate = audioContext.sampleRate;
        const durationInSeconds = estimatedDuration / 1000;
        const frameCount = Math.floor(sampleRate * durationInSeconds);
        const audioBuffer = audioContext.createBuffer(1, frameCount, sampleRate);
        // Leave buffer silent (all zeros)

        // Use speakAudio with estimated timing and silent audio to get proper lip-sync
        console.log('Using browser TTS fallback');
        talkingHeadRef.current.speakAudio({
          words: allWords,
          wtimes: wtimes,
          wdurations: wdurations,
          audio: audioBuffer, // Provide silent audio so timing is preserved
        }, {
          lipsyncLang: 'en',
        });

        // Use browser's Web Speech API for audio with female voice
        // Process each sentence separately to add pauses
        let sentenceIndex = 0;
        const speakNextSentence = () => {
          if (sentenceIndex < sentences.length) {
            const sentence = sentences[sentenceIndex].trim();
            if (sentence.length > 0) {
              // Get words and timings for this sentence only
              const sentenceWords = sentence.split(/\s+/).filter(w => w.length > 0);
              const sentenceWtimes: number[] = [];
              const sentenceWdurations: number[] = [];
              let sentenceCurrentTime = 0;
              
              sentenceWords.forEach((word) => {
                const wordDuration = Math.max(200, word.length * 50);
                sentenceWtimes.push(sentenceCurrentTime);
                sentenceWdurations.push(wordDuration);
                sentenceCurrentTime += wordDuration + 50;
              });
              
              // Create silent audio buffer for this sentence
              const sentenceDuration = sentenceCurrentTime;
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const sampleRate = audioContext.sampleRate;
              const durationInSeconds = sentenceDuration / 1000;
              const frameCount = Math.floor(sampleRate * durationInSeconds);
              const sentenceAudioBuffer = audioContext.createBuffer(1, frameCount, sampleRate);
              
              // Use speakAudio for this sentence's animation
              talkingHeadRef.current.speakAudio({
                words: sentenceWords,
                wtimes: sentenceWtimes,
                wdurations: sentenceWdurations,
                audio: sentenceAudioBuffer,
              }, {
                lipsyncLang: 'en',
              });
              
              // Now speak the audio
              const utterance = new SpeechSynthesisUtterance(sentence);
              utterance.lang = 'en-US';
              
              // Select a female voice if available
              if (femaleVoiceRef.current) {
                utterance.voice = femaleVoiceRef.current;
              }
              
              // Adjust parameters for more natural, feminine sound
              utterance.rate = 0.95;
              utterance.pitch = 1.15;
              utterance.volume = 1.0;

              utterance.onend = () => {
                sentenceIndex++;
                // Add pause before next sentence (except after the last one)
                if (sentenceIndex < sentences.length) {
                  // Add break to animation queue
                  talkingHeadRef.current.speakBreak(pauseBetweenSentences);
                  setTimeout(speakNextSentence, pauseBetweenSentences);
                } else {
                  setIsSpeaking(false);
                }
              };

              utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                setIsSpeaking(false);
                setError('Error playing audio');
                try {
                  if (talkingHeadRef.current && typeof talkingHeadRef.current.stopSpeaking === 'function') {
                    talkingHeadRef.current.stopSpeaking();
                  }
                } catch (err) {
                  console.error('Error stopping animation:', err);
                }
              };

              window.speechSynthesis.speak(utterance);
            } else {
              sentenceIndex++;
              speakNextSentence();
            }
          }
        };

        // Start speaking the first sentence
        speakNextSentence();
      }
    } catch (err) {
      console.error('Error speaking text:', err);
      setError(`Failed to speak text: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsSpeaking(false);
    }
  };

  // Handle Enter key to speak
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      speakText();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between shadow-md">
        <Link href="/" className="text-gray-300 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Speaking Avatar</h1>
          <p className="text-xs text-gray-400">Type text and watch the avatar speak with lip-sync</p>
        </div>
        <div className="w-6" />
      </header>

      <div className="flex-1 flex flex-col">
        {/* TalkingHead Avatar Container - Top Half */}
        <div className="relative flex-1 w-full" style={{ height: '50vh' }}>
          <div
            ref={mountRef}
            className="bg-gray-800 overflow-hidden w-full h-full"
            style={{ position: 'relative', zIndex: 1 }}
          />
          
          {!talkingHeadLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading TalkingHead...</p>
              </div>
            </div>
          )}
        </div>

        {/* Text Input and Controls - Bottom Half */}
        <div className="flex flex-col items-center justify-center space-y-4 w-full p-8 relative z-10" style={{ height: '50vh' }}>
          {error && (
            <div className="bg-red-600 text-white px-4 py-2 rounded-lg w-full text-center">
              {error}
            </div>
          )}

          <div className="w-full space-y-3">
            <label className="block text-sm font-semibold text-gray-200">
              Enter text to speak:
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type what you want the avatar to say and press Enter or click Speak..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              rows={4}
              disabled={!talkingHeadLoaded || !avatarLoaded || isSpeaking}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {isSpeaking ? 'Speaking...' : 'Press Enter to speak (Shift+Enter for new line)'}
              </p>
              <button
                onClick={speakText}
                disabled={!talkingHeadLoaded || !avatarLoaded || !text.trim()}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  isSpeaking
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : talkingHeadLoaded && avatarLoaded && text.trim()
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSpeaking ? 'Stop Speaking' : 'Speak'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeakingAvatarPage;
