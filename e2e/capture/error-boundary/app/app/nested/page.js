'use client';

export default function NestedPage() {
  function functionThatThrows() {
    throw new Error('Nested Page Error')
  }

  return (
    <main>
			<h1>Nested page</h1>
      <button onClick={functionThatThrows}>Trigger error boundary</button>
    </main>
  );
}
