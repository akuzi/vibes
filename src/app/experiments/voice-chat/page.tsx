'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import * as faceapi from 'face-api.js';

// Type definitions for browser Speech APIs
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

const VoiceChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAlwaysListening, setIsAlwaysListening] = useState(true);
  const [currentInterimText, setCurrentInterimText] = useState<string>('');
  const [isInCooldown, setIsInCooldown] = useState(false);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [emotionConfidence, setEmotionConfidence] = useState<number>(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAlwaysListeningRef = useRef(true);
  const isInCooldownRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTranscriptRef = useRef<string>('');
  const robotVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check browser support
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionConstructor = ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) as SpeechRecognitionConstructor | undefined;
      const SpeechSynthesis = window.speechSynthesis;

      if (!SpeechRecognitionConstructor) {
        setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
        return;
      }

      if (!SpeechSynthesis) {
        setError('Speech synthesis is not supported in this browser.');
        return;
      }

      // Initialize speech recognition
      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = true; // Enable continuous listening
      recognition.interimResults = true; // Enable interim results to detect when user stops speaking
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        currentTranscriptRef.current = '';
        setCurrentInterimText('');
      };

      recognition.onresult = async (event: SpeechRecognitionEvent) => {
        // Ignore results if we're in cooldown period (just processed something)
        if (isInCooldownRef.current) {
          return;
        }

        // Get the latest transcript
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Update current transcript
        currentTranscriptRef.current = finalTranscript + interimTranscript;
        
        // Update UI to show what's being transcribed
        if (interimTranscript.trim()) {
          setCurrentInterimText((finalTranscript + interimTranscript).trim());
        } else if (finalTranscript.trim()) {
          setCurrentInterimText(''); // Clear when final
        }

        // Helper function to check if transcript is valid speech (not just noise)
        const isValidSpeech = (text: string): boolean => {
          const trimmed = text.trim();
          
          // Much stricter requirements
          if (trimmed.length < 15) return false; // Must be at least 15 characters
          
          // Check if it has multiple words (more likely to be real speech)
          const words = trimmed.split(/\s+/).filter(w => w.length > 0);
          if (words.length < 3) return false; // Must have at least 3 words
          
          // Filter out common noise patterns
          const noisePatterns = [
            /^[aeiou]+$/i, 
            /^[h]+$/i, 
            /^[uh]+$/i, 
            /^[ah]+$/i,
            /^[eh]+$/i,
            /^[oh]+$/i,
            /^[um]+$/i,
            /^[hm]+$/i,
            /^\w{1,2}$/i, // Single or double character words
          ];
          
          // Check each word for noise patterns
          for (const word of words) {
            if (noisePatterns.some(pattern => pattern.test(word))) {
              // If too many words match noise patterns, reject
              if (words.filter(w => noisePatterns.some(p => p.test(w))).length >= words.length / 2) {
                return false;
              }
            }
          }
          
          // Reject if average word length is too short (likely noise)
          const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
          if (avgWordLength < 3) return false;
          
          return true;
        };

        // Clear any existing timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        // If we have a final result, check if it's valid before processing
        if (finalTranscript.trim()) {
          const fullTranscript = finalTranscript.trim();
          setCurrentInterimText(''); // Clear interim text
          if (isValidSpeech(fullTranscript)) {
            // Clear any pending timeout
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current);
              silenceTimeoutRef.current = null;
            }
            // Enter cooldown period
            setIsInCooldown(true);
            // Stop listening while processing
            recognition.stop();
            handleUserMessage(fullTranscript);
          }
          return;
        }

        // If we have interim results, wait for longer silence (user stopped speaking)
        // Only process if we have substantial speech
        if (interimTranscript.trim()) {
          const currentText = (finalTranscript + interimTranscript).trim();
          
          // Only set timeout if we have valid speech
          if (isValidSpeech(currentText)) {
            // Wait 3.5 seconds of silence before processing (much longer to avoid background noise)
            silenceTimeoutRef.current = setTimeout(() => {
              const transcriptToProcess = currentTranscriptRef.current.trim();
              // Double-check it's still valid and hasn't changed
              if (transcriptToProcess && isValidSpeech(transcriptToProcess) && !isInCooldownRef.current) {
                setCurrentInterimText(''); // Clear interim text
                // Clear the timeout since we're processing
                silenceTimeoutRef.current = null;
                // Enter cooldown period
                setIsInCooldown(true);
                // Stop listening while processing
                recognition.stop();
                handleUserMessage(transcriptToProcess);
              } else {
                // If it's no longer valid, clear the interim text
                setCurrentInterimText('');
              }
            }, 3500); // Wait 3.5 seconds of silence
          } else {
            // If interim text is not valid, clear it after a short delay
            if (interimTranscript.trim().length < 5) {
              setTimeout(() => {
                if (currentTranscriptRef.current.trim() === currentText) {
                  setCurrentInterimText('');
                }
              }, 1000);
            }
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'no-speech') {
          // Don't show error for no-speech in continuous mode, just restart
          if (isAlwaysListening && recognitionRef.current) {
            setTimeout(() => {
              try {
                recognitionRef.current?.start();
              } catch {
                // Already started, ignore
              }
            }, 100);
          }
        } else if (event.error === 'not-allowed') {
          setError('Microphone permission denied. Please allow microphone access.');
        } else if (event.error !== 'aborted') {
          // Don't show error for aborted (which happens when we stop it)
          setError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // Clear interim text when recognition ends
        if (!isProcessing) {
          setCurrentInterimText('');
        }
        // Auto-restart if always listening mode is on and we're not processing/speaking/in cooldown
        // Use a small delay to check current state
        setTimeout(() => {
          if (isAlwaysListeningRef.current && recognitionRef.current && !isInCooldownRef.current) {
            setIsProcessing(processing => {
              setIsSpeaking(speaking => {
                if (!processing && !speaking) {
                  try {
                    recognitionRef.current?.start();
                  } catch {
                    // Already started or error, ignore
                  }
                }
                return speaking;
              });
              return processing;
            });
          }
        }, 100);
      };

      recognitionRef.current = recognition;
      synthesisRef.current = SpeechSynthesis;

      // Find and set a natural-sounding voice
      const loadVoices = () => {
        const voices = SpeechSynthesis.getVoices();
        // Prefer natural-sounding English voices
        // Look for high-quality voices first (often have "Enhanced" or specific names)
        const preferredVoices = [
          'Samantha', 'Alex', 'Victoria', 'Daniel', 'Karen', 'Moira',
          'Microsoft Zira', 'Microsoft David', 'Microsoft Mark',
          'Google US English', 'Google UK English'
        ];
        
        const robotVoice = voices.find(voice => 
          preferredVoices.some(name => voice.name.includes(name))
        ) || voices.find(voice => 
          voice.lang.startsWith('en') && 
          (voice.name.toLowerCase().includes('enhanced') || 
           voice.name.toLowerCase().includes('premium') ||
           voice.localService === false) // Cloud voices are often more natural
        ) || voices.find(voice => voice.lang.startsWith('en'));
        
        robotVoiceRef.current = robotVoice || voices[0] || null;
      };

      // Load voices immediately and when they become available
      loadVoices();
      if (SpeechSynthesis.onvoiceschanged !== undefined) {
        SpeechSynthesis.onvoiceschanged = loadVoices;
      }

      // Auto-start listening if always listening mode is enabled
      if (isAlwaysListening) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.log('Could not auto-start recognition:', e);
          }
        }, 500);
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update refs when state changes
  useEffect(() => {
    isAlwaysListeningRef.current = isAlwaysListening;
  }, [isAlwaysListening]);

  useEffect(() => {
    isInCooldownRef.current = isInCooldown;
  }, [isInCooldown]);

  // Effect to handle always listening mode changes
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isAlwaysListening && !isListening && !isProcessing && !isSpeaking) {
      setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch {
          // Already started, ignore
        }
      }, 100);
    } else if (!isAlwaysListening && isListening) {
      recognitionRef.current.stop();
    }
  }, [isAlwaysListening, isListening, isProcessing, isSpeaking]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Use jsdelivr CDN for face-api.js models
        // The models are from the original face-api.js repository
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        console.log('Face-api models loaded successfully');
      } catch (err) {
        console.error('Error loading face-api models:', err);
        // Try alternative CDN
        try {
          const ALT_MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(ALT_MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(ALT_MODEL_URL),
          ]);
          setModelsLoaded(true);
          console.log('Face-api models loaded from alternative source');
        } catch (altErr) {
          console.error('Error loading from alternative source:', altErr);
          setError('Failed to load emotion detection models. Please check your internet connection.');
        }
      }
    };

    if (typeof window !== 'undefined') {
      loadModels();
    }
  }, []);

  // Auto-start camera when models are loaded
  useEffect(() => {
    if (modelsLoaded && videoRef.current && !isCameraActive) {
      console.log('Models loaded, auto-starting camera...');
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelsLoaded]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startCamera = async () => {
    console.log('Start camera clicked', { modelsLoaded, videoRef: !!videoRef.current });
    
    if (!videoRef.current) {
      console.error('Video ref is not available');
      setError('Video element not ready. Please refresh the page.');
      return;
    }

    try {
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      console.log('Camera access granted', stream);
      streamRef.current = stream;
      
      const video = videoRef.current;
      video.srcObject = stream;
      
      // Set up event handlers before playing
      const handleLoadedMetadata = () => {
        console.log('Video metadata loaded', {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState
        });
        
        setIsCameraActive(true);
        
        // Start emotion detection after a short delay
        setTimeout(() => {
          if (modelsLoaded) {
            startEmotionDetection();
          } else {
            console.warn('Models not loaded yet, will start detection when ready');
            // Wait for models to load
            const checkModels = setInterval(() => {
              if (modelsLoaded) {
                clearInterval(checkModels);
                startEmotionDetection();
              }
            }, 100);
            // Stop checking after 10 seconds
            setTimeout(() => clearInterval(checkModels), 10000);
          }
        }, 500);
      };

      video.onloadedmetadata = handleLoadedMetadata;
      
      // Also try to play immediately
      try {
        await video.play();
        console.log('Video playing');
      } catch (playErr) {
        console.error('Error playing video:', playErr);
        setError('Error starting video playback');
      }
      
    } catch (err) {
      console.error('Error accessing camera:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('no device')) {
        setError('No camera found. Please connect a camera and try again.');
      } else {
        setError(`Failed to access camera: ${errorMessage}`);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setIsCameraActive(false);
    setEmotion(null);
    setEmotionConfidence(0);
  };

  const startEmotionDetection = () => {
    if (!modelsLoaded) {
      console.log('Models not loaded yet');
      return;
    }
    
    if (!videoRef.current) {
      console.log('Video ref not available');
      return;
    }
    
    if (!canvasRef.current) {
      console.log('Canvas ref not available');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to match video
    if (video.videoWidth && video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    } else {
      canvas.width = 640;
      canvas.height = 480;
    }

    console.log('Starting emotion detection', { 
      videoWidth: video.videoWidth, 
      videoHeight: video.videoHeight,
      readyState: video.readyState 
    });

    const detectEmotion = async () => {
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        return;
      }

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();

        if (detections.length > 0) {
          const expressions = detections[0].expressions;
          
          // Find the emotion with highest confidence
          let maxEmotion = '';
          let maxConfidence = 0;
          
          Object.entries(expressions).forEach(([emotionName, confidence]) => {
            if (confidence > maxConfidence) {
              maxConfidence = confidence;
              maxEmotion = emotionName;
            }
          });

          // Lower threshold to 0.2 for better detection
          if (maxConfidence > 0.2) {
            setEmotion(maxEmotion);
            setEmotionConfidence(maxConfidence);
            console.log('Emotion detected:', maxEmotion, maxConfidence);
          } else {
            setEmotion(null);
            setEmotionConfidence(0);
          }
        } else {
          setEmotion(null);
          setEmotionConfidence(0);
        }
      } catch (err) {
        console.error('Error detecting emotion:', err);
      }
    };

    // Run detection every 300ms (slightly slower to reduce CPU usage)
    detectionIntervalRef.current = setInterval(detectEmotion, 300);
  };

  const handleUserMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text.trim(),
          conversationHistory: conversationHistory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setConversationHistory(data.conversationHistory || []);

      // Play high-quality TTS audio if available, otherwise fall back to browser TTS
      if (data.audioBase64) {
        playAudioFromBase64(data.audioBase64);
      } else {
        // Fallback to browser TTS
        speakText(data.response);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Clear cooldown on error
      setIsInCooldown(false);
      // Restart listening on error if always listening mode is on
      if (isAlwaysListeningRef.current && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch {
            // Already started, ignore
          }
        }, 2000);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudioFromBase64 = (audioBase64: string) => {
    try {
      // Cancel any ongoing audio playback
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      }
      
      // Convert base64 to audio blob
      const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onplay = () => {
        setIsSpeaking(true);
      };
      
      audio.onended = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
        URL.revokeObjectURL(audioUrl); // Clean up
        // Restart listening after speaking is done (if always listening mode is on)
        setTimeout(() => {
          setIsInCooldown(false);
          if (isAlwaysListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {
              // Already started or not ready, ignore
            }
          }
        }, 2000); // Wait 2 seconds after speaking ends before restarting
      };
      
      audio.onerror = (event) => {
        console.error('Audio playback error:', event);
        setIsSpeaking(false);
        currentAudioRef.current = null;
        setError('Error playing audio response');
        URL.revokeObjectURL(audioUrl); // Clean up
        // Restart listening even on error (if always listening mode is on)
        setTimeout(() => {
          setIsInCooldown(false);
          if (isAlwaysListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {
              // Already started or not ready, ignore
            }
          }
        }, 2000);
      };
      
      audio.play().catch((err) => {
        console.error('Error playing audio:', err);
        setIsSpeaking(false);
        currentAudioRef.current = null;
        setError('Error playing audio response');
        URL.revokeObjectURL(audioUrl);
        // Fallback to browser TTS if audio play fails
        // Note: We don't have the text here, so we'll just restart listening
        setTimeout(() => {
          setIsInCooldown(false);
          if (isAlwaysListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {
              // Already started or not ready, ignore
            }
          }
        }, 2000);
      });
    } catch (err) {
      console.error('Error processing audio:', err);
      setIsSpeaking(false);
      currentAudioRef.current = null;
      setError('Error processing audio response');
      // Restart listening on error
      setTimeout(() => {
        setIsInCooldown(false);
        if (isAlwaysListeningRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {
            // Already started or not ready, ignore
          }
        }
      }, 2000);
    }
  };

  const speakText = (text: string) => {
    if (!synthesisRef.current) return;

    // Cancel any ongoing speech
    synthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set robot-like voice characteristics
    if (robotVoiceRef.current) {
      utterance.voice = robotVoiceRef.current;
    }
    
    // Adjust for natural-sounding robot voice: normal speed, slightly higher pitch
    utterance.rate = 1.0; // Normal speed for natural flow
    utterance.pitch = 1.1; // Slightly higher pitch for robot character, but more natural
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      // Restart listening after speaking is done (if always listening mode is on)
      // Wait longer to avoid picking up echo or residual audio
      setTimeout(() => {
        // Clear cooldown after a delay
        setIsInCooldown(false);
        if (isAlwaysListeningRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {
            // Already started or not ready, ignore
          }
        }
      }, 2000); // Wait 2 seconds after speaking ends before restarting
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      setError('Error playing audio response');
      // Restart listening even on error (if always listening mode is on)
      setTimeout(() => {
        // Clear cooldown
        setIsInCooldown(false);
        if (isAlwaysListeningRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {
            // Already started or not ready, ignore
          }
        }
      }, 2000);
    };

    synthesisRef.current.speak(utterance);
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not initialized');
      return;
    }

    if (isSpeaking) {
      synthesisRef.current?.cancel();
      setIsSpeaking(false);
    }

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('Error starting recognition:', err);
      setError('Failed to start listening. Please try again.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setConversationHistory([]);
    setError(null);
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between shadow-md">
        <Link href="/" className="text-gray-300 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold">AI Voice Chat</h1>
          <p className="text-xs text-gray-400">Talk to me and i'll respond</p>
        </div>
        <button
          onClick={clearConversation}
          className="text-gray-400 hover:text-white text-sm"
          title="Clear conversation"
        >
          Clear
        </button>
      </header>

      {/* Camera View - Top Right Corner Overlay */}
      <div className="fixed top-4 right-4 z-50">
        <div className="flex flex-col items-end space-y-2">
          {/* Emotion Display */}
          {isCameraActive && (
            <div className="flex items-center space-x-2">
              {emotion ? (
                <div className="flex items-center space-x-2 bg-blue-600 px-3 py-1.5 rounded-lg shadow-lg">
                  <span className="text-sm font-bold capitalize text-white">{emotion}</span>
                  <span className="text-xs text-blue-100">
                    {Math.round(emotionConfidence * 100)}%
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1.5 rounded-lg">
                  <span className="text-xs text-gray-400">No face</span>
                </div>
              )}
            </div>
          )}
          {/* Video - Always render so ref is available */}
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`rounded-lg border-2 border-gray-600 shadow-lg ${
                isCameraActive ? 'w-48 h-36 object-cover' : 'hidden'
              }`}
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-20">
            <div className="text-6xl mb-4">🎤</div>
            <h2 className="text-2xl font-bold mb-2">AI Voice Chat</h2>
            <p className="text-gray-400 mb-6">Always listening - just start talking!</p>
            <p className="text-sm text-gray-500">Your voice will be transcribed and sent to OpenAI</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
            </div>
          </div>
        ))}

        {/* Show interim transcription while listening */}
        {currentInterimText && isListening && !isProcessing && (
          <div className="flex justify-end">
            <div className="bg-gray-800 border-2 border-blue-500 rounded-2xl px-4 py-2 max-w-[75%]">
              <p className="text-sm text-gray-300 italic">{currentInterimText}</p>
              <p className="text-xs text-gray-500 mt-1">Listening...</p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-2xl px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg px-4 py-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Always listening toggle */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-400">Always Listening</span>
            <button
              onClick={() => setIsAlwaysListening(!isAlwaysListening)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isAlwaysListening ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAlwaysListening ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Status indicators */}
          <div className="flex items-center space-x-4 text-sm">
            {isListening && (
              <div className="flex items-center space-x-2 text-red-400">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span>Listening...</span>
              </div>
            )}
            {isProcessing && (
              <div className="flex items-center space-x-2 text-yellow-400">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <span>Processing...</span>
              </div>
            )}
            {isSpeaking && (
              <div className="flex items-center space-x-2 text-green-400">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span>Speaking...</span>
              </div>
            )}
          </div>

          {/* Main microphone button - only show if not always listening */}
          {!isAlwaysListening && (
            <div className="flex items-center space-x-4">
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 transition-colors"
                  title="Stop speaking"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                </button>
              )}

              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing || isSpeaking}
                className={`rounded-full p-6 transition-all ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : isProcessing || isSpeaking
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
                title={isListening ? 'Stop listening' : 'Start listening'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            </div>
          )}

          {/* Stop speaking button when always listening */}
          {isAlwaysListening && isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 transition-colors"
              title="Stop speaking"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          )}

          <p className="text-xs text-gray-500 text-center">
            {isAlwaysListening
              ? (isListening 
                  ? 'Always listening - speak now...' 
                  : isProcessing 
                  ? 'Getting response...' 
                  : isSpeaking 
                  ? 'Playing response...' 
                  : 'Ready to listen...')
              : (isListening 
                  ? 'Speak now...' 
                  : isProcessing 
                  ? 'Getting response...' 
                  : isSpeaking 
                  ? 'Playing response...' 
                  : 'Click microphone to talk')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceChatPage;

