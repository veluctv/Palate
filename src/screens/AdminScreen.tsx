import React, { useState } from 'react';
import { seedRealisticData, massInflateNeighborhoods } from '../services/seedService';
import { Loader2, Database, CheckCircle, AlertCircle, Globe } from 'lucide-react';

export const AdminScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [inflating, setInflating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSeed = async () => {
    setLoading(true);
    setStatus('idle');
    try {
      await seedRealisticData();
      setStatus('success');
      setMessage('Successfully seeded 150 realistic logs with real restaurant data.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInflate = async () => {
    setInflating(true);
    setStatus('idle');
    try {
      await massInflateNeighborhoods();
      setStatus('success');
      setMessage('Global Expansion Complete: Mapped restaurants across 7 key Singapore districts.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Expansion failed');
    } finally {
      setInflating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Release Controls</h1>
        <p className="text-muted">Universal Data & AI Hydration Engine</p>
      </div>

      <div className="glass rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/20 rounded-2xl text-red-500">
            <Globe size={24} />
          </div>
          <div>
            <h2 className="font-bold">Global Expansion</h2>
            <p className="text-xs text-muted">Probe and inflate Google Maps data for 7 core neighborhoods.</p>
          </div>
        </div>

        <button
          onClick={handleInflate}
          disabled={inflating || loading}
          className="w-full bg-accent text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-xl shadow-accent/20"
        >
          {inflating ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Expanding Culinary Map...
            </>
          ) : (
            'RUN GLOBAL EXPANSION'
          )}
        </button>

        <div className="flex items-center gap-4 pt-6 border-t border-white/5">
          <div className="p-3 bg-accent/20 rounded-2xl text-accent">
            <Database size={24} />
          </div>
          <div>
            <h2 className="font-bold">Community Seeder</h2>
            <p className="text-xs text-muted">Populate 150 community logs for social feed testing.</p>
          </div>
        </div>

        <button
          onClick={handleSeed}
          disabled={loading || inflating}
          className="w-full bg-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/20 transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Seeding Data...
            </>
          ) : (
            'Seed Community Logs'
          )}
        </button>

        {status === 'success' && (
          <div className="flex items-center gap-2 text-green-500 bg-green-500/10 p-4 rounded-xl text-sm">
            <CheckCircle size={18} />
            {message}
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-4 rounded-xl text-sm">
            <AlertCircle size={18} />
            {message}
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-[10px] text-muted uppercase tracking-widest">
          Note: This will clear existing logs before seeding.
        </p>
      </div>
    </div>
  );
};
