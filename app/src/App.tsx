import { Tabs } from './components/Tabs';
import { useContent } from './lib/content';
import { useRoute } from './lib/router';
import { Discover } from './screens/Discover';
import { MapScreen } from './screens/MapScreen';
import { Place } from './screens/Place';
import { Saved } from './screens/Saved';

export function App() {
  const route = useRoute();
  const content = useContent();

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/">
          츠기<small>다음 일본 여행에 넣을 한 곳</small>
        </a>
      </header>
      <main>
        {route.name === 'discover' && <Discover content={content} query={route.query} />}
        {route.name === 'place' && <Place content={content} id={route.id} />}
        {route.name === 'map' && <MapScreen content={content} />}
        {route.name === 'saved' && <Saved content={content} />}
      </main>
      <Tabs route={route} />
    </div>
  );
}
