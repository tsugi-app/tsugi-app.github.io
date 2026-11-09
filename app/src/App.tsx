import { useEffect } from 'react';
import { SnackbarRegion } from './components/Snackbar';
import { Tabs } from './components/Tabs';
import { useContent } from './lib/content';
import { useRoute } from './lib/router';
import { Discover } from './screens/Discover';
import { MapScreen } from './screens/MapScreen';
import { Place } from './screens/Place';
import { Saved } from './screens/Saved';
import { Settings } from './screens/Settings';

// 화면마다 자기 앱 바를 그린다. 상세는 탭 바 대신 하단 액션 바를 쓰고, 설정은 탭 바를 숨긴다 (docs/DESIGN.md §3).
export function App() {
  const route = useRoute();
  const content = useContent();
  const isPlace = route.name === 'place';
  // 상세·설정은 하위 화면이라 탭 바를 숨긴다.
  const isSub = isPlace || route.name === 'settings';
  const placeId = isPlace ? route.id : '';

  useEffect(() => {
    if (placeId) window.scrollTo(0, 0);
  }, [placeId]);

  return (
    <div className={`app${isPlace ? ' has-action-bar' : ''}`}>
      {route.name === 'discover' && <Discover content={content} query={route.query} />}
      {route.name === 'place' && <Place content={content} id={route.id} />}
      {route.name === 'map' && <MapScreen content={content} />}
      {route.name === 'saved' && <Saved content={content} query={route.query} />}
      {route.name === 'settings' && <Settings />}
      {!isSub && <Tabs route={route} />}
      <SnackbarRegion />
    </div>
  );
}
