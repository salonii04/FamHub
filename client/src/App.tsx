import { useEffect, useState } from 'react';

export default function App() {
  const [health, setHealth] = useState('checking...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data.status))
      .catch(() => setHealth('server down'));
  }, []);

  return (
    <h1 className="p-8 text-2xl font-semibold">FamHub — API: {health}</h1>
  );
}