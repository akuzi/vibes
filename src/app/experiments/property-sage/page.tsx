'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Analysis {
  summary: string;
  pros: string[];
  cons: string[];
  keyDetails: {
    price?: string;
    bedrooms?: string;
    bathrooms?: string;
    parking?: string;
    propertyType?: string;
  };
}

export default function PropertySagePage() {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [bookmarkletCode, setBookmarkletCode] = useState('');

  const analyzePropertyWithContent = useCallback(async (content: string) => {
    if (!content.trim()) {
      setError('Please paste the page HTML content');
      return;
    }

    if (!content.toLowerCase().includes('realestate.com.au')) {
      setError('The content doesn\'t appear to be from realestate.com.au');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch('/api/property-sage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ htmlContent: content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze property');
      }

      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check for bookmarklet data from URL hash on mount
  useEffect(() => {
    // Check URL hash for encoded HTML (from bookmarklet)
    const hash = window.location.hash.slice(1); // Remove the # character
    if (hash) {
      try {
        // Decode the HTML from base64 URL encoding
        const decoded = decodeURIComponent(atob(hash));
        setHtmlContent(decoded);
        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname);
        // Auto-analyze after a short delay
        setTimeout(() => {
          if (decoded.toLowerCase().includes('realestate.com.au')) {
            analyzePropertyWithContent(decoded);
          }
        }, 100);
      } catch (error) {
        console.error('Failed to decode bookmarklet data:', error);
      }
    }
  }, [analyzePropertyWithContent]);

  const analyzeProperty = async () => {
    await analyzePropertyWithContent(htmlContent);
  };

  // Generate bookmarklet code on client side only (after mount)
  useEffect(() => {
    const origin = window.location.origin;
    // Updated bookmarklet that opens in same window and uses sessionStorage on the target page
    const code = `javascript:(function(){const html=document.documentElement.outerHTML;if(!html.includes('realestate.com.au')){alert('Please use this bookmarklet on a realestate.com.au property page');return;}const encoded=btoa(encodeURIComponent(html));window.location.href='${origin}/experiments/property-sage#'+encoded;})();`;
    setBookmarkletCode(code);
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey && !loading) {
      analyzeProperty();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-purple-400 hover:text-purple-300 transition-colors mb-4 inline-block"
          >
            ← Back to experiments
          </Link>
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Property Sage
          </h1>
          <p className="text-gray-300 text-lg">
            AI-powered property analysis for realestate.com.au listings
          </p>
        </div>

        {/* Bookmarklet Section */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-emerald-500/30">
          <h2 className="text-2xl font-bold mb-3 text-emerald-300">⚡ One-Click Analysis Bookmarklet</h2>
          <p className="text-gray-300 mb-4">
            Install this bookmarklet for instant property analysis on any realestate.com.au listing:
          </p>

          <div className="space-y-4">
            {/* Step 1: Copy the code */}
            <div className="bg-black/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-emerald-300">Step 1: Copy this code</p>
                <button
                  onClick={() => {
                    if (bookmarkletCode) {
                      navigator.clipboard.writeText(bookmarkletCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 3000);
                    }
                  }}
                  disabled={!bookmarkletCode}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {copied ? '✓ Copied!' : '📋 Copy Code'}
                </button>
              </div>
              <div className="bg-black/50 rounded p-3 overflow-x-auto">
                <code className="text-xs text-gray-300 break-all">
                  {bookmarkletCode || 'Loading bookmarklet code...'}
                </code>
              </div>
            </div>

            {/* Step 2: Create bookmark */}
            <div className="bg-black/30 rounded-lg p-4">
              <p className="font-semibold text-emerald-300 mb-2">Step 2: Create the bookmark</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300 ml-2">
                <li>Right-click on your browser&apos;s bookmarks bar and select &quot;Add Page&quot; or &quot;Add Bookmark&quot;</li>
                <li>Name it: <span className="text-emerald-300 font-semibold">Analyze Property</span></li>
                <li>In the URL/Location field, paste the code you copied (Ctrl+V / Cmd+V)</li>
                <li>Save the bookmark</li>
              </ol>
            </div>

            {/* Step 3: Use it */}
            <div className="bg-black/30 rounded-lg p-4">
              <p className="font-semibold text-emerald-300 mb-2">Step 3: Use it!</p>
              <ul className="space-y-1 text-sm text-gray-300 ml-2">
                <li>✓ Visit any property on realestate.com.au</li>
                <li>✓ Click your new &quot;Analyze Property&quot; bookmark</li>
                <li>✓ Get instant AI-powered analysis!</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="html-input" className="block text-sm font-medium text-purple-300">
              Manual Input (Alternative Method)
            </label>
            <span className="text-xs text-gray-400">Or paste HTML manually</span>
          </div>
          <div className="space-y-3">
            <textarea
              id="html-input"
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Paste the HTML content of a realestate.com.au property page here...&#10;&#10;To get the HTML:&#10;1. Visit the property listing&#10;2. Right-click and select 'View Page Source' (or press Ctrl+U)&#10;3. Copy all the HTML (Ctrl+A, then Ctrl+C)&#10;4. Paste it here"
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 font-mono text-sm h-48 resize-y"
              disabled={loading}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-400">
                Tip: Press Ctrl+Enter to analyze
              </p>
              <button
                onClick={analyzeProperty}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white/5 backdrop-blur-lg rounded-xl p-8 border border-white/20 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-4"></div>
            <p className="text-gray-300">Fetching and analyzing property listing...</p>
          </div>
        )}

        {/* Results */}
        {analysis && !loading && (
          <div className="space-y-6">
            {/* Key Details */}
            {analysis.keyDetails && Object.keys(analysis.keyDetails).length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold mb-4 text-purple-300">Property Details</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {analysis.keyDetails.price && (
                    <div>
                      <div className="text-sm text-gray-400">Price</div>
                      <div className="text-lg font-semibold">{analysis.keyDetails.price}</div>
                    </div>
                  )}
                  {analysis.keyDetails.bedrooms && (
                    <div>
                      <div className="text-sm text-gray-400">Bedrooms</div>
                      <div className="text-lg font-semibold">{analysis.keyDetails.bedrooms}</div>
                    </div>
                  )}
                  {analysis.keyDetails.bathrooms && (
                    <div>
                      <div className="text-sm text-gray-400">Bathrooms</div>
                      <div className="text-lg font-semibold">{analysis.keyDetails.bathrooms}</div>
                    </div>
                  )}
                  {analysis.keyDetails.parking && (
                    <div>
                      <div className="text-sm text-gray-400">Parking</div>
                      <div className="text-lg font-semibold">{analysis.keyDetails.parking}</div>
                    </div>
                  )}
                  {analysis.keyDetails.propertyType && (
                    <div>
                      <div className="text-sm text-gray-400">Type</div>
                      <div className="text-lg font-semibold">{analysis.keyDetails.propertyType}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold mb-4 text-purple-300">Summary</h2>
              <p className="text-gray-200 leading-relaxed">{analysis.summary}</p>
            </div>

            {/* Pros */}
            <div className="bg-emerald-500/10 backdrop-blur-lg rounded-xl p-6 border border-emerald-500/30">
              <h2 className="text-2xl font-bold mb-4 text-emerald-300">Pros</h2>
              <ul className="space-y-2">
                {analysis.pros.map((pro, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-emerald-400 text-xl">✓</span>
                    <span className="text-gray-200">{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div className="bg-rose-500/10 backdrop-blur-lg rounded-xl p-6 border border-rose-500/30">
              <h2 className="text-2xl font-bold mb-4 text-rose-300">Cons</h2>
              <ul className="space-y-2">
                {analysis.cons.map((con, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-rose-400 text-xl">✗</span>
                    <span className="text-gray-200">{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!analysis && !loading && !error && (
          <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold mb-3 text-purple-300">Two Ways to Analyze:</h3>

            <div className="mb-4">
              <h4 className="font-semibold text-emerald-300 mb-2">✨ Recommended: One-Click Bookmarklet</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-300 ml-2 text-sm">
                <li>Click the &quot;Copy Code&quot; button in the green section above</li>
                <li>Create a new bookmark and paste the code as the URL</li>
                <li>Visit any property on realestate.com.au and click the bookmark</li>
                <li>Instant analysis!</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-purple-300 mb-2">📋 Alternative: Manual Paste</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-300 ml-2 text-sm">
                <li>Visit a property listing on realestate.com.au</li>
                <li>Right-click → &quot;View Page Source&quot; (or press Ctrl+U)</li>
                <li>Copy all HTML (Ctrl+A, then Ctrl+C)</li>
                <li>Paste into the text area above and click &quot;Analyze&quot;</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
