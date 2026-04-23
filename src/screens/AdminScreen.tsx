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
        <h1 className="text-3xl font-black italic text-accent">Control Panel</h1>
        <p className="text-muted text-[10px] uppercase tracking-widest font-bold">Universal Data & Hydration Engine</p>
      </div>

      <div className="glass rounded-[2rem] p-8 space-y-8 border border-border/50">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/20 rounded-2xl text-red-500 shadow-lg shadow-red-500/10">
              <Globe size={24} />
            </div>
            <div>
              <h2 className="font-bold italic">Global Expansion</h2>
              <p className="text-[10px] text-muted uppercase tracking-wider font-bold">Inflate Google Maps Registry</p>
            </div>
          </div>

          <button
            onClick={handleInflate}
            disabled={inflating || loading}
            className="w-full bg-accent text-black font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-2 hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50 shadow-xl shadow-accent/20"
          >
            {inflating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Expanding...
              </>
            ) : (
              'RUN EXPANSION'
            )}
          </button>
        </div>

        <div className="h-px bg-border/30" />

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/20 rounded-2xl text-accent shadow-lg shadow-accent/10">
              <Database size={24} />
            </div>
            <div>
              <h2 className="font-bold italic">Palate Seeder</h2>
              <p className="text-[10px] text-muted uppercase tracking-wider font-bold">Populate 150 Social Logs</p>
            </div>
          </div>

          <button
            onClick={handleSeed}
            disabled={loading || inflating}
            className="w-full bg-white/5 border border-white/10 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-2 hover:bg-white/10 transition-all disabled:opacity-50 shadow-2xl"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Seeding...
              </>
            ) : (
              'REGENERATE UNIVERSE'
            )}
          </button>
        </div>

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
