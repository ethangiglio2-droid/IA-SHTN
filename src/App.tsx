/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import LiveAssistant from './components/LiveAssistant';

export default function App() {
  return (
    <div className="min-h-screen w-full bg-[#050505] p-0 flex items-center justify-center font-sans texture-dots overflow-hidden relative">
      {/* Gritty floating elements */}
      <div className="absolute top-[15%] left-[-5%] w-96 h-96 bg-red-900/10 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[5%] right-[-10%] w-[500px] h-[500px] bg-red-800/5 rounded-full blur-[120px] animate-pulse"></div>
      
      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline opacity-30 z-0"></div>

      <div className="w-full h-full border-[1px] border-red-900/30 bg-black/40 backdrop-blur-md z-10 transition-all overflow-hidden flex flex-col items-center justify-center">
        <LiveAssistant />
      </div>
    </div>
  );
}
