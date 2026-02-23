import Link from "next/link";
import SiteHeader from "@/components/site-header";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { NurseProfile } from "@/lib/supabase/types";

type DirectoryNurse = Pick<
  NurseProfile,
  | "id"
  | "full_name"
  | "role"
  | "profile_photo_url"
  | "location"
  | "bio"
  | "hourly_rate"
  | "verified"
  | "contact_email"
  | "created_at"
>;

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 0,
});

function NurseCard({ nurse }: { nurse: DirectoryNurse }) {
  const firstName = nurse.full_name.split(" ")[0] ?? nurse.full_name;
  const initials = nurse.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const contactHref = nurse.contact_email
    ? `mailto:${nurse.contact_email}?subject=${encodeURIComponent(
        "Geriatric care request"
      )}`
    : "/for-nurses";

  return (
    <article className="surface-panel group flex h-full flex-col p-5 transition-transform duration-200 hover:-translate-y-1">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 overflow-hidden rounded-full border border-[#d8e3eb] bg-[#eaf2f8]">
            {nurse.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={nurse.profile_photo_url}
                alt={`${nurse.full_name} profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#2c4f70]">
                {initials || "RN"}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-[1.15rem] font-bold text-[#10233b]">
              {nurse.full_name}
            </h2>
            <p className="text-sm font-semibold text-[#1f6b93]">{nurse.role}</p>
          </div>
        </div>

        {nurse.verified && (
          <span className="rounded-full border border-[#9ad1b4] bg-[#ecfbf2] px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[#146943]">
            Verified
          </span>
        )}
      </div>

      <p className="mt-4 flex-grow text-sm leading-6 text-[#59697e]">{nurse.bio}</p>

      <div className="mt-4 flex items-end justify-between border-t border-[#e1e9ef] pt-4">
        <div className="text-sm font-semibold text-[#5d6c7e]">{nurse.location}</div>
        <div className="text-lg font-extrabold tracking-tight text-[#10233b]">
          {usdFormatter.format(nurse.hourly_rate)}
          <span className="text-sm font-semibold text-[#4f627a]">/hr</span>
        </div>
      </div>

      <a
        href={contactHref}
        className="primary-btn mt-4 w-full text-sm group-hover:shadow-[0_12px_24px_rgba(15,118,110,0.28)]"
      >
        Contact {firstName}
      </a>
    </article>
  );
}

export default async function DirectoryPage() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return (
      <div className="site-shell">
        <SiteHeader />
        <div className="surface-panel max-w-2xl p-6 text-[#874308] page-enter">
          <h1 className="text-2xl font-bold">Directory is not configured yet</h1>
          <p className="mt-3 text-sm leading-6">
            Add `NEXT_PUBLIC_SUPABASE_URL` and
            `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your environment, then reload the
            page.
          </p>
        </div>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("nurse_profiles")
    .select(
      "id, full_name, role, profile_photo_url, location, bio, hourly_rate, verified, contact_email, created_at"
    )
    .eq("verified", true)
    .order("created_at", { ascending: false })
    .returns<DirectoryNurse[]>();

  return (
    <div className="site-shell">
      <SiteHeader />

      <section className="surface-panel page-enter p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Public Directory</p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b] md:text-4xl">
              Verified Registered Nurses
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#55667b]">
              Families can reach out directly to nurses who have passed license
              review and profile verification.
            </p>
          </div>
          <div className="rounded-xl border border-[#d8e3eb] bg-white/90 px-4 py-3 text-sm text-[#42556f]">
            {error ? "Unavailable" : `${data?.length ?? 0} profiles live`}
          </div>
        </div>
      </section>

      {error && (
        <div className="surface-panel mt-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load profiles from Supabase: {error.message}
        </div>
      )}

      {!error && (!data || data.length === 0) && (
        <div className="surface-panel mt-6 p-6 text-[#4e6077]">
          <p className="text-sm">No verified nurse profiles are published yet.</p>
          <Link href="/for-nurses" className="secondary-btn mt-4 w-fit">
            Create a nurse account
          </Link>
        </div>
      )}

      {!error && data && data.length > 0 && (
        <section className="stagger mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.map((nurse) => (
            <NurseCard key={nurse.id} nurse={nurse} />
          ))}
        </section>
      )}
    </div>
  );
}
