import { useStore } from '../store';

export function CallFeed() {
  const { calls, setSelectedCall, selectedCall } = useStore();

  return (
    <div className="flex flex-col h-full bg-scanner-dark border-l border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold">Recent Calls</h2>
        <p className="text-sm text-gray-400">{calls.length} calls</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {calls.slice(0, 50).map(call => (
          <div
            key={call.id}
            className={`p-3 border-b border-gray-800 cursor-pointer hover:bg-scanner-light ${
              selectedCall?.id === call.id ? 'bg-scanner-light border-l-4 border-l-blue-500' : ''
            }`}
            onClick={() => setSelectedCall(call)}
          >
            <div className="flex justify-between">
              <span className="font-medium">{call.talkgroup?.alphaTag || call.talkgroupId}</span>
              <span className={`text-xs px-2 py-1 rounded ${
                call.category === 'fire' ? 'bg-red-600' : call.category === 'police' ? 'bg-blue-600' : 'bg-gray-600'
              }`}>{call.category || 'unknown'}</span>
            </div>
            <p className="text-sm text-gray-400">{new Date(call.timestamp).toLocaleTimeString()}</p>
            {call.transcription && <p className="text-sm mt-2 line-clamp-3">{call.transcription}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}