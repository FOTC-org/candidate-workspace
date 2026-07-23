import { z } from "zod";

const MAX_RANGE_DAYS = 365;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const createReportSchema = z
  .object({
    dateFrom: z.string().min(1, "Start date is required"),
    dateTo: z.string().min(1, "End date is required"),
  })
  .superRefine((values, ctx) => {
    const dateFrom = new Date(values.dateFrom);
    const dateTo = new Date(values.dateTo);

    if (dateFrom.getTime() > dateTo.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date must not be after end date",
        path: ["dateTo"],
      });
      return;
    }

    if (dateTo.getTime() > Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must not be in the future",
        path: ["dateTo"],
      });
      return;
    }

    const diffDays = (dateTo.getTime() - dateFrom.getTime()) / MS_PER_DAY;
    if (diffDays > MAX_RANGE_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Date range must not exceed ${MAX_RANGE_DAYS} days`,
        path: ["dateTo"],
      });
    }
  });

export type CreateReportValues = z.infer<typeof createReportSchema>;
