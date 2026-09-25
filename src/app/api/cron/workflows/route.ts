import { NextResponse } from "next/server";
import { processUnpaidInvoicesWorkflow } from "@/app/actions/workflowActions";

export async function GET(request: Request) {
  try {
    // Cron authorization check
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
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
