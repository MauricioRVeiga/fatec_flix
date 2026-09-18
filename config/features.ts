export const features = {
  externalEmbeds: process.env.NEXT_PUBLIC_ENABLE_EXTERNAL_EMBEDS === "true",
  vod: process.env.NEXT_PUBLIC_ENABLE_VOD === "true",
  oneElevenMovies: process.env.NEXT_PUBLIC_ENABLE_111MOVIES === "true",
} as const;
