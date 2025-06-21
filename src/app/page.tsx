import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-green-400 font-mono p-8">
        <div className="w-full max-w-md">
            <div className="border border-green-700 rounded-lg p-4">
                <p className="text-yellow-400 mb-4">&gt; Select experiment</p>
                <div className="flex flex-col space-y-2">
                    <Link href="/experiments/cells" className="hover:bg-green-900 p-2 rounded">
                        <p>
                            <span className="text-blue-400">[01]</span>
                            <span className="text-white ml-4">Cells</span>
                        </p>
                    </Link>
                    <Link href="/experiments/polish-notation-calc" className="hover:bg-green-900 p-2 rounded">
                        <p>
                            <span className="text-blue-400">[02]</span>
                            <span className="text-white ml-4">PN/RPN Calc</span>
                        </p>
                    </Link>
                </div>
            </div>
        </div>
    </main>
  );
}
