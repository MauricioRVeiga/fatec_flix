import { z } from "zod";

const httpsUrlSchema = z
  .string()
  .url()
  .refine((url) => url.startsWith("https://"), {
    message: "URL must use https:",
  });

export const embedSchema = z.object({
  provider: z.string(),
  quality: z.string().optional().nullable(),
  embed_url: httpsUrlSchema,
});

export const epgProgramSchema = z.object({
  title: z.string(),
  description: z.string().optional().nullable(),
  formatted_time: z.string().optional().nullable(),
  start_time: z.number(),
  end_time: z.number(),
  image: httpsUrlSchema.optional().nullable(),
});

export const channelSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string().optional().nullable(),
  logo_url: httpsUrlSchema.optional().nullable(),
  category: z.string().optional().nullable(),

  embeds: z.array(embedSchema).default([]),

  epg: z
    .object({
      current: epgProgramSchema.optional().nullable(),
      next: epgProgramSchema.optional().nullable(),
    })
    .optional()
    .nullable(),
});

export const upstreamChannelsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(z.unknown()),
  total: z.number().optional(),
});

export const upstreamHealthResponseSchema = z.object({
  success: z.boolean(),
  status: z.string().optional(),
  checks: z.record(z.string(), z.boolean()).optional().nullable(),
});
