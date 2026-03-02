import { z } from "zod";

export const SlotSchema = z.enum(["morning", "afternoon", "weekend", "clinic"]);

export const EventSourceSchema = z.object({
  fileName: z.string(),
  sheetName: z.string(),
  cell: z.string(),
  parserVersion: z.string().optional(),
});

export const ParsedEventSchema = z.object({
  id: z.string(),
  code: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: SlotSchema,
  title: z.string(),
  location: z.string().nullable(),
  start: z.string(),
  end: z.string(),
  timezone: z.string().default("Asia/Taipei"),
  tags: z.array(z.string()),
  dedupeKey: z.string(),
  taskLabel: z.string().nullable(),
  source: EventSourceSchema,
  raw: z.string(),
  notes: z.string().nullable(),
});

export type ParsedEventInput = z.input<typeof ParsedEventSchema>;

export function validateEvent(event: unknown) {
  return ParsedEventSchema.safeParse(event);
}
