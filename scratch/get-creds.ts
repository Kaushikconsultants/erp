import { prisma } from "../src/lib/prisma";

async function main() {
  const accounts = await prisma.whatsAppAccount.findMany();
  console.log("Accounts:", accounts);
}
main();
