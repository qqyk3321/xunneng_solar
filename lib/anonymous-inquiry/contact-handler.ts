import { createInquiryHandler } from "./handler";

export function contactSubmitError(status: number) {
  switch (status) {
    case 400:
      return "Please check your email, message (5–5,000 characters), and photos, then try again.";
    case 403:
      return "Please send your message from this website's contact form.";
    case 404:
      return "This contact form is unavailable. Please refresh the page and try again.";
    case 409:
      return "This request has changed. Please edit your message before sending it again.";
    case 413:
      return "Your message or photos are too large. Please shorten the message or remove a photo.";
    case 415:
      return "Please use JPG, PNG or WebP photos and try again.";
    case 429:
      return "Please wait a little before sending another message. Your draft is still here.";
    default:
      return "We couldn't confirm your submission. Your draft is still here; retrying the same message won't create a duplicate.";
  }
}

/** Keep the existing validation/storage pipeline, with an English-only contact endpoint. */
export function createContactHandler(
  deps: Parameters<typeof createInquiryHandler>[0],
) {
  const handle = createInquiryHandler({ ...deps, allowFormat: true });
  return async (request: Request) => {
    const response = await handle(request);
    if (response.ok) return response;
    return Response.json(
      { error: contactSubmitError(response.status) },
      { status: response.status, headers: response.headers },
    );
  };
}
