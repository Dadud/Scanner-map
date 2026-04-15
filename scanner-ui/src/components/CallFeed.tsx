import { useStore } from '../store';

export function CallFeed() {
  const { calls, setSelectedCall, selectedCall } = useStore();

  const recentCalls = calls.slice(0, 50);

  return (
    <div className="flex flex-col h-full bg-scanner-dark border-l border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold">Recent Calls</h2>
        <p className="text-sm text-gray-400">{calls.length} calls loaded</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {recentCalls.map(call => (
          <div
            key={call.id}
            className={`p-3 border-b border-gray-800 cursor-pointer hover:bg-scanner-light ${
              selectedCall?.id === call.id ? 'bg-scanner-light border-l-4 border-l-blue-500' : ''
            }`}
            onClick={() => setSelectedCall(call)}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {call.talkgroup?.alphaTag || call.talkgroupId}
              </span>
              <span className={`text-xs px-2 py-1 rounded ${
                call.category === 'fire' ? 'bg-red-600' :
                call.category === 'police' ? 'bg-blue-600' :
                call.category === 'ems' ? 'bg-green-600' :
                'bg-gray-600'
              }`}>
                {call.category || 'unknown'}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {new Date(call.timestamp).toLocaleTimeString()}
            </p>
            {call.transcription && (
              <p className="text-sm mt-2 line-clamp-3">
                {call.transcription}
              </p>
            )}
            {call.address && (
              <p className="text-xs text-blue-400 mt-1">{call.address}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}