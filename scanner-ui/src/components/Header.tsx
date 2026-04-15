import { useStore } from '../store';

export function Header() {
  const { selectedCall } = useStore();

  return (
    <header className="bg-scanner-light border-b border-gray-700 px-4 py-3 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold">Scanner Map</h1>
        <span className="text-xs text-gray-400">Real-time Emergency Monitor</span>
      </div>
      {selectedCall && (
        <div className="text-sm text-gray-300">
          {selectedCall.talkgroup?.alphaTag || selectedCall.talkgroupId}
        </div>
      )}
    </header>
  );
}