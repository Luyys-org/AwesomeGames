import type { Metadata } from "next";
import Link from "next/link";

import { NewCampaignForm } from "@/rpg/features/campaign/new-campaign-form";
import { paths } from "@/rpg/paths";

export const metadata: Metadata = {
  title: "New campaign",
  description: "Set the universe, the party, and how the table plays.",
};

export default function NewCampaignPage() {
  return (
    <main className="page-shell mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">
      <Link
        href={paths.home}
        className="text-sm text-zinc-400 transition-colors duration-150 hover:text-zinc-50"
      >
        RPG
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-zinc-50">New campaign</h1>
      <p className="mt-2 text-base text-zinc-400">
        Set the universe, the party, and how the table plays. Every field is required.
      </p>
      <NewCampaignForm />
    </main>
  );
}
