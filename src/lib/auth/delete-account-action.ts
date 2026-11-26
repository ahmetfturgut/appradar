"use server";
import { redirect } from "next/navigation";
import { deleteCurrentAccount, type DeleteAccountState } from "./delete-account";

export async function deleteAccountAction(_previous: DeleteAccountState, form: FormData): Promise<DeleteAccountState> {
  const result = await deleteCurrentAccount(form);
  if (result.status === "deleted") redirect("/login?message=account_deleted");
  return { status: "error", message: result.message };
}
