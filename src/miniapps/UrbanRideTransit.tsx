import React, { useState, useEffect } from 'react';
import { MiniAppBridgeSDK } from '../types/miniapp';
import {
  Car,
  Navigation,
  Clock,
  Shield,
  Star,
  MapPin,
  CheckCircle2,
  VolumeX,
  Zap,
} from 'lucide-react';

interface UrbanRideProps {
  sdk: MiniAppBridgeSDK;
}

export const UrbanRideApp: React.FC<UrbanRideProps> = ({ sdk }) => {
  const settings = sdk.settings.getSettings();
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>(settings.preferredVehicleClass || 'comfort_ev');
  const [rideState, setRideState] = useState<'idle' | 'searching' | 'matched' | 'completed'>('idle');
  const [etaMinutes] = useState(3);

  // Sync preference if settings change
  useEffect(() => {
    if (settings.preferredVehicleClass && rideState === 'idle') {
      setSelectedTier(settings.preferredVehicleClass);
    }
  }, [settings.preferredVehicleClass]);

  const tiers = [
    {
      id: 'standard',
      name: 'Urban Standard',
      eta: '2 mins',
      basePrice: 12.5,
      icon: Car,
      desc: 'Affordable, reliable everyday sedan',
    },
    {
      id: 'comfort_ev',
      name: 'Comfort EV',
      eta: '3 mins',
      basePrice: 16.0,
      icon: Zap,
      desc: 'Silent zero-emission premium cabin',
    },
    {
      id: 'xl',
      name: 'Urban XL',
      eta: '5 mins',
      basePrice: 24.0,
      icon: Car,
      desc: 'Room for 6 riders + luggage',
    },
  ];

  const currentTierObj = tiers.find((t) => t.id === selectedTier) || tiers[1];
  const tipPercent = Number(settings.defaultTipPercent ?? 15);
  const fareWithTip = Number((currentTierObj.basePrice * (1 + tipPercent / 100)).toFixed(2));

  const handleRequestRide = async () => {
    if (!pickup.trim() || !destination.trim()) {
      sdk.ui.showToast('Please enter both pickup and destination addresses', 'warning');
      return;
    }

    sdk.ui.hapticFeedback('medium');
    setRideState('searching');

    setTimeout(async () => {
      // Deduct from shared Super App wallet
      const payment = await sdk.payment.pay(fareWithTip, `UrbanRide: ${currentTierObj.name} to ${destination.trim()}`);
      if (payment.success) {
        setRideState('matched');
        sdk.ui.showToast(`Ride confirmed! Fare $${fareWithTip.toFixed(2)} paid via Super App Wallet`, 'success');
        sdk.ui.hapticFeedback('success');
      } else {
        setRideState('idle');
        sdk.ui.showToast('Unable to book ride: ' + (payment.error || 'Check wallet balance'), 'error');
      }
    }, 800);
  };

  return (
    <div className="p-4 space-y-4 text-slate-100 pb-20">
      {/* Interactive Transit Radar View */}
      <div className="relative h-48 w-full rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
        {/* Radar grid styling */}
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
        <div className="absolute w-36 h-36 rounded-full border border-emerald-500/30 animate-ping opacity-30" />
        <div className="absolute w-28 h-28 rounded-full border border-emerald-500/40" />

        {/* Center user location pin */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/50 border-2 border-white">
            <Navigation className="w-4 h-4 fill-current" />
          </div>
          <span className="mt-1 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] text-emerald-300 font-mono border border-emerald-500/30">
            Pickup GPS Active
          </span>
        </div>

        {/* Nearby simulated cars */}
        <div className="absolute top-8 left-12 p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-emerald-400 text-xs flex items-center gap-1 shadow">
          <Car className="w-3 h-3" />
          <span className="text-[10px]">2m</span>
        </div>
        <div className="absolute bottom-10 right-14 p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-emerald-400 text-xs flex items-center gap-1 shadow">
          <Zap className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px]">3m EV</span>
        </div>

        {settings.quietRideMode && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-[10px] text-slate-300 backdrop-blur-md">
            <VolumeX className="w-3 h-3 text-emerald-400" />
            <span>Quiet Mode On</span>
          </div>
        )}
      </div>

      {rideState === 'idle' && (
        <>
          {/* Pickup & Destination */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800/80 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
              <input
                type="text"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className="w-full text-xs text-slate-200 bg-transparent focus:outline-none"
                placeholder="Pickup address"
              />
            </div>
            <div className="h-px bg-slate-800 ml-5" />
            <div className="flex items-center gap-3">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full text-xs text-white font-medium bg-transparent focus:outline-none"
                placeholder="Where to?"
              />
            </div>
          </div>

          {/* Ride Options */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Available Fleet</div>
            {tiers.map((tier) => {
              const TierIcon = tier.icon;
              const isSelected = selectedTier === tier.id;
              const calculated = Number((tier.basePrice * (1 + tipPercent / 100)).toFixed(2));
              return (
                <div
                  key={tier.id}
                  onClick={() => {
                    setSelectedTier(tier.id);
                    sdk.ui.hapticFeedback('light');
                  }}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md shadow-emerald-900/20'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                      <TierIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{tier.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {tier.eta}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{tier.desc}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">${calculated.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400">incl. {tipPercent}% tip</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Booking Button */}
          <button
            onClick={handleRequestRide}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 ios-active"
          >
            <span>Request {currentTierObj.name} · ${fareWithTip.toFixed(2)}</span>
          </button>
        </>
      )}

      {rideState === 'searching' && (
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800/80 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-3 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Contacting nearby drivers...</h4>
            <p className="text-xs text-slate-400">Matching with top-rated {currentTierObj.name} EVs</p>
          </div>
        </div>
      )}

      {rideState === 'matched' && (
        <div className="rounded-3xl bg-slate-900/90 border border-emerald-500/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Dispatch Confirmed · ETA {etaMinutes} mins</span>
            </div>
            <span className="text-xs font-mono text-slate-400">{currentTierObj.name}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Pickup</span>
              <span className="font-semibold text-white truncate max-w-[200px]">{pickup}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Destination</span>
              <span className="font-semibold text-white truncate max-w-[200px]">{destination}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Fare Settled</span>
              <span className="font-mono font-bold text-emerald-400">${fareWithTip.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-xs text-slate-400 space-y-1">
            <div>Quiet mode preference: <span className="text-emerald-300 font-semibold">{settings.quietRideMode ? 'Enabled' : 'Disabled'}</span></div>
            <div>Emergency Contact: <span className="text-slate-300 font-mono">{settings.emergencyContactPhone || 'Not set'}</span></div>
          </div>

          <button
            onClick={() => {
              setRideState('idle');
              setDestination('');
              sdk.ui.showToast('Trip completed.', 'success');
              sdk.ui.hapticFeedback('success');
            }}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition border border-slate-700"
          >
            Complete Trip
          </button>
        </div>
      )}
    </div>
  );
};
