import { useEffect } from 'react';
import { Map } from './components/Map';
import { CallFeed } from './components/CallFeed';
import { AudioPlayer } from './components/AudioPlayer';
import { Header } from './components/Header';
import { useStore } from './store';
import { connectSocket, fetchCalls, fetchTalkgroups } from './hooks/useSocket';

export default function App() {
  const { selectedCall, setMapCenter } = useStore();

  useEffect(() => {
    const token = localStorage.getItem('token');
    connectSocket(token || undefined);

    fetchCalls();
    fetchTalkgroups();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          setMapCenter([39.8283, -98.5795]);
        }
      );
    }
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <Map />
        </div>

        <div className="w-96 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <CallFeed />
          </div>

          {selectedCall && <AudioPlayer />}
        </div>
      </div>
    </div>
  );
}