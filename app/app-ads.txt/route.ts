export async function GET() {
  return new Response(
    'google.com, pub-8348005705345032, DIRECT, f08c47fec0942fa0\n',
    {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    }
  )
}
