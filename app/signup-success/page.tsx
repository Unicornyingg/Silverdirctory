import Link from "next/link";
import SiteHeader from "@/components/site-header";
const DIRECTORY_PATH = "/directory";

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function SignupSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const isCaregiver = getParam(params, "role").trim().toLowerCase() === "caregiver";

  return (
    <div className="site-shell">
      <SiteHeader />

      <section className="surface-panel page-enter mx-auto max-w-2xl p-6 md:p-8">
        <p className="eyebrow">Welcome</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b]">
          Thanks for signing up with us
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#56677d]">
          {isCaregiver
            ? "Your caregiver account has been created successfully. Your profile can now be listed in the directory."
            : "Your family account has been created successfully. We are bringing you to the caregiver directory now."}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={DIRECTORY_PATH} className="primary-btn text-sm">
            Continue to directory
          </Link>
          <Link href={isCaregiver ? "/login?role=caregiver" : "/login?role=client"} className="secondary-btn text-sm">
            {isCaregiver ? "Go to caregiver login" : "Go to family login"}
          </Link>
        </div>
      </section>
    </div>
  );
}
