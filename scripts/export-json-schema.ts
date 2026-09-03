import { z } from "zod";
import { propFirmSchema } from "../src/lib/schema";

/** 把 Zod Schema 打成 JSON Schema，供 Gemini Structured Outputs 使用。 */
process.stdout.write(JSON.stringify(z.toJSONSchema(propFirmSchema)));
