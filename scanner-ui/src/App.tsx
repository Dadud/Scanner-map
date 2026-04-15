import { useSocket } from './hooks/useSocket';
import { Map } from './components/Map';
import { CallFeed } from './components/CallFeed';
import { Header } from './components/Header';

export default function App() {
  useSocket();

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
        </div>
      </div>
    </div>
  );
}
