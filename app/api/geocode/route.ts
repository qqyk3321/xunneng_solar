// Retired endpoint: never loads Google SDKs or calls external services.
export function POST() {
  return new Response("Not found", { status: 404 });
}
export const GET = POST;
