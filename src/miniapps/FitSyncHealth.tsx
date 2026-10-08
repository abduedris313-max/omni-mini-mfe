import React, { useState } from 'react';
import { MiniAppBridgeSDK } from '../types/miniapp';
import {
  Activity,
  Flame,
  Droplet,
  Footprints,
  Plus,
  Trophy,
} from 'lucide-react';

interface FitSyncProps {
  sdk: MiniAppBridgeSDK;
}

export const FitSyncApp: React.FC<FitSyncProps> = ({ sdk }) => {
  const settings = sdk.settings.getSettings();
  const stepGoal = Number(settings.dailyStepGoal || 10000);
  const waterTarget = Number(settings.dailyWaterTarget || 2500);

  const [steps, setSteps] = useState(7420);
  const [waterMl, setWaterMl] = useState(1750);
  const [activeCalories, setActiveCalories] = useState(480);

  const stepPercentage = Math.min(100, Math.round((steps / stepGoal) * 100));
  const waterPercentage = Math.min(100, Math.round((waterMl / waterTarget) * 100));

  const addSteps = (count: number) => {
    sdk.ui.hapticFeedback('light');
    setSteps((prev) => {
      const next = prev + count;
      if (next >= stepGoal && prev < stepGoal) {
        sdk.ui.showToast('🎉 Goal Achieved! 10,000 Step Ring closed!', 'success');
        sdk.ui.hapticFeedback('success');
      }
      return next;
    });
    setActiveCalories((prev) => prev + Math.round(count * 0.04));
  };

  const addWater = (ml: number) => {
    sdk.ui.hapticFeedback('light');
    setWaterMl((prev) => {
      const next = prev + ml;
      if (next >= waterTarget && prev < waterTarget) {
        sdk.ui.showToast('💧 Daily Hydration Target Reached!', 'success');
        sdk.ui.hapticFeedback('success');
      }
      return next;
    });
  };

  return (
    <div className="p-4 space-y-4 text-slate-100 pb-20">
      {/* iOS Activity Rings Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex items-center justify-between shadow-xl">
        <div className="space-y-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Today's Progress</div>
            <div className="text-2xl font-black text-white mt-0.5">
              {steps.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ {stepGoal.toLocaleString()} steps</span>
            </div>
          </div>

          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-rose-400">
              <Flame className="w-4 h-4" />
              <span>{activeCalories} kcal</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-400">
              <Droplet className="w-4 h-4" />
              <span>{waterMl} ml</span>
            </div>
          </div>
        </div>

        {/* Circular Progress Ring Visual */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-800"
              strokeWidth="3.8"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-pink-500 transition-all duration-700 ease-out"
              strokeDasharray={`${stepPercentage}, 100`}
              strokeWidth="3.8"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-sm font-extrabold text-white">{stepPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Interactive Activity Simulators */}
      <div className="space-y-3">
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 backdrop-blur-md">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
                <Footprints className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Daily Steps Pedometer</h4>
                <p className="text-[11px] text-slate-400">Goal: {stepGoal.toLocaleString()} steps</p>
              </div>
            </div>
            <span className="text-xs font-mono text-pink-400 font-bold">{stepPercentage}%</span>
          </div>

          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-pink-500 rounded-full transition-all duration-300" style={{ width: `${stepPercentage}%` }} />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => addSteps(500)}
              className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-pink-300 border border-slate-700 transition flex items-center justify-center gap-1.5 ios-active"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+500 Steps</span>
            </button>
            <button
              onClick={() => addSteps(2000)}
              className="flex-1 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-pink-600/30 ios-active"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>+2,000 Run</span>
            </button>
          </div>
        </div>

        {/* Water Log */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 backdrop-blur-md">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <Droplet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Water Intake Tracker</h4>
                <p className="text-[11px] text-slate-400">Target: {waterTarget} ml</p>
              </div>
            </div>
            <span className="text-xs font-mono text-blue-400 font-bold">{waterPercentage}%</span>
          </div>

          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${waterPercentage}%` }} />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => addWater(250)}
              className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-blue-300 border border-slate-700 transition flex items-center justify-center gap-1.5 ios-active"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+250ml Glass</span>
            </button>
            <button
              onClick={() => addWater(500)}
              className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 ios-active"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+500ml Bottle</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
