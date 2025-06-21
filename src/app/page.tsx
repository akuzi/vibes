import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-5xl font-bold mb-8">Vibe Coding Experiments</h1>
      <div className="grid grid-cols-1 gap-4">
        <Link href="/experiments/cells" className="p-6 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <h2 className="text-2xl font-semibold">Cells</h2>
          <p>A blank canvas for cellular automata.</p>
        </Link>
      </div>
    </main>
  );
}
