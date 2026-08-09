import { z } from "zod";

// A language pack is uploaded as a file (PLAN §8.3) — untrusted the moment
// it leaves the filesystem picker, so it is parsed here once rather than
// trusted by every reader.
export const languagePackSchema = z.object({
    Code: z.string().min(1),
    Name: z.string().min(1),
    Version: z.number().int().positive(),
    Strings: z.record(z.string()),
});
