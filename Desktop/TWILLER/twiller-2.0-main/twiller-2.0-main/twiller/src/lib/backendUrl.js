const DEFAULT_BACKEND_URL = "http://localhost:5000";

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

export const getBackendBaseUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  return trimTrailingSlash(configuredUrl || DEFAULT_BACKEND_URL);
};

export const buildBackendUrl = (path = "") => {
  if (!path) return getBackendBaseUrl();
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBackendBaseUrl()}${normalizedPath}`;
};

const PEXELS_IMAGE_MAP = {
  "33129": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800", // popcorn
  "1622402": "https://images.unsplash.com/photo-1477584308802-e9c378852d9a?w=800", // fort
  "1181671": "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800", // tech
  "46798": "https://images.unsplash.com/photo-1531415080290-bc98545ab2ef?w=800", // sports
  "256262": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800", // space
  "1550337": "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800", // politics
  "1763075": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800", // concert
  "3165335": "https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?w=800", // gaming
  "164938": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800", // dj
  "1036371": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800", // art
  "3278215": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800", // travel
  "1640777": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800", // food
  "3822622": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800", // yoga
  "590022": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800", // stock market
  "3183197": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800", // startup
  "996329": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800", // fashion
  "267885": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800", // books
  "225157": "https://images.unsplash.com/photo-1602491453979-04da61459118?w=800", // tiger
  "3757942": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800", // herbal tea
  "3747468": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800"  // books
};

/** Resolve avatar, cover, tweet media, and upload paths against the API base URL. */
export const mediaUrl = (path) => {
  if (!path) return "";
  
  if (typeof path === "string" && path.includes("images.pexels.com")) {
    const idMatch = path.match(/\/photos\/(\d+)\//);
    const pexelsId = idMatch ? idMatch[1] : "";
    if (pexelsId && PEXELS_IMAGE_MAP[pexelsId]) {
      return PEXELS_IMAGE_MAP[pexelsId];
    }
    // Fallback Picsum seed for unmatched Pexels photos
    return `https://picsum.photos/seed/pexels_${pexelsId || "fallback"}/800/600`;
  }

  if (typeof path === "string" && /^https?:\/\//i.test(path)) {
    return path;
  }

  const uploadMatch = path.match(/\/?uploads\/(.+)$/i);
  if (uploadMatch) {
    return buildBackendUrl(`/uploads/${uploadMatch[1]}`);
  }
  return buildBackendUrl(path);
};

/** Encode email for use in URL path segments (e.g. /userupdate/:email). */
export const encodeEmailPath = (email) => encodeURIComponent(email);
