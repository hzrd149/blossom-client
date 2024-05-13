import { getHashFromURL } from "./helpers.js";

/**
 * attaches an "error" event listener to a HTMLImageElement element to handle server fallbacks
 * @param image The image element
 * @param getServers A async method to get an ordered list of servers for a pubkey
 * @param pubkey An optional pubkey to set the `data-pubkey` attr on the image
 */
export function handleImageFallbacks(
  image: HTMLImageElement,
  getServers: (pubkey?: string) => Promise<(string | URL)[] | undefined> | undefined,
  pubkey?: string,
) {
  const original = new URL(image.src);
  const hash = getHashFromURL(original);

  if (!hash) return;

  if (pubkey) image.dataset.pubkey = pubkey;

  let tried: string[] = [original.hostname];
  let servers: URL[] | undefined = undefined;
  const onError = async () => {
    const url = new URL(image.src);
    const ext = url.pathname.match(/\.\w+$/i);

    if (!servers) servers = (await getServers(image.dataset.pubkey))?.map((s) => (s instanceof URL ? s : new URL(s)));
    if (servers) {
      const server = servers.find((s) => !tried.includes(s.hostname));

      if (server) {
        url.hostname = server.hostname;
        url.pathname = "/" + hash + ext;
        url.protocol = server.protocol;

        image.src = url.toString();
        tried.push(url.hostname);
      } else {
        // ran out of servers, stop listening for errors
        image.removeEventListener("error", onError);
      }
    }
  };

  image.addEventListener("error", onError);
}
