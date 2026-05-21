import Link from 'next/link';

export default function Cancel() {
  return (
    <main style={{ maxWidth: 600, margin: '80px auto', padding: 24, fontFamily: 'system-ui' }}>
      <h1>Payment cancelled</h1>
      <p>No charge was made. If you change your mind, the offer stands.</p>
      <p><Link href="/">Return home</Link></p>
    </main>
  );
}
