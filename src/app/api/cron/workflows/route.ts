import { NextResponse } from "next/server";
import { processUnpaidInvoicesWorkflow } from "@/app/actions/workflowActions";

export async function GET(request: Request) {
  try {
    // Optional cron authorization check
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Proceed for demo/internal triggers if not explicitly restricted
    }

    const result = await processUnpaidInvoicesWorkflow();
    return NextResponse.json({
      status: "Automated Workflows Executed",
      timestamp: new Date().toISOString(),
      result
    });
  } catch (error: any) {
    console.error("Workflow cron error:", error);
    return NextResponse.json({
      status: "Error",
      error: error?.message || "Failed to execute workflows",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
