import { z } from "zod";

/**
 * Schemas Zod para validar as respostas da API upstream
 * (PROJECT.md §5, §19). O JSON remoto nunca deve ser assumido como
 * estável — tudo aqui é validado antes de virar dado de domínio.
 */

/**
 * PROJECT.md §57: toda URL vinda da API só pode ser https. Nunca
 * aceitar javascript:/data:/file: — aplicado a QUALQUER campo de URL
 * do upstream (embed_url, logo_url, imagens de EPG), não só embeds.
 */
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
