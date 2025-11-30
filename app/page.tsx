'use client';

import { useState } from 'react';
import NumberDrawer from '@/components/NumberDrawer';
import CardGenerator from '@/components/CardGenerator';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'game' | 'generator'>('game');

  return (
    <main className={`min-h-screen py-8 px-5 ${
      activeTab === 'game'
        ? 'zahlenlotto-bg'
        : 'bg-gradient-to-br from-gray-50 to-gray-100'
    }`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className={`text-4xl md:text-5xl font-bold mb-1 ${
            activeTab === 'game' ? 'text-white drop-shadow-[2px_2px_4px_rgba(0,0,0,0.3)]' : 'text-gray-800'
          }`}>
            🎱 Zahlenlotto
          </h1>
          <p className={`text-lg ${
            activeTab === 'game' ? 'text-white/80' : 'text-gray-600'
          }`}>
            {activeTab === 'game'
              ? 'Ziehungsmaschine für Zahlen 1-90'
              : 'Erstelle und drucke Lotto-Karten'
            }
          </p>
        </header>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-1 inline-flex">
            <button
              onClick={() => setActiveTab('game')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'game'
                  ? 'bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              🎲 Spiel
            </button>
            <button
              onClick={() => setActiveTab('generator')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'generator'
                  ? 'bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              🎫 Karten-Generator
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="transition-all duration-300">
          {activeTab === 'game' ? <NumberDrawer /> : <CardGenerator />}
        </div>

        {/* Footer */}
        <footer className={`text-center mt-12 text-sm ${
          activeTab === 'game' ? 'text-white/60' : 'text-gray-500'
        }`}>
          <p>Zahlenlotto - Erstellt mit Next.js</p>
        </footer>
      </div>
    </main>
  );
}
