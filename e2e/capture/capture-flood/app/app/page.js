'use client';

import { useState } from 'react';

export default function Home() {
  const [count, setCounter] = useState(0)

  function functionThatThrows() {
    throw new Error('Oops! Something went wrong')
  }

  function triggerCaptureFlood() {
    for (let i = 0; i < 10000; i++) {
      try {
        functionThatThrows()
      } catch (e) {}
    }
  }

  return (
    <main>
      <button onClick={triggerCaptureFlood}>Trigger flood</button>
      <button onClick={() => setCounter(count + 1)}>Increment</button>
      <p>{count}</p>
    </main>
  );
}
