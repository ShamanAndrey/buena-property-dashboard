import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  extractDeclarationFromPdf,
  extractTextFromPdf,
  flattenDeclaration,
} from "@/lib/ai/extract-property-data";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const aiRouter = createTRPCRouter({
  // Extract property data from uploaded PDF - returns both rich and flattened data
  extractFromPdf: publicProcedure
    .input(
      z.object({
        fileUrl: z.string().min(1, "File URL is required"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Fetch the PDF file
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const fullUrl = `${baseUrl}${input.fileUrl}`;
        console.log("[AI] Fetching PDF from:", fullUrl);

        const response = await fetch(fullUrl);

        if (!response.ok) {
          console.error("[AI] PDF fetch failed:", response.status);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "PDF file not found",
          });
        }

        const pdfBuffer = await response.arrayBuffer();
        console.log("[AI] PDF buffer size:", pdfBuffer.byteLength);

        // Extract text from PDF
        const pdfText = await extractTextFromPdf(pdfBuffer);
        console.log("[AI] Extracted text length:", pdfText.length);
        console.log("[AI] Extracted text preview:", pdfText.substring(0, 500));

        if (!pdfText || pdfText.length < 100) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Could not extract text from PDF. Please ensure it's a text-based PDF.",
          });
        }

        // Extract filename from URL
        const fileName = input.fileUrl.split("/").pop() || "unknown.pdf";

        // Use AI to extract structured data (rich format)
        console.log("[AI] Calling AI extraction...");
        const declaration = await extractDeclarationFromPdf(pdfText, fileName);
        console.log("[AI] Extraction complete, document ID:", declaration.id);

        // Also create flattened version for form compatibility
        const flattened = flattenDeclaration(declaration);
        console.log("[AI] Flattened data:", JSON.stringify(flattened, null, 2));

        return {
          // Full rich document for storage
          declaration,
          // Flattened for form use
          flattened,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("[AI] Extraction error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to extract data from PDF",
        });
      }
    }),

  // Extract property data from raw text (for testing)
  extractFromText: publicProcedure
    .input(
      z.object({
        text: z.string().min(1, "Text is required"),
        fileName: z.string().default("manual-input.txt"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log(
          "[AI] Extracting from raw text, length:",
          input.text.length
        );

        const declaration = await extractDeclarationFromPdf(
          input.text,
          input.fileName
        );
        const flattened = flattenDeclaration(declaration);

        console.log("[AI] Extraction complete, document ID:", declaration.id);

        return {
          declaration,
          flattened,
        };
      } catch (error) {
        console.error("[AI] Extraction error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to extract data from text",
        });
      }
    }),
});
